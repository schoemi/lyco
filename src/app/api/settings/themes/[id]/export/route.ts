import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getThemeById } from "@/lib/services/theme-service";
import { deserializeTheme } from "@/lib/theme/serializer";
import { prettyPrintTheme } from "@/lib/theme/pretty-printer";

async function getAdminSession() {
  const session = await auth();
  if (!session?.user) {
    return {
      error: NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      ),
    };
  }
  if (session.user.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      ),
    };
  }
  return { session };
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/settings/themes/[id]/export
 * Exports a theme as formatted Theme_JSON with semantic descriptions.
 *
 * Anforderungen: 8.1, 8.2, 8.5
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    const { id } = await context.params;
    const theme = await getThemeById(id);

    if (!theme) {
      return NextResponse.json(
        { error: "Theme nicht gefunden" },
        { status: 404 }
      );
    }

    const lightConfig = deserializeTheme(theme.lightConfig);
    const darkConfig = deserializeTheme(theme.darkConfig);

    const json = prettyPrintTheme({
      name: theme.name,
      lightConfig,
      darkConfig,
    });

    const filename = `${theme.name.replace(/\s+/g, "_")}.theme.json`;

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/settings/themes/[id]/export error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
