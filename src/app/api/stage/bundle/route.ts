import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import type { StageBundleResponse } from "@/types/stage";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const userId = session.user.id;

    const [songs, sets] = await Promise.all([
      prisma.song.findMany({
        where: { userId },
        select: {
          id: true,
          titel: true,
          kuenstler: true,
          strophen: {
            select: {
              id: true,
              name: true,
              orderIndex: true,
              zeilen: {
                select: {
                  id: true,
                  text: true,
                  orderIndex: true,
                },
                orderBy: { orderIndex: "asc" },
              },
              markups: {
                where: { typ: "TIMECODE", ziel: "STROPHE" },
                select: { timecodeMs: true },
                take: 1,
              },
            },
            orderBy: { orderIndex: "asc" },
          },
        },
      }),
      prisma.set.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          description: true,
          songs: {
            select: {
              songId: true,
              orderIndex: true,
            },
            orderBy: { orderIndex: "asc" },
          },
        },
      }),
    ]);

    const responseData: StageBundleResponse = {
      sets: sets.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        songs: s.songs.map((ss) => ({
          songId: ss.songId,
          orderIndex: ss.orderIndex,
        })),
      })),
      songs: songs.map((song) => ({
        id: song.id,
        titel: song.titel,
        kuenstler: song.kuenstler,
        strophen: song.strophen.map((strophe) => ({
          id: strophe.id,
          name: strophe.name,
          orderIndex: strophe.orderIndex,
          timecodeMs: strophe.markups[0]?.timecodeMs ?? null,
          zeilen: strophe.zeilen.map((zeile) => ({
            id: zeile.id,
            text: zeile.text,
            orderIndex: zeile.orderIndex,
          })),
        })),
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
    console.error("GET /api/stage/bundle error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
