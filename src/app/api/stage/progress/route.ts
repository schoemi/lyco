import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import type { StageProgressResponse } from "@/types/stage";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const userId = session.user.id;

    const fortschritte = await prisma.fortschritt.findMany({
      where: { userId },
      select: {
        stropheId: true,
        prozent: true,
      },
    });

    const responseData: StageProgressResponse = {
      progress: fortschritte.map((f) => ({
        stropheId: f.stropheId,
        prozent: f.prozent,
      })),
      timestamp: new Date().toISOString(),
    };

    const etag = createHash("sha256")
      .update(JSON.stringify(responseData))
      .digest("hex");

    return NextResponse.json(responseData, {
      headers: { ETag: `"${etag}"` },
    });
  } catch (error) {
    console.error("GET /api/stage/progress error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
