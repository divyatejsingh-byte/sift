import type { DigestItem } from "./types";

const HEAD = {
  CRITICAL_SECURITY: { emoji: "🚨", label: "CRITICAL", verb: "released with a security fix" },
  BREAKING_CHANGE: { emoji: "⚠️", label: "BREAKING", verb: "released with breaking changes" },
  ROUTINE_UPDATE: { emoji: "📦", label: "ROUTINE", verb: "released" },
} as const;

/** Convert our **bold** markup to Slack's *bold*. Slack mrkdwn also supports `code`. */
const toSlack = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, "*$1*");

export function toSlackMarkdown(item: DigestItem): string {
  const h = HEAD[item.urgency];
  const lines = [`${h.emoji} *[${h.label}] ${item.repo} ${item.tagName}* ${h.verb}.`];
  if (item.actionRequired && item.actionReason) lines.push(`*Action:* ${toSlack(item.actionReason)}`);
  if (item.advisories?.length)
    lines.push(`*Advisories:* ${item.advisories.map((a) => `${a.id} (${a.severity})`).join(", ")}`);
  lines.push(`*Summary:*`, ...item.summary.map((s) => `• ${toSlack(s)}`));
  lines.push(`<${item.url}|View release>`);
  return lines.join("\n");
}
