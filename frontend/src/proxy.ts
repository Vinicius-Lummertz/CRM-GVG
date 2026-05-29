import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "crm_session";

export function proxy(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;

  const isPublicEntry = pathname === "/" || pathname === "/otp";
  const isAppArea = pathname.startsWith("/app");

  if (hasSession && isPublicEntry) {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  if (!hasSession && isAppArea) {
    return NextResponse.redirect(new URL("/otp", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/otp", "/app/:path*"],
};
