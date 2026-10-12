"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BellRing,
  Bot,
  CalendarClock,
  CheckCircle2,
  Filter,
  GitBranch,
  GitPullRequest,
  ListPlus,
  MessageSquare,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import DigestCard from "@/components/DigestCard";
import SignInModal from "./SignInModal";
import type { DigestItem } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

function sampleItems(): DigestItem[] {
  const now = Date.now();
  return [
    {
      repo: "auth0/node-auth0",
      tagName: "v4.9.1",
      publishedAt: new Date(now - 1 * DAY).toISOString(),
      urgency: "CRITICAL_SECURITY",
      summary: [
        "Patches a **token validation bypass** affecting `ManagementClient` callers.",
        "Hardens **JWT audience checks** on the authentication client.",
        "No API changes — drop-in upgrade.",
      ],
      actionRequired: true,
      actionReason: "Upgrade before the next deploy; exposed auth flows are affected.",
      url: "https://github.com/auth0/node-auth0/releases",
    },
    {
      repo: "stripe/stripe-node",
      tagName: "v15.0.0",
      publishedAt: new Date(now - 3 * DAY).toISOString(),
      urgency: "BREAKING_CHANGE",
      summary: [
        "Pins the **API version** to the latest release; default behaviour changes.",
        "Removes the deprecated `charges` helpers — migrate to **PaymentIntents**.",
        "Node 16 support dropped.",
      ],
      actionRequired: true,
      actionReason: "Checkout code using legacy charges will fail after upgrading.",
      url: "https://github.com/stripe/stripe-node/releases",
    },
    {
      repo: "octokit/octokit.js",
      tagName: "v3.2.1",
      publishedAt: new Date(now - 5 * DAY).toISOString(),
      urgency: "ROUTINE_UPDATE",
      summary: ["Bumps `@octokit/core` and **plugin-paginate-rest** to latest patch versions.", "Fixes a typo in the README examples."],
      actionRequired: false,
      actionReason: "",
      url: "https://github.com/octokit/octokit.js/releases",
    },
  ];
}

const FEATURES = [
  { icon: Sparkles, title: "AI Urgency Classification", body: "Gemini Flash reads every changelog and tags it CRITICAL_SECURITY, BREAKING_CHANGE or ROUTINE_UPDATE — with a one-line reason when your team must act.", tint: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { icon: ListPlus, title: "Zero-Code Repository Management", body: "Add, remove and categorise upstream repos straight from the UI. Paste a GitHub URL and you’re tracking it — no config files, no deploys.", tint: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
  { icon: CalendarClock, title: "Engineered for Monday Mornings", body: "The trailing 7 days, condensed into 2–3 scannable impact bullets per release, with critical items pinned to the top.", tint: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { icon: GitBranch, title: "Live GitHub REST Ingestion", body: "Pulls official releases and tags directly from the GitHub API and discards commits, PRs, issues and discussions entirely.", tint: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
];

const PIPELINE = [
  { step: "01", title: "GitHub Releases API", body: "Concurrent fetch per repo. One 404 never sinks the batch; rate limits fail fast with a clear banner." },
  { step: "02", title: "Sandbox & truncate", body: "Changelogs are capped at 4,000 chars and wrapped in tagged blocks the model must treat as raw data." },
  { step: "03", title: "Gemini Flash", body: "Strict JSON schema at temperature 0.1, with a safe raw-excerpt fallback if the model or parser fails." },
  { step: "04", title: "OSV.dev verification", body: "CVE and GHSA IDs are checked against the public OSV database and escalate the release automatically." },
];

export default function LandingPage() {
  const [modal, setModal] = useState<{ open: boolean; prefill: boolean }>({ open: false, prefill: false });
  // built after mount: relative dates depend on Date.now(), which differs between server and client render
  const [samples, setSamples] = useState<DigestItem[]>([]);

  useEffect(() => {
    setSamples(sampleItems());
    if (new URLSearchParams(window.location.search).get("signin") === "1") setModal({ open: true, prefill: false });
  }, []);

  const open = (prefill: boolean) => setModal({ open: true, prefill });
  const close = () => {
    setModal((m) => ({ ...m, open: false }));
    if (window.location.search) window.history.replaceState(null, "", "/");
  };

  const primary =
    "inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/40 hover:brightness-110";
  const secondary =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/10";

  return (
    <div className="relative min-h-screen bg-[#09090b] font-sans text-zinc-100">
      {/* background: dot grid + radial glows */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[900px] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
        <div className="absolute left-1/2 top-[-200px] h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[120px]" />
        <div className="absolute right-[-100px] top-[100px] h-[300px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#09090b]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="#top" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500">
              <Filter size={17} className="text-zinc-950" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Sift</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">v1.0</span>
          </a>
          <nav className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
            <a href="#dilemma" className="transition-colors hover:text-zinc-100">The Dilemma</a>
            <a href="#features" className="transition-colors hover:text-zinc-100">Features</a>
            <a href="#architecture" className="transition-colors hover:text-zinc-100">Architecture</a>
          </nav>
          <button onClick={() => open(false)} className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/10">
            Sign In
          </button>
        </div>
      </header>

      <main id="top" className="relative">
        {/* hero */}
        <section className="mx-auto max-w-4xl px-4 pb-20 pt-20 text-center sm:pt-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            ⚡ Sift the signal from the GitHub firehose
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-zinc-100 sm:text-6xl">
            Never let a critical security patch drown in notification noise again.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            GitHub notifications bury genuine releases under thousands of routine PRs and comments. Sift uses Gemini Flash to isolate upstream releases across 20+ repos and deliver an actionable, 5-minute Monday morning digest.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button onClick={() => open(true)} className={primary}>
              Launch Keerthi&apos;s Workspace <ArrowRight size={15} />
            </button>
            <a href="#preview" className={secondary}>
              View Live Demo Feed
            </a>
          </div>
        </section>

        {/* dilemma */}
        <section id="dilemma" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Keerthi&apos;s dilemma</p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-100 sm:text-3xl">20+ upstream repos. One senior engineer. Zero time.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-rose-500/20 bg-rose-950/10 p-6 opacity-90">
              <h3 className="flex items-center gap-2 text-base font-semibold text-rose-300">
                <BellRing size={16} /> The Firehose Problem
              </h3>
              <p className="mt-1 text-sm text-zinc-500">What GitHub notifications look like today.</p>
              <ul className="mt-5 space-y-2 text-sm text-zinc-500">
                <li className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2">
                  <MessageSquare size={14} className="text-zinc-600" /> <span className="font-semibold text-rose-300">1,400</span> unread PR comments
                </li>
                <li className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2">
                  <Bot size={14} className="text-zinc-600" /> dependabot[bot]: bump lodash from 4.17.20 to 4.17.21
                </li>
                <li className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2">
                  <GitPullRequest size={14} className="text-zinc-600" /> Re: flaky test on windows-latest (+37 replies)
                </li>
                <li className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2">
                  <MessageSquare size={14} className="text-zinc-600" /> Issue triage: &ldquo;docs typo in README&rdquo;
                </li>
              </ul>
              <p className="mt-5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm italic text-rose-200">
                &ldquo;11 days: Time a core auth security fix sat unnoticed in unread notifications.&rdquo;
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.06] to-zinc-900/40 p-6 shadow-[0_0_60px_-20px_rgba(16,185,129,0.35)]">
              <h3 className="flex items-center gap-2 text-base font-semibold text-emerald-300">
                <Sparkles size={16} /> The Sift Digest
              </h3>
              <p className="mt-1 text-sm text-zinc-400">One calm page, every Monday.</p>
              <ul className="mt-5 space-y-2.5 text-sm text-zinc-300">
                {["A 5-minute Monday briefing, start to finish", "Zero noise from PRs, issues or discussions", "Security fixes and CVEs pinned to the top", "Breaking changes highlighted with the reason to act"].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" /> {t}
                  </li>
                ))}
              </ul>
              <p className="mt-5 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                <ShieldAlert size={15} className="shrink-0" /> 1 item requires immediate team review
              </p>
            </div>
          </div>
        </section>

        {/* features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Features</p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-100 sm:text-3xl">Built to make Monday the easiest day of the week</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, body, tint }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition-colors hover:border-white/20">
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl border ${tint}`}>
                  <Icon size={18} />
                </div>
                <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* preview */}
        <section id="preview" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Live demo feed</p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-100 sm:text-3xl">This is what you open on Monday</h2>
            <p className="mt-2 text-xs text-zinc-500">Illustrative sample releases — your digest uses live data from the repos you track.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {samples.length === 0
              ? [0, 1, 2].map((i) => <div key={i} className="h-72 rounded-xl border border-zinc-800 bg-zinc-900/40" aria-hidden />)
              : samples.map((item) => <DigestCard key={`${item.repo}@${item.tagName}`} item={item} />)}
          </div>
          <div className="mt-8 text-center">
            <button onClick={() => open(true)} className={primary}>
              Open the real dashboard <ArrowRight size={15} />
            </button>
          </div>
        </section>

        {/* architecture */}
        <section id="architecture" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Architecture</p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-100 sm:text-3xl">Resilient by default</h2>
          </div>
          <ol className="grid gap-4 md:grid-cols-4">
            {PIPELINE.map((p) => (
              <li key={p.step} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <span className="font-mono text-xs text-emerald-400">{p.step}</span>
                <h3 className="mt-2 text-sm font-semibold text-zinc-100">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{p.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="relative border-t border-white/10 py-8 text-center text-xs text-zinc-600">
        Sift · releases from GitHub, advisories from OSV.dev, summaries by Gemini Flash.
      </footer>

      <SignInModal open={modal.open} onClose={close} prefillPassword={modal.prefill} />
    </div>
  );
}
