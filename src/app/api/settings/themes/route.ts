import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getAllThemes,
  createTheme,
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

export async function GET() {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    const themes = await getAllThemes();
    return NextResponse.json(themes);
  } catch (error) {
    console.error("GET /api/settings/themes error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    const body = await request.json();
    const theme = await createTheme(body.name);
    return NextResponse.json(theme, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Theme-Name existiert bereits") {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (
        error.message.includes("Theme-Name darf nicht leer sein") ||
        error.message.includes("Theme-Name darf maximal")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("POST /api/settings/themes error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
