import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listPasskeys } from "@/lib/services/passkey-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const passkeys = await listPasskeys(session.user.id);
    return NextResponse.json({ passkeys });
  } catch (error) {
    console.error("GET /api/auth/passkey/credentials error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
