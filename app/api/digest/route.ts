import { NextResponse } from "next/server";
import { fetchRecentReleases, RateLimitError } from "@/lib/github";
import { analyzeReleasesWithGemini } from "@/lib/gemini";
import { enrichWithAdvisories } from "@/lib/osv";
import { isValidRepo } from "@/lib/validation";
import type { DigestResponse, RawRelease } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_REPOS = 50;
const ORDER = { CRITICAL_SECURITY: 0, BREAKING_CHANGE: 1, ROUTINE_UPDATE: 2 } as const;

export async function POST(req: Request) {
  try {
    let body: { repos?: unknown; days?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
    }

    if (!Array.isArray(body.repos) || body.repos.length === 0) {
      return NextResponse.json({ error: "Provide a non-empty `repos` array." }, { status: 400 });
    }
    const unique = [...new Set(body.repos as unknown[])];
    const invalid = unique.filter((r) => !isValidRepo(r));
    if (invalid.length) {
      return NextResponse.json(
        { error: `Invalid repository format (expected owner/name): ${invalid.map(String).slice(0, 5).join(", ")}` },
        { status: 400 },
      );
    }
    const repos = (unique as string[]).slice(0, MAX_REPOS);
    const days = typeof body.days === "number" && body.days >= 1 && body.days <= 30 ? Math.floor(body.days) : 7;

    const warnings: string[] = [];
    if (unique.length > MAX_REPOS) warnings.push(`Only the first ${MAX_REPOS} repositories were checked.`);

    // Batch resilience: one failing repo never sinks the rest.
    const settled = await Promise.allSettled(
      repos.map((r) => {
        const [owner, name] = r.split("/");
        return fetchRecentReleases(owner, name, days);
      }),
    );

    const releases: RawRelease[] = [];
    const reposFailed: DigestResponse["reposFailed"] = [];
    let rateLimited = false;
    settled.forEach((s, i) => {
      if (s.status === "fulfilled") {
        releases.push(...s.value);
      } else if (s.reason instanceof RateLimitError) {
        rateLimited = true;
        reposFailed.push({ repo: repos[i], reason: "GitHub rate limit reached" });
      } else {
        const reason = s.reason instanceof Error ? s.reason.message : "Unknown error";
        console.error(`[github] ${repos[i]} failed:`, reason);
        reposFailed.push({ repo: repos[i], reason });
      }
    });

    if (rateLimited) {
      warnings.push(
        "GitHub API rate limit reached. Set a GITHUB_TOKEN environment variable (a personal access token) to raise the limit from 60 to 5,000 requests/hour.",
      );
    }
    if (!process.env.GEMINI_API_KEY) {
      warnings.push("GEMINI_API_KEY is not set — showing raw release excerpts instead of AI summaries.");
    }

    const items = await enrichWithAdvisories(await analyzeReleasesWithGemini(releases), releases);
    if (process.env.GEMINI_API_KEY && items.some((i) => i.fallback)) {
      warnings.push("Some releases could not be summarised by Gemini; raw excerpts are shown for them.");
    }
    items.sort(
      (a, b) => ORDER[a.urgency] - ORDER[b.urgency] || +new Date(b.publishedAt) - +new Date(a.publishedAt),
    );

    const payload: DigestResponse = {
      items,
      generatedAt: new Date().toISOString(),
      reposChecked: repos.length,
      reposQuiet: repos.filter((r) => !releases.some((x) => x.repo === r) && !reposFailed.some((f) => f.repo === r)),
      reposFailed,
      warnings,
      rateLimited,
    };
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[digest] unexpected error:", err);
    return NextResponse.json({ error: "Unexpected server error while generating the digest." }, { status: 500 });
  }
}
