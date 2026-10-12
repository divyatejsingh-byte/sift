import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_REPOS, type DigestResponse } from "./types";
import { isValidRepo } from "./validation";

/** One shared workspace: the app has a single demo user for now. Swap for a user id when real auth lands. */
const WORKSPACE = "keerthi";
const KEEP_DIGESTS = 30;

export interface DigestMeta {
  id: string;
  generatedAt: string;
  itemsCount: number;
  criticalCount: number;
}

let client: SupabaseClient | null | undefined;

/** Server-only client using the service-role key. Returns null when Supabase isn't configured. */
function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return client;
}

export const storageMode = (): "supabase" | "local" => (db() ? "supabase" : "local");

/** Tracked repos; seeds the defaults the first time the workspace is empty. Null if Supabase isn't configured. */
export async function getRepos(): Promise<string[] | null> {
  const sb = db();
  if (!sb) return null;
  const { data, error } = await sb.from("tracked_repos").select("repo").eq("workspace", WORKSPACE).order("added_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (data.length === 0) {
    await setRepos(DEFAULT_REPOS);
    return DEFAULT_REPOS;
  }
  return data.map((r) => r.repo as string);
}

/** Replaces the workspace's tracked repos with `repos` (adds new ones, removes the rest). */
export async function setRepos(repos: string[]): Promise<void> {
  const sb = db();
  if (!sb) return;
  const wanted = [...new Set(repos.filter(isValidRepo))].slice(0, 50);
  const { data, error } = await sb.from("tracked_repos").select("repo").eq("workspace", WORKSPACE);
  if (error) throw new Error(error.message);
  const existing = new Set(data.map((r) => r.repo as string));
  const toAdd = wanted.filter((r) => !existing.has(r));
  const toRemove = [...existing].filter((r) => !wanted.includes(r));
  if (toAdd.length) {
    const { error: e } = await sb.from("tracked_repos").insert(toAdd.map((repo) => ({ workspace: WORKSPACE, repo })));
    if (e) throw new Error(e.message);
  }
  if (toRemove.length) {
    const { error: e } = await sb.from("tracked_repos").delete().eq("workspace", WORKSPACE).in("repo", toRemove);
    if (e) throw new Error(e.message);
  }
}

/** Saves a digest and trims history to the newest KEEP_DIGESTS. Returns the new id, or null if not configured. */
export async function saveDigest(payload: DigestResponse): Promise<string | null> {
  const sb = db();
  if (!sb) return null;
  const { data, error } = await sb
    .from("digests")
    .insert({
      workspace: WORKSPACE,
      generated_at: payload.generatedAt,
      items_count: payload.items.length,
      critical_count: payload.items.filter((i) => i.urgency === "CRITICAL_SECURITY").length,
      payload,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { data: old } = await sb
    .from("digests")
    .select("id")
    .eq("workspace", WORKSPACE)
    .order("generated_at", { ascending: false })
    .range(KEEP_DIGESTS, KEEP_DIGESTS + 200);
  if (old?.length) await sb.from("digests").delete().in("id", old.map((o) => o.id));
  return data.id as string;
}

export async function listDigests(limit = 10): Promise<DigestMeta[]> {
  const sb = db();
  if (!sb) return [];
  const { data, error } = await sb
    .from("digests")
    .select("id, generated_at, items_count, critical_count")
    .eq("workspace", WORKSPACE)
    .order("generated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data.map((d) => ({ id: d.id, generatedAt: d.generated_at, itemsCount: d.items_count, criticalCount: d.critical_count }));
}

/** A specific digest by id, or the newest one when id is omitted. */
export async function getDigest(id?: string): Promise<DigestResponse | null> {
  const sb = db();
  if (!sb) return null;
  let q = sb.from("digests").select("id, payload").eq("workspace", WORKSPACE);
  q = id ? q.eq("id", id) : q.order("generated_at", { ascending: false }).limit(1);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { ...(data.payload as DigestResponse), id: data.id as string } : null;
}
