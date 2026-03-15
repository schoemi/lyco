import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createMarkup } from "@/lib/services/markup-service";
import { MarkupTyp, MarkupZiel } from "@/generated/prisma/enums";

const VALID_MARKUP_TYPEN = Object.values(MarkupTyp);
const VALID_MARKUP_ZIELE = Object.values(MarkupZiel);

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { typ, ziel, stropheId, zeileId, wortIndex, inhalt } = body;

    // Validate typ
    if (!typ || !VALID_MARKUP_TYPEN.includes(typ)) {
      return NextResponse.json(
        { error: "Ungültiger Markup-Typ", field: "typ" },
        { status: 400 }
      );
    }

    // Validate ziel
    if (!ziel || !VALID_MARKUP_ZIELE.includes(ziel)) {
      return NextResponse.json(
        { error: "Ungültiges Markup-Ziel", field: "ziel" },
        { status: 400 }
      );
    }

    // Validate ziel-specific fields
    if (ziel === MarkupZiel.STROPHE && !stropheId) {
      return NextResponse.json(
        { error: "Für Ziel STROPHE muss stropheId gesetzt sein", field: "stropheId" },
        { status: 400 }
      );
    }

    if (ziel === MarkupZiel.ZEILE && !zeileId) {
      return NextResponse.json(
        { error: "Für Ziel ZEILE muss zeileId gesetzt sein", field: "zeileId" },
        { status: 400 }
      );
    }

    if (ziel === MarkupZiel.WORT) {
      if (!zeileId) {
        return NextResponse.json(
          { error: "Für Ziel WORT muss zeileId gesetzt sein", field: "zeileId" },
          { status: 400 }
        );
      }
      if (wortIndex === undefined || wortIndex === null) {
        return NextResponse.json(
          { error: "Für Ziel WORT muss wortIndex gesetzt sein", field: "wortIndex" },
          { status: 400 }
        );
      }
    }

    const markup = await createMarkup(session.user.id, {
      typ,
      ziel,
      stropheId,
      zeileId,
      wortIndex,
      wert: inhalt,
    });

    return NextResponse.json({ markup }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Für Ziel STROPHE muss stropheId gesetzt sein" ||
          error.message === "Für Ziel ZEILE muss zeileId gesetzt sein" ||
          error.message === "Für Ziel WORT muss zeileId gesetzt sein" ||
          error.message === "Für Ziel WORT muss wortIndex gesetzt sein" ||
          error.message === "Wort-Index außerhalb des gültigen Bereichs") {
        return NextResponse.json(
          { error: error.message, field: error.message.includes("wortIndex") || error.message.includes("Wort-Index") ? "wortIndex" : undefined },
          { status: 400 }
        );
      }
      if (error.message === "Strophe nicht gefunden" ||
          error.message === "Zeile nicht gefunden") {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message === "Zugriff verweigert") {
        return NextResponse.json(
          { error: "Zugriff verweigert" },
          { status: 403 }
        );
      }
    }
    console.error("POST /api/markups error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
