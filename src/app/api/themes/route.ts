import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllThemes } from "@/lib/services/theme-service";

/**
 * Public GET endpoint – returns all available themes for theme selection.
 * Requires authentication but not admin role.
 * Returns id, name, isDefault, and lightConfig (for color preview).
 *
 * Anforderungen: 6.1, 6.2
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const themes = await getAllThemes();

    // Return only the fields needed for the theme selector
    const result = themes.map((t) => ({
      id: t.id,
      name: t.name,
      isDefault: t.isDefault,
      lightConfig: t.lightConfig,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/themes error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
