import { NextResponse } from "next/server";
import { DepsError, findDependencyRepos } from "@/lib/deps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;
const MAX_PAGES = 3; // 300 repos is plenty for a watch list

interface GhRepo {
  full_name: string;
  description: string | null;
  archived: boolean;
  fork: boolean;
  private: boolean;
  stargazers_count: number;
}

/**
 * Lists repos a GitHub user stars or watches, so they can be imported as tracked repos.
 *  - ?username=octocat  -> public data, works without a token
 *  - no username        -> the owner of GITHUB_TOKEN (server-side env var, never sent to the browser)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sourceParam = searchParams.get("source");
  const source = sourceParam === "watching" ? "subscriptions" : "starred";
  const username = (searchParams.get("username") ?? "").trim();
  const token = process.env.GITHUB_TOKEN;

  if (username && !USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "That doesn't look like a valid GitHub username." }, { status: 400 });
  }
  if (sourceParam === "dependencies") {
    if (!username) return NextResponse.json({ error: "Enter your GitHub username to scan your repos' dependencies." }, { status: 400 });
    try {
      return NextResponse.json({ owner: username, source: "dependencies", repos: await findDependencyRepos(username) });
    } catch (err) {
      if (err instanceof DepsError) return NextResponse.json({ error: err.message }, { status: err.status });
      console.error("[github/repos] deps failed:", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "Could not scan dependencies. Try again." }, { status: 502 });
    }
  }
  if (!username && !token) {
    return NextResponse.json(
      { error: "Enter your GitHub username, or set GITHUB_TOKEN on the server to import from your own account." },
      { status: 400 },
    );
  }

  const base = username ? `https://api.github.com/users/${encodeURIComponent(username)}/${source}` : `https://api.github.com/user/${source}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "sift",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const repos: GhRepo[] = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(`${base}?per_page=100&page=${page}`, { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (res.status === 404) return NextResponse.json({ error: `GitHub user "${username}" not found.` }, { status: 404 });
      if (res.status === 401) return NextResponse.json({ error: "GITHUB_TOKEN was rejected by GitHub. Check that it is valid and not expired." }, { status: 502 });
      if ((res.status === 403 || res.status === 429) && res.headers.get("x-ratelimit-remaining") === "0") {
        return NextResponse.json({ error: "GitHub API rate limit reached. Set GITHUB_TOKEN to raise the limit." }, { status: 429 });
      }
      if (!res.ok) return NextResponse.json({ error: `GitHub returned ${res.status}.` }, { status: 502 });
      if (res.status === 204) break; // GitHub returns 204 No Content for an empty list
      const batch = (await res.json()) as GhRepo[];
      repos.push(...batch);
      if (batch.length < 100) break;
    }
  } catch (err) {
    console.error("[github/repos] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not reach GitHub. Try again." }, { status: 502 });
  }

  return NextResponse.json({
    owner: username || "token",
    source: source === "subscriptions" ? "watching" : "starred",
    repos: repos
      .filter((r) => !r.private || !username) // never surface private repos for someone else's username
      .map((r) => ({
        name: r.full_name,
        description: r.description?.slice(0, 120) ?? "",
        archived: r.archived,
        fork: r.fork,
        stars: r.stargazers_count,
      })),
  });
}
