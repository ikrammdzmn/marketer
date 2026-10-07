import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "../auth.config";

const { auth } = NextAuth(authConfig);

function isPublicPath(path: string): boolean {
  return path === "/sign-in" ||
    path === "/api/health" ||
    path === "/api/auth" || path.startsWith("/api/auth/") ||
    path === "/api/tg-webhook" ||
    path === "/api/tg-probe" ||
    path === "/api/campaigns/sync" ||
    path === "/api/cron" || path.startsWith("/api/cron/");
}

export default auth((request) => {
  const path = request.nextUrl.pathname;
  if (isPublicPath(path)) return NextResponse.next();

  if (request.auth?.user?.email) return NextResponse.next();

  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("callbackUrl", request.nextUrl.href);
  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
