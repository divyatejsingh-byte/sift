export type Urgency = "CRITICAL_SECURITY" | "BREAKING_CHANGE" | "ROUTINE_UPDATE";

export interface RawRelease {
  repo: string; // owner/name
  tagName: string;
  name: string;
  publishedAt: string;
  url: string;
  body: string;
  prerelease: boolean;
}

export interface Advisory {
  /** CVE id when known, otherwise GHSA/OSV id */
  id: string;
  severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNKNOWN";
  summary?: string;
  /** "affects" = OSV lists this version as vulnerable; "mentioned" = id named in the notes and verified on OSV */
  kind: "affects" | "mentioned";
  url: string;
}

export interface DigestItem {
  repo: string;
  tagName: string;
  publishedAt: string;
  urgency: Urgency;
  /** 2-3 short bullet points (may contain **bold** keywords) */
  summary: string[];
  /** true when the team must act (security patch to apply, migration needed) */
  actionRequired: boolean;
  /** one-line reason, empty when actionRequired is false */
  actionReason: string;
  /** verified OSV.dev advisories, if any */
  advisories?: Advisory[];
  url: string;
  /** true when Gemini was unavailable and a raw excerpt is shown instead */
  fallback?: boolean;
}

export interface DigestResponse {
  items: DigestItem[];
  generatedAt: string;
  reposChecked: number;
  /** repos checked successfully that had no releases in the period */
  reposQuiet?: string[];
  reposFailed: { repo: string; reason: string }[];
  warnings: string[];
  /** set when the GitHub rate limit was hit */
  rateLimited?: boolean;
}

export const DEFAULT_REPOS = [
  "stripe/stripe-node",
  "auth0/node-auth0",
  "octokit/octokit.js",
  "facebook/react",
  "vercel/next.js",
];
