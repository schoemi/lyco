import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEmpfangeneFreigaben } from "@/lib/services/freigabe-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const result = await getEmpfangeneFreigaben(session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/freigaben/empfangen error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
