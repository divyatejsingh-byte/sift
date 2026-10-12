"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { DigestItem } from "@/lib/types";
import { toSlackMarkdown } from "@/lib/slack";

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function CopyButton({ item, prominent, iconOnly }: { item: DigestItem; prominent?: boolean; iconOnly?: boolean }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    const ok = await writeClipboard(toSlackMarkdown(item));
    setState(ok ? "copied" : "failed");
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      onClick={copy}
      aria-label="Copy Slack Summary"
      title="Copy Slack Summary"
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
        state === "copied"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : prominent
            ? "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
      }`}
    >
      {state === "copied" ? <Check size={12} /> : <Copy size={12} />}
      {iconOnly ? (state === "copied" ? "Copied" : state === "failed" ? "Failed" : "") : state === "copied" ? "Copied!" : state === "failed" ? "Copy failed" : "Copy Slack Markdown"}
    </button>
  );
}
