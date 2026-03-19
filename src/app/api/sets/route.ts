import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listSets, createSet } from "@/lib/services/set-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const sets = await listSets(session.user.id);
    return NextResponse.json({ sets });
  } catch (error) {
    console.error("GET /api/sets error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name ist erforderlich", field: "name" },
        { status: 400 }
      );
    }

    const set = await createSet(session.user.id, { name, description });
    return NextResponse.json({ set }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Name ist erforderlich") {
        return NextResponse.json(
          { error: "Name ist erforderlich", field: "name" },
          { status: 400 }
        );
      }
      if (error.message === "Name darf maximal 100 Zeichen lang sein") {
        return NextResponse.json(
          { error: "Name darf maximal 100 Zeichen lang sein", field: "name" },
          { status: 400 }
        );
      }
      if (error.message === "Beschreibung darf maximal 500 Zeichen lang sein") {
        return NextResponse.json(
          { error: "Beschreibung darf maximal 500 Zeichen lang sein", field: "description" },
          { status: 400 }
        );
      }
    }
    console.error("POST /api/sets error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
