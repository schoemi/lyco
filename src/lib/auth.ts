import NextAuth, { customFetch } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Authentik from "next-auth/providers/authentik";
import { authorize } from "@/lib/services/auth-service";
import { authConfig } from "@/lib/auth.config";
import { logAudit, LOGIN_SUCCESS, LOGIN_FAILED, SSO_AUTH_SUCCESS, SSO_AUTH_FAILED } from "@/lib/services/log-service";
import { prisma } from "@/lib/prisma";
import { getSsoConfig } from "@/lib/config/auth-env";
import { getSsoAutoCreateAccounts } from "@/lib/services/system-setting-service";
import type { AuthMethod } from "@/lib/types/auth-extensions";
import type { Provider } from "next-auth/providers";
import { headers } from "next/headers";

/** Token exchange timeout in milliseconds */
const SSO_TOKEN_TIMEOUT_MS = 10_000;

/**
 * Custom fetch wrapper that enforces a 10-second timeout on SSO token exchange requests.
 */
const fetchWithTimeout: typeof fetch = (input, init) => {
  return fetch(input, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(SSO_TOKEN_TIMEOUT_MS),
  });
};

/**
 * Extract client IP address from a Request object's headers.
 */
function getIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "unknown";
}

/**
 * Extract client IP address from Next.js headers() context.
 */
async function getIpFromHeaders(): Promise<string> {
  try {
    const hdrs = await headers();
    const forwarded = hdrs.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    const realIp = hdrs.get("x-real-ip");
    if (realIp) {
      return realIp.trim();
    }
  } catch {
    // headers() may not be available in all contexts
  }
  return "unknown";
}

/**
 * Build the list of auth providers. The OIDC provider for Authentik
 * is only added when all SSO environment variables are configured.
 */
function buildProviders(): Provider[] {
  const providers: Provider[] = [];

  // Credentials provider is always available
  providers.push(
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
        rememberMe: { label: "Angemeldet bleiben", type: "text" },
      },
      authorize: async (credentials, request) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const rememberMeRaw = credentials?.rememberMe as string | undefined;

        if (!email || !password) {
          return null;
        }

        const ip = getIpFromRequest(request);
        const user = await authorize(email, password);
        if (!user) {
          // Fire-and-forget: log failed login attempt
          logAudit({
            action: LOGIN_FAILED,
            details: { email, method: "credentials" },
            ipAddress: ip,
          });
          return null;
        }

        // Fire-and-forget: log successful login
        logAudit({
          action: LOGIN_SUCCESS,
          actorId: user.id,
          targetEntity: "User",
          targetId: user.id,
          details: { method: "credentials" },
          ipAddress: ip,
        });

        // Parse rememberMe flag (passed as string "true"/"false" from the form)
        const rememberMe = rememberMeRaw === "true";

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountStatus: user.accountStatus,
          rememberMe,
          authMethod: "credentials" as AuthMethod,
        };
      },
    })
  );

  // Conditionally add Authentik OIDC provider when SSO is configured
  const ssoConfig = getSsoConfig();
  if (ssoConfig) {
    providers.push(
      Authentik({
        clientId: ssoConfig.clientId,
        clientSecret: ssoConfig.clientSecret,
        issuer: ssoConfig.issuerUrl,
        authorization: {
          params: {
            scope: "openid email profile",
          },
        },
        checks: ["pkce", "state"],
        [customFetch]: fetchWithTimeout,
      })
    );
  }

  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: buildProviders(),
  callbacks: {
    ...authConfig.callbacks,
    signIn: async ({ user, account, profile }) => {
      // Only handle OIDC sign-in from Authentik provider
      if (account?.provider !== "authentik") {
        return true;
      }

      // Get IP address from request headers context
      const ip = await getIpFromHeaders();

      try {
        // Extract email from the profile (ID token claims)
        const email = profile?.email as string | undefined;
        if (!email) {
          logAudit({
            action: SSO_AUTH_FAILED,
            details: { method: "sso", provider: "authentik", reason: "no-email" },
            ipAddress: ip,
          });
          return "/login?error=sso-failed";
        }

        // Look up existing user by email
        const existingUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, accountStatus: true, name: true, role: true },
        });

        if (existingUser) {
          // Check account status
          if (existingUser.accountStatus === "SUSPENDED") {
            logAudit({
              action: SSO_AUTH_FAILED,
              actorId: existingUser.id,
              details: { method: "sso", provider: "authentik", email, reason: "suspended" },
              ipAddress: ip,
            });
            return "/login?error=suspended";
          }
          if (existingUser.accountStatus === "PENDING") {
            logAudit({
              action: SSO_AUTH_FAILED,
              actorId: existingUser.id,
              details: { method: "sso", provider: "authentik", email, reason: "pending" },
              ipAddress: ip,
            });
            return "/login?error=pending";
          }

          // Account is ACTIVE — link via SsoAccount record (upsert to avoid duplicates)
          const providerAccountId = (account.providerAccountId ?? profile?.sub) as string;
          if (providerAccountId) {
            await prisma.ssoAccount.upsert({
              where: {
                provider_providerAccountId: {
                  provider: "authentik",
                  providerAccountId,
                },
              },
              update: { userId: existingUser.id },
              create: {
                userId: existingUser.id,
                provider: "authentik",
                providerAccountId,
              },
            });
          }

          // Populate user object for JWT callback
          user.id = existingUser.id;
          (user as unknown as Record<string, unknown>).role = existingUser.role;
          (user as unknown as Record<string, unknown>).accountStatus = existingUser.accountStatus;
          (user as unknown as Record<string, unknown>).authMethod = "sso" as AuthMethod;

          // Log successful SSO login
          logAudit({
            action: SSO_AUTH_SUCCESS,
            actorId: existingUser.id,
            targetEntity: "User",
            targetId: existingUser.id,
            details: { method: "sso", provider: "authentik" },
            ipAddress: ip,
          });

          return true;
        }

        // No existing account — check auto-create setting
        const autoCreate = await getSsoAutoCreateAccounts();
        if (!autoCreate) {
          logAudit({
            action: SSO_AUTH_FAILED,
            details: { method: "sso", provider: "authentik", email, reason: "no-account" },
            ipAddress: ip,
          });
          return "/login?error=no-account";
        }

        // Auto-create enabled: create new User + SsoAccount
        const providerAccountId = (account.providerAccountId ?? profile?.sub) as string;
        const displayName = (profile?.name as string) || (profile?.preferred_username as string) || email.split("@")[0];

        const newUser = await prisma.user.create({
          data: {
            email,
            name: displayName,
            passwordHash: "", // SSO users don't have a local password
            role: "USER",
            accountStatus: "ACTIVE",
          },
        });

        // Create SsoAccount link
        if (providerAccountId) {
          await prisma.ssoAccount.create({
            data: {
              userId: newUser.id,
              provider: "authentik",
              providerAccountId,
            },
          });
        }

        // Populate user object for JWT callback
        user.id = newUser.id;
        (user as unknown as Record<string, unknown>).role = newUser.role;
        (user as unknown as Record<string, unknown>).accountStatus = newUser.accountStatus;
        (user as unknown as Record<string, unknown>).authMethod = "sso" as AuthMethod;

        // Log successful SSO login with account creation
        logAudit({
          action: SSO_AUTH_SUCCESS,
          actorId: newUser.id,
          targetEntity: "User",
          targetId: newUser.id,
          details: { method: "sso", provider: "authentik", autoCreated: true },
          ipAddress: ip,
        });

        return true;
      } catch (error) {
        // Distinguish timeout errors from other SSO failures
        const isTimeout =
          error instanceof Error &&
          (error.name === "TimeoutError" ||
            error.name === "AbortError" ||
            error.message.includes("timeout") ||
            error.message.includes("aborted"));

        logAudit({
          action: SSO_AUTH_FAILED,
          details: {
            method: "sso",
            provider: "authentik",
            reason: isTimeout ? "timeout" : "sso-error",
            error: error instanceof Error ? error.message : String(error),
          },
          ipAddress: ip,
        });

        return isTimeout ? "/login?error=sso-timeout" : "/login?error=sso-failed";
      }
    },
    jwt: async ({ token, user, trigger }) => {
      // Delegate to the base config's jwt callback first
      const baseJwt = authConfig.callbacks?.jwt;
      if (baseJwt) {
        const result = await baseJwt({ token, user, trigger } as Parameters<typeof baseJwt>[0]);
        if (result) token = result;
      }

      // On subsequent requests (not initial sign-in), check the database
      // for current account status. The token may have stale data if an
      // admin suspended the account after the user logged in.
      if (!user && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { accountStatus: true },
        });

        if (dbUser) {
          token.accountStatus = dbUser.accountStatus;
        }
      }

      return token;
    },
  },
});
