"use client";

import { useMemo } from "react";
import { BarChart3, ShieldAlert, AlertTriangle, Package, X } from "lucide-react";
import type { DigestItem, Urgency } from "@/lib/types";
import { CATEGORIES, categoryForRepo } from "@/lib/categories";

interface Props {
  items: DigestItem[];
  focus: Urgency | null;
  onFocus: (u: Urgency | null) => void;
}

/** Urgency is a status: each level carries a label, a count and an icon, never colour alone. */
const LEVELS: { key: Urgency; label: string; hint: string; color: string; icon: typeof Package }[] = [
  { key: "CRITICAL_SECURITY", label: "Requires immediate attention", hint: "Security patches & CVEs", color: "#f43f5e", icon: ShieldAlert },
  { key: "BREAKING_CHANGE", label: "Plan this sprint", hint: "Breaking changes", color: "#f59e0b", icon: AlertTriangle },
  { key: "ROUTINE_UPDATE", label: "Routine / FYI", hint: "Safe to read later", color: "#10b981", icon: Package },
];
const SEV_ORDER = ["CRITICAL", "HIGH", "MODERATE", "LOW", "UNKNOWN"] as const;

type Counts = Record<Urgency, number>;
const zero = (): Counts => ({ CRITICAL_SECURITY: 0, BREAKING_CHANGE: 0, ROUTINE_UPDATE: 0 });

/** Horizontal stacked bar: thin marks, 2px gaps between segments, rounded data-end, native hover tooltips. */
function StackedBar({ label, counts, max, onFocus, focus }: { label: string; counts: Counts; max: number; onFocus: Props["onFocus"]; focus: Urgency | null }) {
  const total = counts.CRITICAL_SECURITY + counts.BREAKING_CHANGE + counts.ROUTINE_UPDATE;
  return (
    <div className="grid grid-cols-[minmax(0,7.5rem)_1fr_1.5rem] items-center gap-2 text-xs">
      <span className="truncate text-zinc-300" title={label}>
        {label}
      </span>
      <div className="flex h-3 w-full items-center" role="img" aria-label={`${label}: ${LEVELS.map((l) => `${counts[l.key]} ${l.label}`).join(", ")}`}>
        <div className="flex h-3 gap-[2px]" style={{ width: `${max ? (total / max) * 100 : 0}%` }}>
          {LEVELS.map((l, idx) =>
            counts[l.key] ? (
              <button
                key={l.key}
                onClick={() => onFocus(focus === l.key ? null : l.key)}
                title={`${label} · ${l.label}: ${counts[l.key]}`}
                aria-label={`${label}, ${l.label}: ${counts[l.key]}`}
                className="h-3 min-w-[6px] transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-300"
                style={{
                  flexGrow: counts[l.key],
                  background: l.color,
                  opacity: focus && focus !== l.key ? 0.3 : 1,
                  borderRadius: idx === LEVELS.findIndex((x) => counts[x.key]) ? "4px 0 0 4px" : "0",
                }}
              />
            ) : null,
          )}
        </div>
      </div>
      <span className="text-right tabular-nums text-zinc-400">{total}</span>
    </div>
  );
}

export default function DigestCharts({ items, focus, onFocus }: Props) {
  const stats = useMemo(() => {
    const byLevel = zero();
    const byCategory = new Map<string, Counts>(CATEGORIES.map((c) => [c, zero()]));
    const byRepo = new Map<string, Counts>();
    const sev = new Map<string, number>();
    const seen = new Set<string>();
    for (const i of items) {
      byLevel[i.urgency]++;
      byCategory.get(categoryForRepo(i.repo))![i.urgency]++;
      if (!byRepo.has(i.repo)) byRepo.set(i.repo, zero());
      byRepo.get(i.repo)![i.urgency]++;
      for (const a of i.advisories ?? []) {
        if (seen.has(a.id)) continue;
        seen.add(a.id);
        sev.set(a.severity, (sev.get(a.severity) ?? 0) + 1);
      }
    }
    const weight = (c: Counts) => c.CRITICAL_SECURITY * 100 + c.BREAKING_CHANGE * 10 + c.ROUTINE_UPDATE;
    const repos = [...byRepo.entries()].sort((a, b) => weight(b[1]) - weight(a[1]));
    return { byLevel, byCategory: [...byCategory.entries()], repos, sev, advisories: seen.size };
  }, [items]);

  const total = items.length;
  if (total === 0) return null;

  // donut geometry
  const R = 52;
  const C = 2 * Math.PI * R;
  const GAP = 3;
  let offset = 0;
  const arcs = LEVELS.filter((l) => stats.byLevel[l.key] > 0).map((l) => {
    const len = (stats.byLevel[l.key] / total) * C;
    const arc = { l, dash: Math.max(len - GAP, 1), offset };
    offset += len;
    return arc;
  });

  const maxCat = Math.max(...stats.byCategory.map(([, c]) => c.CRITICAL_SECURITY + c.BREAKING_CHANGE + c.ROUTINE_UPDATE), 1);
  const topRepos = stats.repos.slice(0, 6);
  const maxRepo = Math.max(...topRepos.map(([, c]) => c.CRITICAL_SECURITY + c.BREAKING_CHANGE + c.ROUTINE_UPDATE), 1);

  return (
    <section aria-label="Release overview" className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <BarChart3 size={15} /> Overview
          <span className="font-normal text-zinc-500">· click a level to filter the feed</span>
        </h2>
        {focus && (
          <button onClick={() => onFocus(null)} className="flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-xs text-zinc-300 hover:text-zinc-50">
            Showing: {LEVELS.find((l) => l.key === focus)!.label} <X size={11} />
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* A: attention levels */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Attention levels</h3>
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0 -rotate-90" role="img" aria-label={`${total} releases: ${LEVELS.map((l) => `${stats.byLevel[l.key]} ${l.label}`).join(", ")}`}>
              <circle cx="70" cy="70" r={R} fill="none" stroke="#27272a" strokeWidth="14" />
              {arcs.map(({ l, dash, offset: off }) => (
                <circle
                  key={l.key}
                  cx="70"
                  cy="70"
                  r={R}
                  fill="none"
                  stroke={l.color}
                  strokeWidth="14"
                  strokeDasharray={`${dash} ${C - dash}`}
                  strokeDashoffset={-off}
                  opacity={focus && focus !== l.key ? 0.25 : 1}
                  className="cursor-pointer transition-opacity"
                  onClick={() => onFocus(focus === l.key ? null : l.key)}
                >
                  <title>{`${l.label}: ${stats.byLevel[l.key]}`}</title>
                </circle>
              ))}
              <g transform="rotate(90 70 70)">
                <text x="70" y="68" textAnchor="middle" className="fill-zinc-50 text-[26px] font-semibold">
                  {total}
                </text>
                <text x="70" y="86" textAnchor="middle" className="fill-zinc-500 text-[10px]">
                  releases
                </text>
              </g>
            </svg>
            <ul className="min-w-0 flex-1 space-y-1.5">
              {LEVELS.map((l) => {
                const n = stats.byLevel[l.key];
                const Icon = l.icon;
                return (
                  <li key={l.key}>
                    <button
                      onClick={() => onFocus(focus === l.key ? null : l.key)}
                      aria-pressed={focus === l.key}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-zinc-800/70 ${focus === l.key ? "bg-zinc-800" : ""}`}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: l.color }} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-1 text-xs font-medium leading-snug text-zinc-200">
                          <Icon size={11} className="mt-0.5 shrink-0" /> <span>{l.label}</span>
                        </span>
                        <span className="block truncate text-[11px] text-zinc-500">{l.hint}</span>
                      </span>
                      <span className="text-right text-sm tabular-nums text-zinc-100">
                        {n}
                        <span className="ml-1 text-[11px] text-zinc-500">{Math.round((n / total) * 100)}%</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          {stats.advisories > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-zinc-800 pt-3 text-[11px] text-zinc-500">
              {stats.advisories} verified {stats.advisories === 1 ? "advisory" : "advisories"}:
              {SEV_ORDER.filter((s) => stats.sev.get(s)).map((s) => (
                <span key={s} className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-300">
                  {stats.sev.get(s)} {s}
                </span>
              ))}
            </p>
          )}
        </div>

        {/* B: by category */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">By category</h3>
          <div className="space-y-3">
            {stats.byCategory.map(([name, counts]) => (
              <StackedBar key={name} label={name} counts={counts} max={maxCat} onFocus={onFocus} focus={focus} />
            ))}
          </div>
          <Legend />
        </div>

        {/* C: hotspots */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Hotspots by repo</h3>
          <div className="space-y-2.5">
            {topRepos.map(([repo, counts]) => (
              <StackedBar key={repo} label={repo.split("/")[1]} counts={counts} max={maxRepo} onFocus={onFocus} focus={focus} />
            ))}
          </div>
          <Legend />
        </div>
      </div>

      <details className="mt-3 text-xs text-zinc-500">
        <summary className="cursor-pointer transition-colors hover:text-zinc-300">View the chart data as a table</summary>
        <div className="mt-2 overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[420px] text-left">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-3 py-1.5 font-medium">Repo</th>
                <th className="px-3 py-1.5 font-medium">Category</th>
                {LEVELS.map((l) => (
                  <th key={l.key} className="px-3 py-1.5 text-right font-medium">
                    {l.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70 text-zinc-300">
              {stats.repos.map(([repo, c]) => (
                <tr key={repo}>
                  <td className="px-3 py-1.5">{repo}</td>
                  <td className="px-3 py-1.5 text-zinc-500">{categoryForRepo(repo)}</td>
                  {LEVELS.map((l) => (
                    <td key={l.key} className="px-3 py-1.5 text-right tabular-nums">
                      {c[l.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function Legend() {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-zinc-800 pt-3 text-[11px] text-zinc-400">
      {LEVELS.map((l) => (
        <li key={l.key} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: l.color }} aria-hidden /> {l.label}
        </li>
      ))}
    </ul>
  );
}
