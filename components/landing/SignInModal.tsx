"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertOctagon, Loader2, ShieldCheck, X, Zap } from "lucide-react";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/auth";

interface Props {
  open: boolean;
  onClose: () => void;
  /** prefill the demo password (used by the "Launch Keerthi's Workspace" CTA) */
  prefillPassword?: boolean;
}

export default function SignInModal({ open, onClose, prefillPassword }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPassword(prefillPassword ? DEMO_PASSWORD : "");
    setError(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, prefillPassword, onClose]);

  async function signIn(pw: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Sign-in failed. Try again.");
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Try again.");
      setBusy(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-title"
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/95 p-6 shadow-2xl shadow-black/60"
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100">
          <X size={16} />
        </button>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 id="signin-title" className="text-base font-semibold text-zinc-50">
              Sift Security Gateway
            </h2>
            <p className="text-xs text-zinc-400">Enter enterprise credentials to access tracked repository digests.</p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-sm text-rose-300">
            <AlertOctagon size={15} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            signIn(password);
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-300">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-500/60"
            />
          </label>
          <label className="block">
            <span className="mb-1 flex items-center justify-between text-xs font-medium text-zinc-300">
              Password
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-normal text-cyan-300">
                Demo test password: {DEMO_PASSWORD}
              </span>
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              autoFocus={!prefillPassword}
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-500/60"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="animate-spin" />} Sign in
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-widest text-zinc-600">
          <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
        </div>
        <button
          onClick={() => {
            setPassword(DEMO_PASSWORD);
            signIn(DEMO_PASSWORD);
          }}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-60"
        >
          <Zap size={14} /> Quick Demo Sign-In
        </button>
      </div>
    </div>
  );
}
