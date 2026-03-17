import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getThemeConfig,
  saveThemeConfig,
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

    const config = await getThemeConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("GET /api/settings/theme error:", error);
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
    await saveThemeConfig(body);
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/settings/theme error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
