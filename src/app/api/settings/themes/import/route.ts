import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  validateThemeJson,
  deserializeThemeJson,
  serializeTheme,
} from "@/lib/theme/serializer";

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

/**
 * POST /api/settings/themes/import
 * Imports a theme from Theme_JSON format.
 *
 * Anforderungen: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export async function POST(request: NextRequest) {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    let body: string;
    try {
      body = await request.text();
    } catch {
      return NextResponse.json(
        { error: "Ungültiger Request-Body" },
        { status: 400 }
      );
    }

    // Validate the Theme_JSON structure
    const validation = validateThemeJson(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Ungültiges Theme-JSON", details: validation.errors },
        { status: 400 }
      );
    }

    // Deserialize into theme configs
    let deserialized: ReturnType<typeof deserializeThemeJson>;
    try {
      deserialized = deserializeThemeJson(body);
    } catch {
      return NextResponse.json(
        { error: "Theme-JSON konnte nicht deserialisiert werden" },
        { status: 400 }
      );
    }

    const { name, lightConfig, darkConfig } = deserialized;

    // Check for name collision
    const existing = await prisma.theme.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Theme-Name existiert bereits" },
        { status: 409 }
      );
    }

    // Create the new theme
    const theme = await prisma.theme.create({
      data: {
        name,
        lightConfig: serializeTheme(lightConfig),
        darkConfig: serializeTheme(darkConfig),
        isDefault: false,
      },
    });

    return NextResponse.json(theme, { status: 201 });
  } catch (error) {
    console.error("POST /api/settings/themes/import error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
