import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Login page must be reachable without auth (no redirect loop)
  if (request.nextUrl.pathname === "/mod/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get("token");

  if (!token?.value) {
    const loginUrl = new URL("/mod/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/mod/:path*"],
};
