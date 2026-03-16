import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzeSong, getAnalysis, AnalyseError } from "@/lib/services/analyse-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { id } = await params;
    const result = await analyzeSong(session.user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AnalyseError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error && typeof error === "object" && "statusCode" in error && "message" in error) {
      const e = error as { statusCode: number; message: string };
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    console.error("POST /api/songs/[id]/analyze error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { id } = await params;
    const result = await getAnalysis(session.user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AnalyseError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error && typeof error === "object" && "statusCode" in error && "message" in error) {
      const e = error as { statusCode: number; message: string };
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    console.error("GET /api/songs/[id]/analyze error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
