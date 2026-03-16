import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateCoachTipp, CoachError } from "@/lib/services/coach-service";

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
    const result = await generateCoachTipp(session.user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CoachError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error && typeof error === "object" && "statusCode" in error && "message" in error) {
      const e = error as { statusCode: number; message: string };
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    console.error("POST /api/songs/[id]/coach error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
