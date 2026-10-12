import { AlertTriangle } from "lucide-react";
import type { DigestItem } from "@/lib/types";
import { cardId } from "@/lib/format";

export default function TopAlertBanner({ items }: { items: DigestItem[] }) {
  const urgent = items.filter((i) => i.urgency !== "ROUTINE_UPDATE");
  if (urgent.length === 0) return null;
  const hasCritical = urgent.some((i) => i.urgency === "CRITICAL_SECURITY");

  return (
    <div
      role="alert"
      className={`mb-6 rounded-xl border p-4 ${
        hasCritical
          ? "border-rose-500/30 bg-gradient-to-r from-rose-500/10 to-transparent shadow-[0_0_40px_-12px_rgba(244,63,94,0.4)]"
          : "border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${hasCritical ? "bg-rose-500/15 text-rose-400" : "bg-amber-500/15 text-amber-400"}`}>
          <AlertTriangle size={18} />
        </div>
        <h2 className="text-base font-semibold text-zinc-50">
          {urgent.length} {urgent.length === 1 ? "item requires" : "items require"} immediate team review
        </h2>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {urgent.map((i) => (
          <a
            key={cardId(i.repo, i.tagName)}
            href={`#${cardId(i.repo, i.tagName)}`}
            className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
              i.urgency === "CRITICAL_SECURITY"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            }`}
          >
            {i.repo.split("/")[1]} {i.tagName}
          </a>
        ))}
      </div>
    </div>
  );
}
