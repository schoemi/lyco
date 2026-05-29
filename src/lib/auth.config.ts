import type { NextAuthConfig } from "next-auth";
import type { AuthMethod } from "@/lib/types/auth-extensions";

/** 24 hours in seconds */
const SESSION_MAX_AGE_DEFAULT = 24 * 60 * 60;

/** 30 days in seconds */
const SESSION_MAX_AGE_REMEMBER_ME = 30 * 24 * 60 * 60;

/**
 * Edge-compatible auth config — no Node.js-only imports (bcrypt, pg, prisma).
 * Used by the middleware for JWT session checks.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [], // Credentials provider added in auth.ts (Node.js only)
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_DEFAULT,
    updateAge: 60,
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      // Initial sign-in: populate token from user object
      if (user) {
        token.id = user.id;
        token.role = (user as { role: "ADMIN" | "USER" }).role;
        token.accountStatus = (user as { accountStatus: string }).accountStatus;
        token.authMethod = ((user as { authMethod?: AuthMethod }).authMethod ?? "credentials") as AuthMethod;

        const rememberMe = (user as { rememberMe?: boolean }).rememberMe ?? false;
        token.rememberMe = rememberMe;

        // Set expiry based on rememberMe flag
        const now = Math.floor(Date.now() / 1000);
        if (rememberMe) {
          token.exp = now + SESSION_MAX_AGE_REMEMBER_ME;
        } else {
          token.exp = now + SESSION_MAX_AGE_DEFAULT;
        }
      }

      // Rolling session: on subsequent requests with remember-me, extend expiry
      if (!user && token.rememberMe === true) {
        const now = Math.floor(Date.now() / 1000);
        token.exp = now + SESSION_MAX_AGE_REMEMBER_ME;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
        (session.user as { accountStatus: string }).accountStatus = token.accountStatus as string;
        (session.user as { authMethod: string }).authMethod = (token.authMethod as string) ?? "credentials";
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        secure: process.env.AUTH_COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

export { SESSION_MAX_AGE_DEFAULT, SESSION_MAX_AGE_REMEMBER_ME };
