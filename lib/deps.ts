import { isValidRepo } from "./validation";

export interface DepCandidate {
  name: string; // owner/repo on GitHub
  description: string;
  archived: boolean;
  fork: boolean;
  stars: number;
}

const MAX_OWN_REPOS = 30;
const MAX_PACKAGES = 80;

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "sift",
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

/** "git+https://github.com/o/r.git", "github:o/r", "o/r" -> "o/r" (null if not GitHub). */
export function githubSlug(repository: unknown): string | null {
  const raw = typeof repository === "string" ? repository : (repository as { url?: string } | null)?.url;
  if (!raw) return null;
  const m = raw.match(/(?:github\.com[/:]|^github:|^)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:[/#?].*)?$/);
  if (!m) return null;
  const slug = `${m[1]}/${m[2]}`;
  return isValidRepo(slug) ? slug : null;
}

async function inChunks<T, R>(list: T[], size: number, fn: (x: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < list.length; i += size) out.push(...(await Promise.allSettled(list.slice(i, i + size).map(fn))));
  return out;
}

export class DepsError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

/**
 * Finds the upstream GitHub repos behind the npm dependencies of a user's (non-fork) repos:
 * user's repos -> package.json -> npm registry `repository` field -> owner/repo.
 */
export async function findDependencyRepos(username: string): Promise<DepCandidate[]> {
  const headers = ghHeaders();
  const listRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&type=owner&sort=pushed`, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (listRes.status === 404) throw new DepsError(`GitHub user "${username}" not found.`, 404);
  if ((listRes.status === 403 || listRes.status === 429) && listRes.headers.get("x-ratelimit-remaining") === "0")
    throw new DepsError("GitHub API rate limit reached. Set GITHUB_TOKEN to raise the limit.", 429);
  if (!listRes.ok) throw new DepsError(`GitHub returned ${listRes.status}.`);
  const own = ((await listRes.json()) as { name: string; fork: boolean; archived: boolean }[])
    .filter((r) => !r.fork && !r.archived)
    .slice(0, MAX_OWN_REPOS);

  // package.json from each repo; repos without one (or private/missing) are skipped
  const manifests = await inChunks(own, 8, async (r) => {
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(r.name)}/contents/package.json`, {
      headers: { ...headers, Accept: "application/vnd.github.raw+json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const pkg = JSON.parse(await res.text()) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    return { repo: r.name, deps: Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((d) => !d.startsWith("@types/")) };
  });

  const usedBy = new Map<string, Set<string>>();
  for (const m of manifests) {
    if (m.status !== "fulfilled" || !m.value) continue;
    for (const dep of m.value.deps) {
      if (!usedBy.has(dep)) usedBy.set(dep, new Set());
      usedBy.get(dep)!.add(m.value.repo);
    }
  }

  // npm registry -> GitHub repo for each package (latest manifest only: small payload)
  const pkgs = [...usedBy.keys()].slice(0, MAX_PACKAGES);
  const resolved = await inChunks(pkgs, 10, async (pkg) => {
    const res = await fetch(`https://registry.npmjs.org/${pkg.replace("/", "%2F")}/latest`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const meta = (await res.json()) as { repository?: unknown; description?: string };
    const slug = githubSlug(meta.repository);
    return slug ? { slug, pkg, description: meta.description ?? "" } : null;
  });

  // several packages can live in one GitHub repo (monorepos), so collapse them into a single tracked repo
  const bySlug = new Map<string, { pkgs: Set<string>; users: Set<string> }>();
  for (const r of resolved) {
    if (r.status !== "fulfilled" || !r.value) continue;
    const { slug, pkg } = r.value;
    const entry = bySlug.get(slug) ?? { pkgs: new Set<string>(), users: new Set<string>() };
    entry.pkgs.add(pkg);
    usedBy.get(pkg)?.forEach((u) => entry.users.add(u));
    bySlug.set(slug, entry);
  }
  return [...bySlug.entries()]
    .sort((a, b) => b[1].users.size - a[1].users.size)
    .map(([name, { pkgs, users }]) => ({
      name,
      description: `npm: ${[...pkgs].slice(0, 2).join(", ")} · used by ${[...users].slice(0, 4).join(", ")}`.slice(0, 120),
      archived: false,
      fork: false,
      stars: 0,
    }));
}
