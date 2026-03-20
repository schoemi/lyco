import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authorize } from "@/lib/services/auth-service";
import { authConfig } from "@/lib/auth.config";
import { logAudit, LOGIN_SUCCESS, LOGIN_FAILED } from "@/lib/services/log-service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          return null;
        }

        const user = await authorize(email, password);
        if (!user) {
          // Fire-and-forget: log failed login attempt
          logAudit({
            action: LOGIN_FAILED,
            details: { email },
          });
          return null;
        }

        // Fire-and-forget: log successful login
        logAudit({
          action: LOGIN_SUCCESS,
          actorId: user.id,
          targetEntity: "User",
          targetId: user.id,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountStatus: user.accountStatus,
        };
      },
    }),
  ],
});
