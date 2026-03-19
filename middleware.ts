import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Öffentliche Routen – kein Auth nötig
const publicRoutes = ["/login", "/register", "/setup"];
const publicApiPrefixes = ["/api/auth/", "/api/setup", "/api/uploads/"];

// Admin-Routen – Auth + Admin-Rolle nötig
const adminPagePrefix = "/admin";
const adminApiPrefix = "/api/users";

function isPublicRoute(pathname: string): boolean {
  if (publicRoutes.includes(pathname)) return true;
  return publicApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isAdminRoute(pathname: string): boolean {
  return (
    pathname.startsWith(adminPagePrefix) ||
    pathname.startsWith(adminApiPrefix)
  );
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

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

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
