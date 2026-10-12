import { NextResponse } from "next/server";
import { getDigest, listDigests } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/digests            -> history list (newest first)
 * GET /api/digests?latest=1   -> newest saved digest
 * GET /api/digests?id=<uuid>  -> one saved digest
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  try {
    if (searchParams.get("latest") === "1") return NextResponse.json({ digest: await getDigest() });
    const id = searchParams.get("id");
    if (id) {
      if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid digest id." }, { status: 400 });
      const digest = await getDigest(id);
      return digest ? NextResponse.json({ digest }) : NextResponse.json({ error: "Digest not found." }, { status: 404 });
    }
    return NextResponse.json({ digests: await listDigests(10) });
  } catch (err) {
    console.error("[digests] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not load digest history." }, { status: 502 });
  }
}
