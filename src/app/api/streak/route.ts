import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStreak } from "@/lib/services/streak-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const streak = await getStreak(userId);

    return NextResponse.json({ streak });
  } catch (error) {
    console.error("GET /api/streak error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
