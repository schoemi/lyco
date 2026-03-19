import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { changeEmail } from "@/lib/services/profil-service";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, currentPassword } = body;

    const profile = await changeEmail(session.user.id, email, currentPassword);
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof Error) {
      const validationMessages = [
        "Ungültige E-Mail-Adresse",
        "Diese E-Mail-Adresse wird bereits verwendet.",
        "Passwort ist falsch.",
      ];
      if (validationMessages.some((msg) => error.message.includes(msg))) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("PUT /api/profile/email error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
