import { CheckCircle2 } from "lucide-react";
import type { DigestItem } from "@/lib/types";
import { cardId } from "@/lib/format";
import DigestCard from "./DigestCard";

interface Props {
  items: DigestItem[];
  totalItems: number;
  /** tracked repos that were checked and had no releases in the period */
  quietRepos?: string[];
}

export default function DigestFeed({ items, totalItems, quietRepos = [] }: Props) {
  if (totalItems === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 size={24} />
        </div>
        <h3 className="text-base font-semibold text-zinc-100">All clear across tracked dependencies</h3>
        <p className="mt-1 text-sm text-zinc-400">No breaking changes or patches detected in the last 7 days.</p>
      </div>
    );
  }

  return (
    <>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">No releases match these filters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <DigestCard key={cardId(item.repo, item.tagName)} item={item} />
          ))}
        </div>
      )}
      {quietRepos.length > 0 && (
        <p className="mt-6 rounded-lg border border-zinc-800/70 bg-zinc-900/30 px-3 py-2 text-xs text-zinc-500">
          <span className="text-zinc-400">No releases this week:</span> {quietRepos.join(", ")}
        </p>
      )}
    </>
  );
}
