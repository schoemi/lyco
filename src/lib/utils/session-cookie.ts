import { cookies } from "next/headers";

/**
 * Default session token cookie name used by NextAuth v5.
 * In production with HTTPS, NextAuth prefixes with __Secure-.
 */
function getSessionCookieName(): string {
  const useSecurePrefix =
    process.env.AUTH_COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production";
  return useSecurePrefix
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

/**
 * Fully removes the session cookie. Use this for admin-action session
 * invalidation or any scenario where the session must be forcibly ended
 * server-side.
 *
 * Note: For normal user-initiated logout, use NextAuth's signOut() which
 * handles cookie removal automatically.
 */
export async function removeSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const cookieName = getSessionCookieName();

  cookieStore.set(cookieName, "", {
    httpOnly: true,
    secure: process.env.AUTH_COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export { getSessionCookieName };
