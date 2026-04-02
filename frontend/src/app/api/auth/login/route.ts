import { NextRequest, NextResponse } from "next/server";
import { loginBackend } from "@/lib/api/client";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  try {
    const data = await loginBackend(body.username, body.password);

    const response = NextResponse.json({ ok: true });
    response.cookies.set("token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
