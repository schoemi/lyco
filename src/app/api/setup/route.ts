import { NextRequest, NextResponse } from "next/server";
import { isSetupRequired, createInitialAdmin } from "@/lib/services/setup-service";

export async function POST(request: NextRequest) {
  try {
    const setupRequired = await isSetupRequired();
    if (!setupRequired) {
      return NextResponse.redirect(new URL("/login", request.url), 302);
    }

    const body = await request.json();
    const { email, name, password } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Alle Felder sind erforderlich" },
        { status: 400 }
      );
    }

    const user = await createInitialAdmin({ email, name, password });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Setup wurde bereits abgeschlossen") {
        return NextResponse.redirect(new URL("/login", request.url), 302);
      }
      if (
        error.message === "Ungültige E-Mail-Adresse" ||
        error.message.includes("Passwort muss mindestens")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
