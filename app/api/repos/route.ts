import { NextResponse } from "next/server";
import { getRepos, setRepos, storageMode } from "@/lib/store";
import { isValidRepo } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: the saved tracked repos. `storage: "local"` tells the client Supabase isn't configured. */
export async function GET() {
  try {
    const repos = await getRepos();
    return NextResponse.json({ storage: storageMode(), repos });
  } catch (err) {
    console.error("[repos] load failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not load saved repositories." }, { status: 502 });
  }
}

/** PUT { repos: string[] }: replaces the saved list. */
export async function PUT(req: Request) {
  let body: { repos?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  if (!Array.isArray(body.repos) || !body.repos.every(isValidRepo)) {
    return NextResponse.json({ error: "`repos` must be an array of owner/name strings." }, { status: 400 });
  }
  try {
    await setRepos(body.repos);
    return NextResponse.json({ ok: true, storage: storageMode() });
  } catch (err) {
    console.error("[repos] save failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not save repositories." }, { status: 502 });
  }
}
