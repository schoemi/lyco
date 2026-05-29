import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health
 *
 * Health check endpoint that verifies database connectivity.
 * Returns 200 if the database is reachable, 503 otherwise.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check failed — database unreachable:", error);
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        message: "Datenbankverbindung fehlgeschlagen",
      },
      { status: 503 }
    );
  }
}
