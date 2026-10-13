import type { DigestItem, DigestResponse } from "./types";

const HOUR = 60 * 60 * 1000;

/**
 * Sample digest that exercises every feature: all three urgency levels, all three categories,
 * OSV advisories (both kinds, several severities), action-required callouts, a raw-excerpt fallback,
 * quiet and failed repos, and warning banners. Release links go to each repo's releases page, and the
 * CVE ids use the year 2099 so they can never be mistaken for real advisories.
 */
export function buildMockDigest(): DigestResponse {
  const now = Date.now();
  const ago = (hours: number) => new Date(now - hours * HOUR).toISOString();
  const rel = (repo: string) => `https://github.com/${repo}/releases`;

  const items: DigestItem[] = [
    {
      repo: "auth0/node-auth0",
      tagName: "v4.9.1",
      publishedAt: ago(20),
      urgency: "CRITICAL_SECURITY",
      summary: [
        "Patches a **token validation bypass** affecting `ManagementClient` callers.",
        "Hardens **JWT audience checks** in the authentication client.",
        "No API changes — drop-in upgrade.",
      ],
      actionRequired: true,
      actionReason: "Upgrade before the next deploy; exposed login flows are affected.",
      advisories: [{ id: "CVE-2099-0001", severity: "CRITICAL", kind: "mentioned", summary: "Mock: token validation bypass", url: "https://osv.dev" }],
      url: rel("auth0/node-auth0"),
    },
    {
      repo: "adyen/adyen-node-api-library",
      tagName: "v21.0.1",
      publishedAt: ago(30),
      urgency: "CRITICAL_SECURITY",
      summary: [
        "Fixes **webhook HMAC verification** that accepted truncated signatures.",
        "Adds constant-time comparison for `notification` payloads.",
      ],
      actionRequired: true,
      actionReason: "Payment webhooks can be spoofed on earlier versions.",
      advisories: [{ id: "CVE-2099-0002", severity: "HIGH", kind: "affects", summary: "Mock: HMAC verification flaw", url: "https://osv.dev" }],
      url: rel("adyen/adyen-node-api-library"),
    },
    {
      repo: "vercel/next.js",
      tagName: "v16.4.2",
      publishedAt: ago(52),
      urgency: "CRITICAL_SECURITY",
      summary: [
        "Closes a **middleware bypass** for Pages Router apps using i18n.",
        "Backports the fix to **15.x** and **14.x** lines.",
        "Also tightens `Host` header handling.",
      ],
      actionRequired: true,
      actionReason: "Auth checks in middleware can be skipped on affected versions.",
      advisories: [
        { id: "CVE-2099-0003", severity: "HIGH", kind: "affects", summary: "Mock: middleware bypass", url: "https://osv.dev" },
        { id: "CVE-2099-0004", severity: "MODERATE", kind: "mentioned", summary: "Mock: Host header handling", url: "https://osv.dev" },
      ],
      url: rel("vercel/next.js"),
    },
    {
      repo: "lodash/lodash",
      tagName: "v4.17.22",
      publishedAt: ago(70),
      urgency: "CRITICAL_SECURITY",
      summary: ["Fixes **prototype pollution** in `_.zipObjectDeep`.", "Backward compatible patch release."],
      actionRequired: true,
      actionReason: "Transitive dependency in most Node services; update lockfiles.",
      advisories: [{ id: "CVE-2099-0005", severity: "LOW", kind: "mentioned", summary: "Mock: prototype pollution", url: "https://osv.dev" }],
      url: rel("lodash/lodash"),
    },
    {
      repo: "stripe/stripe-node",
      tagName: "v15.0.0",
      publishedAt: ago(40),
      urgency: "BREAKING_CHANGE",
      summary: [
        "Pins the **API version** to the latest release; default behaviour changes.",
        "Removes the deprecated `charges` helpers — migrate to **PaymentIntents**.",
        "Node 16 support dropped.",
      ],
      actionRequired: true,
      actionReason: "Checkout code using legacy charges will fail after upgrading.",
      url: rel("stripe/stripe-node"),
    },
    {
      repo: "nextauthjs/next-auth",
      tagName: "v5.0.0",
      publishedAt: ago(90),
      urgency: "BREAKING_CHANGE",
      summary: [
        "The **session callback** now receives a `token` and a `user` separately.",
        "Adapters moved to the `@auth/*` packages.",
      ],
      actionRequired: true,
      actionReason: "Custom session callbacks need rewriting before you can upgrade.",
      url: rel("nextauthjs/next-auth"),
    },
    {
      repo: "tailwindlabs/tailwindcss",
      tagName: "v4.1.0",
      publishedAt: ago(110),
      urgency: "BREAKING_CHANGE",
      summary: ["Configuration moves to **CSS-first** `@theme` blocks.", "Removes the legacy `tailwind.config.js` auto-detection."],
      actionRequired: false,
      actionReason: "",
      url: rel("tailwindlabs/tailwindcss"),
    },
    {
      repo: "plaid/plaid-node",
      tagName: "v31.2.0",
      publishedAt: ago(24),
      urgency: "ROUTINE_UPDATE",
      summary: ["Adds `transactions/sync` pagination helpers.", "Updates generated types for the **2020-09-14** API version."],
      actionRequired: false,
      actionReason: "",
      url: rel("plaid/plaid-node"),
    },
    {
      repo: "panva/jose",
      tagName: "v6.1.0",
      publishedAt: ago(60),
      urgency: "ROUTINE_UPDATE",
      summary: ["Adds support for **JWE compact** serialisation in browsers.", "Performance improvements for `jwtVerify`."],
      actionRequired: false,
      actionReason: "",
      url: rel("panva/jose"),
    },
    {
      repo: "facebook/react",
      tagName: "v19.3.0",
      publishedAt: ago(100),
      urgency: "ROUTINE_UPDATE",
      summary: ["Improves **Suspense** hydration performance.", "Fixes a warning in `useActionState` under StrictMode."],
      actionRequired: false,
      actionReason: "",
      url: rel("facebook/react"),
    },
    {
      repo: "octokit/octokit.js",
      tagName: "v3.2.1",
      publishedAt: ago(120),
      urgency: "ROUTINE_UPDATE",
      summary: ["Bumps `@octokit/core` and **plugin-paginate-rest** to latest patches.", "Fixes a typo in the README examples."],
      actionRequired: false,
      actionReason: "",
      url: rel("octokit/octokit.js"),
    },
    {
      repo: "supabase/supabase-js",
      tagName: "v2.58.0",
      publishedAt: ago(130),
      urgency: "ROUTINE_UPDATE",
      summary: ["Adds `abortSignal` support to storage uploads.", "Updates realtime client to the latest protocol."],
      actionRequired: false,
      actionReason: "",
      url: rel("supabase/supabase-js"),
    },
    {
      repo: "typescript-eslint/typescript-eslint",
      tagName: "v8.12.0",
      publishedAt: ago(140),
      urgency: "ROUTINE_UPDATE",
      summary: ["New rule: `no-unnecessary-type-parameters` improvements.", "Fixes false positives in `prefer-nullish-coalescing`."],
      actionRequired: false,
      actionReason: "",
      url: rel("typescript-eslint/typescript-eslint"),
    },
    {
      // Demonstrates the graceful fallback when Gemini can't summarise a release.
      repo: "googleapis/js-genai",
      tagName: "v2.1.0",
      publishedAt: ago(150),
      urgency: "ROUTINE_UPDATE",
      summary: ["Features", "add support for structured output streaming", "Bug Fixes"],
      actionRequired: false,
      actionReason: "",
      fallback: true,
      url: rel("googleapis/js-genai"),
    },
  ];

  items.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  const rank = { CRITICAL_SECURITY: 0, BREAKING_CHANGE: 1, ROUTINE_UPDATE: 2 } as const;
  items.sort((a, b) => rank[a.urgency] - rank[b.urgency]);

  return {
    items,
    generatedAt: new Date(now).toISOString(),
    reposChecked: 16,
    reposQuiet: ["stripe/stripe-js", "auth0/auth0-spa-js"],
    reposFailed: [{ repo: "acme-corp/private-sdk", reason: "acme-corp/private-sdk not found (or private)" }],
    warnings: [
      "GitHub API rate limit reached. Set a GITHUB_TOKEN environment variable (a personal access token) to raise the limit from 60 to 5,000 requests/hour.",
      "Some releases could not be summarised by Gemini; raw excerpts are shown for them.",
    ],
    rateLimited: true,
  };
}
