import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_TOKEN } from "@/lib/auth";

export function middleware(req: NextRequest) {
  if (req.cookies.get(SESSION_COOKIE)?.value === SESSION_TOKEN) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = "?signin=1";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/dashboard/:path*", "/api/digest", "/api/github/:path*"] };
