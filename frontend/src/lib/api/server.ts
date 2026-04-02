/**
 * Server-side helper: extract the JWT token from the request cookie header.
 * Use this in Server Components and layouts that need to make authenticated API calls.
 */
import { cookies } from "next/headers";

export async function getServerToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("token")?.value;
}
