import { ExternalLink, ChevronRight, ShieldAlert, AlertTriangle, Package, Zap } from "lucide-react";
import type { ReactNode } from "react";
import type { DigestItem, Urgency } from "@/lib/types";
import { cardId, relativeDate } from "@/lib/format";
import { categoryForRepo } from "@/lib/categories";
import CopyButton from "./CopyButton";

const URGENCY: Record<Urgency, { label: string; badge: string; icon: typeof Package; callout: string }> = {
  CRITICAL_SECURITY: {
    label: "Critical security",
    badge: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
    icon: ShieldAlert,
    callout: "bg-rose-950/30 border border-rose-800/40 text-rose-300",
  },
  BREAKING_CHANGE: {
    label: "Breaking change",
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
    icon: AlertTriangle,
    callout: "bg-amber-950/30 border border-amber-800/40 text-amber-300",
  },
  ROUTINE_UPDATE: {
    label: "Routine update",
    badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
    icon: Package,
    callout: "",
  },
};

const SEV_STYLE: Record<string, string> = {
  CRITICAL: "border-rose-500/40 bg-rose-500/15 text-rose-300",
  HIGH: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  MODERATE: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  LOW: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  UNKNOWN: "border-zinc-700 bg-zinc-800 text-zinc-300",
};

/** Renders **bold**, `code` and bare CVE ids with emphasis. Plain React nodes only — no HTML injection. */
function renderRich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|CVE-\d{4}-\d+)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return (
        <strong key={i} className="font-semibold text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return (
        <code key={i} className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[0.8em] text-zinc-200">
          {part.slice(1, -1)}
        </code>
      );
    if (/^CVE-\d{4}-\d+$/.test(part))
      return (
        <strong key={i} className="font-mono font-semibold text-rose-300">
          {part}
        </strong>
      );
    return part;
  });
}

export default function DigestCard({ item }: { item: DigestItem }) {
  const u = URGENCY[item.urgency];
  const Icon = u.icon;
  return (
    <article
      id={cardId(item.repo, item.tagName)}
      className="flex h-full scroll-mt-24 flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition-all hover:border-zinc-700 hover:shadow-lg hover:shadow-black/40"
    >
      <div>
        <header className="mb-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${u.badge}`}>
              <Icon size={12} /> {u.label}
            </span>
            <time dateTime={item.publishedAt} title={new Date(item.publishedAt).toLocaleString()} className="shrink-0 text-xs text-zinc-500">
              {relativeDate(item.publishedAt)}
            </time>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold text-zinc-50">
              <span className="truncate">{item.repo}</span>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${item.repo} ${item.tagName} on GitHub`}
                className="shrink-0 text-zinc-500 transition-colors hover:text-zinc-200"
              >
                <ExternalLink size={13} />
              </a>
            </h3>
            <span className="rounded-md border border-zinc-700 bg-zinc-800/60 px-1.5 py-0.5 font-mono text-xs text-zinc-300">{item.tagName}</span>
            <span className="text-xs text-zinc-600">{categoryForRepo(item.repo)}</span>
          </div>
        </header>

        {item.actionRequired && item.actionReason && u.callout && (
          <div className={`mb-3 flex items-start gap-1.5 rounded-lg p-2.5 text-xs ${u.callout}`}>
            <Zap size={13} className="mt-px shrink-0" />
            <span>
              <span className="font-semibold">Action required:</span> {item.actionReason}
            </span>
          </div>
        )}

        {item.advisories && item.advisories.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {item.advisories.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`${a.summary ?? a.id} — ${a.kind === "affects" ? "affects this version" : "fixed in this release"} (verified via OSV.dev)`}
                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] transition-opacity hover:opacity-80 ${SEV_STYLE[a.severity]}`}
              >
                {a.id} · {a.severity}
                <span className="font-sans text-[10px] opacity-70">{a.kind === "affects" ? "affects" : "fixed"}</span>
              </a>
            ))}
          </div>
        )}

        <ul className="space-y-1.5 text-sm text-zinc-300">
          {item.summary.map((s, i) => (
            <li key={i} className="flex gap-1.5">
              <ChevronRight size={14} className="mt-1 shrink-0 text-zinc-600" />
              <span>{renderRich(s)}</span>
            </li>
          ))}
        </ul>
        {item.fallback && <p className="mt-3 text-xs text-zinc-600">Raw excerpt — AI summary unavailable.</p>}
      </div>

      <footer className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-800/70 pt-3">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-50"
        >
          View Release on GitHub <ExternalLink size={12} />
        </a>
        <CopyButton item={item} iconOnly prominent={item.urgency !== "ROUTINE_UPDATE"} />
      </footer>
    </article>
  );
}
