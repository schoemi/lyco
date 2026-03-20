import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getServerErrors } from "@/lib/services/log-service";

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

export async function GET(request: NextRequest) {
  try {
    const result = await getAdminSession();
    if ("error" in result && result.error) return result.error;

    const { searchParams } = new URL(request.url);

    let page = parseInt(searchParams.get("page") ?? "", 10);
    if (!Number.isFinite(page) || page < 1) page = 1;

    let limit = parseInt(searchParams.get("limit") ?? "", 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 25;

    const severity = searchParams.get("severity") || undefined;

    const data = await getServerErrors({ page, limit, severity });
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/server-errors error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
