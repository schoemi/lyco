import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Öffentliche Routen – kein Auth nötig
const publicRoutes = ["/login", "/register", "/setup"];
const publicApiPrefixes = ["/api/auth/", "/api/setup"];

// Admin-Routen – Auth + Admin-Rolle nötig
const adminPagePrefix = "/admin";
const adminApiPrefixes = ["/api/users", "/api/admin", "/api/settings", "/api/server-errors", "/api/audit-log"];

function isPublicRoute(pathname: string): boolean {
  if (publicRoutes.includes(pathname)) return true;
  return publicApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isAdminRoute(pathname: string): boolean {
  if (pathname.startsWith(adminPagePrefix)) return true;
  return adminApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

// CORS-Hilfsfunktionen (Finding 9)
function getAllowedOrigin(): string {
  return (
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  );
}

function addCorsHeaders(
  response: NextResponse,
  origin: string | null
): NextResponse {
  const allowedOrigin = getAllowedOrigin();

  if (origin && origin === allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }

  return response;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");

  // OPTIONS-Preflight für API-Routen sofort beantworten (CORS)
  if (req.method === "OPTIONS" && isApiRoute(pathname)) {
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response, origin);
  }

  // Öffentliche Routen durchlassen
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const session = req.auth;

  // Keine Session → Redirect auf /login (Seiten) oder 401 (API)
  if (!session) {
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", req.url);

    // Prüfen ob ein Session-Cookie vorhanden ist (abgelaufene Session)
    const hasSessionCookie =
      req.cookies.has("authjs.session-token") ||
      req.cookies.has("__Secure-authjs.session-token");

    if (hasSessionCookie) {
      loginUrl.searchParams.set("expired", "true");
    }

    return NextResponse.redirect(loginUrl);
  }

  // Kontostatus prüfen – bei nicht-aktivem Konto Session beenden (Anforderung 3.4)
  const accountStatus = session.user?.accountStatus;
  if (accountStatus && accountStatus !== "ACTIVE") {
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", req.url);
    const response = NextResponse.redirect(loginUrl);

    // Session-Cookies löschen, um die Session zu invalidieren
    response.cookies.delete("authjs.session-token");
    response.cookies.delete("__Secure-authjs.session-token");

    return response;
  }

  // Admin-Routen: Rolle prüfen
  if (isAdminRoute(pathname)) {
    const role = session.user?.role;
    if (role !== "ADMIN") {
      if (isApiRoute(pathname)) {
        return NextResponse.json(
          { error: "Zugriff verweigert" },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }
  }

  // CORS-Header für API-Responses setzen
  const response = NextResponse.next();
  if (isApiRoute(pathname)) {
    addCorsHeaders(response, origin);
  }
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
