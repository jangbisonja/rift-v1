import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * POST /api/auth/discord/logout
 *
 * Forwards the logout request to the backend (which clears the server-side
 * session state), then clears the user_token HTTP-only cookie in the browser.
 *
 * RULES.md #A1: session lives in HTTP-only cookie, never localStorage.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const userToken = cookieStore.get("user_token")?.value;

  // Forward to backend — best effort; clear cookie regardless of backend result
  try {
    await fetch(`${BASE_URL}/auth/discord/logout`, {
      method: "POST",
      headers: userToken ? { Cookie: `user_token=${userToken}` } : {},
    });
  } catch {
    // Backend unreachable — still clear the cookie on the client side
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("user_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
