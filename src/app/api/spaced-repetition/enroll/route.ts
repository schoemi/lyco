import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erstelleWiederholung } from "@/lib/services/spaced-repetition-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { songId } = body;

    if (typeof songId !== "string" || !songId) {
      return NextResponse.json(
        { error: "songId (string) ist erforderlich" },
        { status: 400 }
      );
    }

    // Verify song ownership
    const song = await prisma.song.findUnique({
      where: { id: songId },
      include: { strophen: { select: { id: true } } },
    });

    if (!song) {
      return NextResponse.json(
        { error: "Song nicht gefunden" },
        { status: 404 }
      );
    }
    if (song.userId !== userId) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    if (song.strophen.length === 0) {
      return NextResponse.json(
        { error: "Song hat keine Strophen" },
        { status: 400 }
      );
    }

    // Find which strophes are already enrolled
    const existing = await prisma.wiederholung.findMany({
      where: { userId, stropheId: { in: song.strophen.map((s) => s.id) } },
      select: { stropheId: true },
    });
    const enrolledIds = new Set(existing.map((e) => e.stropheId));

    // Enroll missing strophes
    const neueStrophen = song.strophen.filter((s) => !enrolledIds.has(s.id));
    const ergebnisse = await Promise.all(
      neueStrophen.map((s) => erstelleWiederholung(userId, s.id))
    );

    return NextResponse.json({
      enrolled: ergebnisse.length,
      alreadyEnrolled: enrolledIds.size,
      total: song.strophen.length,
    });
  } catch (error) {
    console.error("POST /api/spaced-repetition/enroll error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
