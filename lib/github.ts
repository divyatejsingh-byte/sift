import { isValidRepo } from "./validation";
import type { RawRelease } from "./types";

export class RateLimitError extends Error {
  constructor(message = "GitHub API rate limit reached") {
    super(message);
    this.name = "RateLimitError";
  }
}

export class RepoFetchError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "RepoFetchError";
  }
}

interface GitHubRelease {
  tag_name: string;
  name: string | null;
  html_url: string;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
}

/**
 * Fetches releases (only — never commits, PRs, issues or discussions) published in the last `days` days.
 * Returns [] when the repo has no recent releases.
 */
export interface FetchOptions {
  /** canary / beta / rc builds are noise in a weekly briefing, so they're excluded unless asked for */
  includePrereleases?: boolean;
  /** newest N releases per repo; keeps one busy repo from flooding the digest */
  maxPerRepo?: number;
}

export async function fetchRecentReleases(owner: string, repo: string, days = 7, opts: FetchOptions = {}): Promise<RawRelease[]> {
  const { includePrereleases = false, maxPerRepo = 5 } = opts;
  const slug = `${owner}/${repo}`;
  if (!isValidRepo(slug)) throw new RepoFetchError(400, `Invalid repository "${slug}"`);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "sift",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=30`,
    { headers, cache: "no-store", signal: AbortSignal.timeout(15000) },
  );

  const remaining = res.headers.get("x-ratelimit-remaining");
  if ((res.status === 403 || res.status === 429) && (remaining === "0" || res.headers.has("retry-after"))) {
    throw new RateLimitError();
  }
  if (res.status === 404) throw new RepoFetchError(404, `${slug} not found (or private)`);
  if (!res.ok) throw new RepoFetchError(res.status, `GitHub returned ${res.status} for ${slug}`);

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || data.length === 0) return [];

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return (data as GitHubRelease[])
    .filter((r) => !r.draft && (includePrereleases || !r.prerelease) && r.published_at && new Date(r.published_at).getTime() >= cutoff)
    .slice(0, maxPerRepo)
    .map((r) => ({
      repo: slug,
      tagName: r.tag_name,
      name: r.name || r.tag_name,
      publishedAt: r.published_at as string,
      url: r.html_url,
      body: r.body ?? "",
      prerelease: r.prerelease,
    }));
}
