import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getThemeConfig, getUserThemeConfig } from "@/lib/services/theme-service";

/**
 * Public GET endpoint – returns the current theme config.
 * If the user is logged in and has a theme preference, returns their
 * selected theme/variant. Otherwise falls back to the default theme
 * (light variant).
 *
 * No authentication required – unauthenticated users simply get the default.
 *
 * Anforderungen: 6.4, 6.5, 7.4, 7.5
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();

    if (session?.user?.id) {
      const config = await getUserThemeConfig(session.user.id);
      return NextResponse.json(config);
    }

    // Not logged in – fall back to default theme light variant
    const config = await getThemeConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("GET /api/theme error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
