import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getThemeById,
  updateTheme,
  deleteTheme,
  setDefaultTheme,
} from "@/lib/services/theme-service";

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

    return NextResponse.json(theme);
  } catch (error) {
    console.error("GET /api/settings/themes/[id] error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    const { id } = await context.params;
    const body = await request.json();

    // Support setDefaultTheme via isDefault flag
    if (body.isDefault === true) {
      await setDefaultTheme(id);
      const updated = await getThemeById(id);
      return NextResponse.json(updated);
    }

    const { name, lightConfig, darkConfig } = body;
    const theme = await updateTheme(id, { name, lightConfig, darkConfig });
    return NextResponse.json(theme);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Theme-Name existiert bereits") {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message === "Theme nicht gefunden") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (
        error.message.includes("Theme-Name darf nicht leer sein") ||
        error.message.includes("Theme-Name darf maximal")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("PUT /api/settings/themes/[id] error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    const { id } = await context.params;
    await deleteTheme(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Standard-Theme kann nicht gelöscht werden") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message === "Theme nicht gefunden") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    console.error("DELETE /api/settings/themes/[id] error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
