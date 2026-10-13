"use client";

import { useMemo, useState } from "react";
import { Download, Loader2, Search, Star } from "lucide-react";
import { isValidRepo } from "@/lib/validation";

interface Candidate {
  name: string;
  description: string;
  archived: boolean;
  fork: boolean;
  stars: number;
}

type Source = "dependencies" | "starred" | "watching";
const SOURCE_LABEL: Record<Source, string> = { dependencies: "My dependencies", starred: "Starred", watching: "Watching" };

interface Props {
  tracked: string[];
  onAdd: (repos: string[]) => void;
}

const MAX_TRACKED = 50;

export default function ImportFromGitHub({ tracked, onAdd }: Props) {
  const [username, setUsername] = useState("");
  const [source, setSource] = useState<Source>("dependencies");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const trackedLower = useMemo(() => new Set(tracked.map((t) => t.toLowerCase())), [tracked]);
  const visible = useMemo(
    () =>
      (candidates ?? [])
        .filter((c) => !trackedLower.has(c.name.toLowerCase()) && !c.archived)
        .filter((c) => !query || c.name.toLowerCase().includes(query.toLowerCase()) || c.description.toLowerCase().includes(query.toLowerCase())),
    [candidates, trackedLower, query],
  );

  async function load(nextSource: Source = source) {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ source: nextSource });
      if (username.trim()) qs.set("username", username.trim());
      const res = await fetch(`/api/github/repos?${qs}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? `Request failed (${res.status})`);
      setCandidates(data.repos);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setCandidates(null);
    } finally {
      setLoading(false);
    }
  }

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const room = MAX_TRACKED - tracked.length;

  function addSelected() {
    const picks = [...selected].filter(isValidRepo).slice(0, Math.max(room, 0));
    if (picks.length) onAdd(picks);
    setSelected(new Set());
  }

  return (
    <div className="space-y-3 border-b border-zinc-800 bg-zinc-900/30 px-5 py-4">
      <div className="flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={source === "dependencies" ? "Your GitHub username" : "GitHub username (blank = use server token)"}
          aria-label="GitHub username"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
        />
        <button
          onClick={() => load()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Fetch
        </button>
      </div>
      <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5 text-xs">
        {(["dependencies", "starred", "watching"] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setSource(s);
              if (candidates) load(s);
            }}
            className={`rounded-md px-3 py-1 transition-colors ${source === s ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            {SOURCE_LABEL[s]}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}

      {candidates && (
        <>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Filter ${visible.length} repos`}
              aria-label="Filter repos"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-8 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
            />
          </div>
          <ul className="max-h-56 space-y-0.5 overflow-y-auto">
            {visible.map((c) => (
              <li key={c.name}>
                <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-900">
                  <input type="checkbox" checked={selected.has(c.name)} onChange={() => toggle(c.name)} className="mt-1 accent-emerald-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-zinc-200">{c.name}</span>
                    {c.description && <span className="block truncate text-xs text-zinc-500">{c.description}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5 text-xs text-zinc-600">
                    <Star size={10} /> {c.stars >= 1000 ? `${(c.stars / 1000).toFixed(1)}k` : c.stars}
                  </span>
                </label>
              </li>
            ))}
            {visible.length === 0 && <li className="px-2 py-4 text-center text-xs text-zinc-500">Nothing new to import.</li>}
          </ul>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">{room > 0 ? `${room} slots left (max ${MAX_TRACKED})` : `Limit of ${MAX_TRACKED} repos reached`}</span>
            <button
              onClick={addSelected}
              disabled={selected.size === 0 || room <= 0}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-40"
            >
              Add {selected.size > 0 ? selected.size : ""} selected
            </button>
          </div>
        </>
      )}
    </div>
  );
}
