"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Database, History, LogOut, RefreshCw, Filter, AlertOctagon, Info, Settings2 } from "lucide-react";
import DigestFeed from "@/components/DigestFeed";
import TopAlertBanner from "@/components/TopAlertBanner";
import RepoManagerModal from "@/components/RepoManagerModal";
import { CATEGORIES, categoryForRepo, type Category } from "@/lib/categories";
import { DEFAULT_REPOS, type DigestResponse } from "@/lib/types";

const REPOS_KEY = "sift:repos";
const DIGEST_KEY = "sift:digest";
// pre-rename keys, read once so existing users keep their tracked repos
const LEGACY_REPOS_KEY = "release-radar:repos";
const LEGACY_DIGEST_KEY = "release-radar:digest";

interface DigestMeta {
  id: string;
  generatedAt: string;
  itemsCount: number;
  criticalCount: number;
}

type Filter = "all" | "urgent" | "routine";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "urgent", label: "Security & Breaking Only" },
  { id: "routine", label: "Routine" },
];

export default function Home() {
  const [repos, setRepos] = useState<string[]>(DEFAULT_REPOS);
  const [digest, setDigest] = useState<DigestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<Category | "all">("all");
  const [storage, setStorage] = useState<"supabase" | "local">("local");
  const [history, setHistory] = useState<DigestMeta[]>([]);

  async function loadHistory() {
    try {
      const res = await fetch("/api/digests");
      const data = await res.json();
      if (res.ok) setHistory(data.digests ?? []);
    } catch {}
  }

  useEffect(() => {
    (async () => {
      // Prefer the database when Supabase is configured; otherwise fall back to this browser's storage.
      try {
        const res = await fetch("/api/repos");
        const data = await res.json();
        if (res.ok && data.storage === "supabase" && Array.isArray(data.repos)) {
          setStorage("supabase");
          setRepos(data.repos);
          const dres = await fetch("/api/digests?latest=1");
          const ddata = await dres.json();
          if (dres.ok && ddata.digest) setDigest(ddata.digest);
          loadHistory();
          setHydrated(true);
          return;
        }
      } catch {
        /* server storage unavailable: use local */
      }
      try {
        const r = localStorage.getItem(REPOS_KEY) ?? localStorage.getItem(LEGACY_REPOS_KEY);
        if (r) setRepos(JSON.parse(r));
        const d = localStorage.getItem(DIGEST_KEY) ?? localStorage.getItem(LEGACY_DIGEST_KEY);
        if (d) setDigest(JSON.parse(d));
      } catch {
        /* ignore corrupt storage */
      }
      setHydrated(true);
    })();
  }, []);

  function updateRepos(next: string[]) {
    setRepos(next);
    try {
      localStorage.setItem(REPOS_KEY, JSON.stringify(next));
    } catch {}
    if (storage === "supabase") {
      fetch("/api/repos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repos: next }),
      })
        .then((r) => !r.ok && setError("Couldn't save your repository list to the database."))
        .catch(() => setError("Couldn't save your repository list to the database."));
    }
  }

  async function openPastDigest(id: string) {
    if (!id) return;
    try {
      const res = await fetch(`/api/digests?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not load that digest.");
      setDigest(data.digest);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load that digest.");
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/");
    router.refresh();
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repos, days: 7 }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? `Request failed (${res.status})`);
      setDigest(data);
      try {
        localStorage.setItem(DIGEST_KEY, JSON.stringify(data));
      } catch {}
      if (data.id) loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const items = digest?.items ?? [];
  const visible = useMemo(
    () =>
      items
        .filter((i) => (category === "all" ? true : categoryForRepo(i.repo) === category))
        .filter((i) => (filter === "all" ? true : filter === "urgent" ? i.urgency !== "ROUTINE_UPDATE" : i.urgency === "ROUTINE_UPDATE")),
    [items, filter, category],
  );
  const releaseCounts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((i) => (c[i.repo] = (c[i.repo] ?? 0) + 1));
    return c;
  }, [items]);

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <Filter size={18} className="text-white" />
            </div>
            <div className="leading-tight">
              <h1 className="text-[15px] font-semibold tracking-tight">Sift</h1>
              <p className="hidden text-[11px] text-zinc-500 md:block">Sift the signal from the firehose.</p>
            </div>
            <span className="hidden rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-xs text-zinc-400 sm:inline">
              Monday Briefing · {today}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-50"
            >
              <Settings2 size={14} /> Manage Repos ({repos.length} tracked)
            </button>
            <button
              onClick={generate}
              disabled={loading || repos.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3.5 py-1.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {loading ? "Running…" : "Run Digest"}
            </button>
            <button
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
              className="rounded-lg border border-zinc-800 p-2 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            <AlertOctagon size={16} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}
        {digest?.warnings.map((w) => {
          const rl = digest.rateLimited && w.includes("rate limit");
          return (
            <div
              key={w}
              role="alert"
              className={`mb-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${
                rl ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
            >
              <Info size={16} className="mt-0.5 shrink-0" /> {w}
            </div>
          );
        })}

        {!digest && hydrated && (
          <div className="rounded-xl border border-dashed border-zinc-800 px-6 py-16 text-center">
            <Filter size={28} className="mx-auto mb-3 text-zinc-600" />
            <p className="text-sm text-zinc-400">
              Press <span className="font-medium text-zinc-200">Run Digest</span> to scan {repos.length} repositories for releases from the last 7 days.
            </p>
          </div>
        )}

        {digest && (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    role="tab"
                    aria-selected={filter === f.id}
                    onClick={() => setFilter(f.id)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      filter === f.id ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {history.length > 1 && (
                  <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <History size={12} />
                    <select
                      value={digest.id ?? ""}
                      onChange={(e) => openPastDigest(e.target.value)}
                      aria-label="Past digests"
                      className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 outline-none focus:border-zinc-600"
                    >
                      {!history.some((h) => h.id === digest.id) && <option value="">Current</option>}
                      {history.map((h) => (
                        <option key={h.id} value={h.id}>
                          {new Date(h.generatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {h.itemsCount} releases
                          {h.criticalCount > 0 ? ` · ${h.criticalCount} critical` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              <p className="text-xs text-zinc-500">
                {items.length} releases · {digest.reposChecked} repos · updated {new Date(digest.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">Category</span>
              {(["all", ...CATEGORIES] as const).map((c) => {
                const n = c === "all" ? items.length : items.filter((i) => categoryForRepo(i.repo) === c).length;
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                    className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                      category === c
                        ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
                        : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    {c === "all" ? "All" : c} <span className="opacity-60">{n}</span>
                  </button>
                );
              })}
            </div>

            <TopAlertBanner items={items} />
            <DigestFeed items={visible} totalItems={items.length} quietRepos={digest.reposQuiet} />

            {digest.reposFailed.length > 0 && (
              <details className="mt-6 text-sm text-zinc-500">
                <summary className="cursor-pointer transition-colors hover:text-zinc-300">{digest.reposFailed.length} repo(s) could not be fetched</summary>
                <ul className="mt-2 space-y-1 pl-4">
                  {digest.reposFailed.map((f) => (
                    <li key={f.repo}>
                      <span className="text-zinc-300">{f.repo}</span> — {f.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-600">
        Sift · releases from GitHub, advisories from OSV.dev, summaries by Gemini Flash.
        <span className="ml-2 inline-flex items-center gap-1 text-zinc-500">
          <Database size={11} /> {storage === "supabase" ? "Synced to Supabase" : "Saved in this browser"}
        </span>
      </footer>

      <RepoManagerModal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        repos={repos}
        onChange={updateRepos}
        releaseCounts={releaseCounts}
        hasDigest={!!digest}
      />
    </div>
  );
}
