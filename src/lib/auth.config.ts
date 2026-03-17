import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config — no Node.js-only imports (bcrypt, pg, prisma).
 * Used by the middleware for JWT session checks.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [], // Credentials provider added in auth.ts (Node.js only)
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
    updateAge: 60 * 5,
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: "ADMIN" | "USER" }).role;
        token.accountStatus = (user as { accountStatus: string }).accountStatus;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
        (session.user as { accountStatus: string }).accountStatus = token.accountStatus as string;
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
  },
};
