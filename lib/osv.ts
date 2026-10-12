import type { Advisory, DigestItem, RawRelease } from "./types";

const OSV = "https://api.osv.dev/v1";
const TIMEOUT_MS = 8000;
const MAX_ADVISORIES = 5;

/** GitHub repo -> npm package name, where the two differ or are well known. Unknown repos fall back to the repo name. */
const PACKAGE_MAP: Record<string, string> = {
  "stripe/stripe-node": "stripe",
  "auth0/node-auth0": "auth0",
  "octokit/octokit.js": "octokit",
  "facebook/react": "react",
  "vercel/next.js": "next",
};

export function packageForRepo(repo: string): string {
  return PACKAGE_MAP[repo.toLowerCase()] ?? PACKAGE_MAP[repo] ?? repo.split("/")[1].replace(/\.js$/i, "");
}

/** "v15.0.0" -> "15.0.0"; "@octokit/core@6.1.2" -> "6.1.2"; "release-1.2.3" -> "1.2.3". Null if no semver-ish version. */
export function versionFromTag(tag: string): string | null {
  const m = tag.match(/(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\s*$/);
  return m ? m[1] : null;
}

interface OsvVuln {
  id: string;
  aliases?: string[];
  summary?: string;
  database_specific?: { severity?: string };
}

function toAdvisory(v: OsvVuln, kind: Advisory["kind"]): Advisory {
  const cve = v.aliases?.find((a) => a.startsWith("CVE-"));
  const id = cve ?? v.id;
  const sev = v.database_specific?.severity?.toUpperCase();
  return {
    id,
    severity: sev && ["LOW", "MODERATE", "HIGH", "CRITICAL"].includes(sev) ? (sev as Advisory["severity"]) : "UNKNOWN",
    summary: v.summary?.slice(0, 160),
    kind,
    url: `https://osv.dev/vulnerability/${encodeURIComponent(v.id)}`,
  };
}

async function osvFetch(path: string, init?: RequestInit): Promise<unknown | null> {
  try {
    const res = await fetch(`${OSV}${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // OSV is an enrichment — never fail the digest because of it
  }
}

/**
 * Advisories for one release:
 *  - "affects":   OSV says this exact version is within a vulnerable range
 *  - "mentioned": CVE/GHSA ids named in the release notes, verified against OSV
 */
export async function findAdvisories(repo: string, tagName: string, body: string): Promise<Advisory[]> {
  const version = versionFromTag(tagName);
  const mentionedIds = [...new Set((body.match(/\b(CVE-\d{4}-\d{4,}|GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4})\b/gi) ?? []).map((s) => s.toUpperCase()))].slice(0, 3);

  const [affects, mentioned] = await Promise.all([
    version
      ? osvFetch("/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ package: { name: packageForRepo(repo), ecosystem: "npm" }, version }),
        })
      : Promise.resolve(null),
    Promise.all(mentionedIds.map((id) => osvFetch(`/vulns/${encodeURIComponent(id.startsWith("GHSA") ? "GHSA" + id.slice(4).toLowerCase() : id)}`))),
  ]);

  const out = new Map<string, Advisory>();
  for (const v of mentioned) if (v && (v as OsvVuln).id) out.set(toAdvisory(v as OsvVuln, "mentioned").id, toAdvisory(v as OsvVuln, "mentioned"));
  const vulns = (affects as { vulns?: OsvVuln[] } | null)?.vulns ?? [];
  for (const v of vulns) {
    const a = toAdvisory(v, "affects");
    if (!out.has(a.id)) out.set(a.id, a);
  }
  return [...out.values()].slice(0, MAX_ADVISORIES);
}

const SEV_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1, UNKNOWN: 0 };

/** Attach OSV advisories to digest items; verified advisories escalate routine releases to CRITICAL_SECURITY. */
export async function enrichWithAdvisories(items: DigestItem[], releases: RawRelease[]): Promise<DigestItem[]> {
  const bodies = new Map(releases.map((r) => [`${r.repo}@${r.tagName}`, r.body]));
  return Promise.all(
    items.map(async (item) => {
      const advisories = await findAdvisories(item.repo, item.tagName, bodies.get(`${item.repo}@${item.tagName}`) ?? "");
      if (advisories.length === 0) return item;
      advisories.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity]);
      const top = advisories[0];
      const reason =
        top.kind === "affects"
          ? `OSV lists ${top.id} (${top.severity}) as affecting this version.`
          : `Fixes ${top.id} (${top.severity}) — verified against OSV.`;
      return {
        ...item,
        advisories,
        urgency: "CRITICAL_SECURITY" as const,
        actionRequired: true,
        actionReason: item.actionRequired && item.actionReason && item.urgency === "CRITICAL_SECURITY" ? item.actionReason : reason,
      };
    }),
  );
}
