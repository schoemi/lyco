import { NextResponse } from "next/server";
import { getThemeConfig } from "@/lib/services/theme-service";

/**
 * Public GET endpoint – returns the current theme config for all users.
 * No authentication required since the theme must be applied globally.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
