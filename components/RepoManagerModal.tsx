"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2, RotateCcw, Github } from "lucide-react";
import ImportFromGitHub from "./ImportFromGitHub";
import { isValidRepo } from "@/lib/validation";
import { DEFAULT_REPOS } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  repos: string[];
  onChange: (repos: string[]) => void;
  /** releases found per repo in the current digest */
  releaseCounts: Record<string, number>;
  hasDigest: boolean;
}

function normalize(input: string): string {
  return input
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "")
    .replace(/\.git$/i, "")
    .split(/[?#]/)[0]
    .split("/")
    .slice(0, 2)
    .join("/");
}

export default function RepoManagerModal({ open, onClose, repos, onChange, releaseCounts, hasDigest }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function track(e: React.FormEvent) {
    e.preventDefault();
    const repo = normalize(value);
    if (!isValidRepo(repo)) return setError("Enter owner/repo or a github.com URL");
    if (repos.some((r) => r.toLowerCase() === repo.toLowerCase())) return setError("Already tracked");
    onChange([repo, ...repos]);
    setValue("");
    setError(null);
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
      <aside
        role="dialog"
        aria-label="Manage repositories"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-50">Tracked repositories</h2>
            <p className="text-xs text-zinc-500">{repos.length} tracked · saved in this browser</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={track} className="border-b border-zinc-800 px-5 py-4">
          <div className="flex gap-2">
            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              placeholder="Paste github.com URL or owner/repo"
              aria-label="Repository to track"
              className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-600"
            />
            <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white">
              <Plus size={14} /> Track
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
        </form>

        <div className="border-b border-zinc-800">
          <button
            onClick={() => setImportOpen((o) => !o)}
            aria-expanded={importOpen}
            className="flex w-full items-center gap-2 px-5 py-3 text-sm text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-50"
          >
            <Github size={14} /> Import from GitHub (starred / watching)
            <span className="ml-auto text-xs text-zinc-600">{importOpen ? "Hide" : "Show"}</span>
          </button>
          {importOpen && <ImportFromGitHub tracked={repos} onAdd={(picked) => onChange([...picked, ...repos])} />}
        </div>

        <ul className="flex-1 divide-y divide-zinc-800/60 overflow-y-auto px-2">
          {repos.map((r) => {
            const [owner, name] = r.split("/");
            const count = releaseCounts[r] ?? 0;
            return (
              <li key={r} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://github.com/${owner}.png?size=64`} alt="" width={28} height={28} className="h-7 w-7 rounded-md bg-zinc-800" loading="lazy" />
                <a href={`https://github.com/${r}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm text-zinc-200 hover:underline">
                  <span className="text-zinc-500">{owner}/</span>
                  {name}
                </a>
                {hasDigest && (
                  <span className={`rounded-full px-2 py-0.5 text-xs ${count > 0 ? "bg-zinc-800 text-zinc-200" : "text-zinc-600"}`}>
                    {count} {count === 1 ? "release" : "releases"}
                  </span>
                )}
                <button
                  onClick={() => onChange(repos.filter((x) => x !== r))}
                  aria-label={`Remove ${r}`}
                  className="rounded-md p-1.5 text-zinc-500 opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
          {repos.length === 0 && <li className="px-3 py-8 text-center text-sm text-zinc-500">No repositories tracked.</li>}
        </ul>

        <div className="border-t border-zinc-800 px-5 py-3">
          <button
            onClick={() => onChange(DEFAULT_REPOS)}
            className="flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            <RotateCcw size={14} /> Reset to suggested defaults
          </button>
        </div>
      </aside>
    </div>
  );
}
