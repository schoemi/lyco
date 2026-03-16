import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PDFParse } from "pdf-parse";
import OpenAI from "openai";
import type { PdfParseResult } from "@/types/import";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const SYSTEM_PROMPT = `Du erhältst den extrahierten Text aus einer PDF-Datei mit einem Songtext.
Extrahiere folgende Informationen:
- titel: Der Titel des Songs
- kuenstler: Der Künstler/die Band
- text: Der Songtext im folgenden Format:
  [Strophen-Name]
  Zeile 1
  Zeile 2
  ...

Regeln:
- Ignoriere Akkorde, Gitarren-Tabulaturen und musikalische Annotationen
- Behalte nur den reinen Liedtext
- Verwende Standard-Strophen-Namen: Verse 1, Verse 2, Chorus, Bridge, Pre-Chorus, Outro, Intro
- Trenne Strophen mit einer Leerzeile

Antworte ausschließlich im JSON-Format:
{ "titel": "...", "kuenstler": "...", "text": "..." }`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Nur PDF-Dateien sind erlaubt" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Datei darf maximal 5MB groß sein" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const pdfData = await parser.getText({ pageJoiner: "" });
    const rawText = pdfData.text;
    await parser.destroy();

    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { error: "PDF enthält keinen extrahierbaren Text" },
        { status: 400 }
      );
    }

    const openai = new OpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: rawText },
      ],
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Keine Antwort vom LLM erhalten" },
        { status: 500 }
      );
    }

    let parsed: PdfParseResult;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "LLM-Antwort ist kein gültiges JSON" },
        { status: 500 }
      );
    }

    if (
      typeof parsed.titel !== "string" ||
      typeof parsed.kuenstler !== "string" ||
      typeof parsed.text !== "string"
    ) {
      return NextResponse.json(
        { error: "LLM-Antwort hat ungültiges Format" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("POST /api/songs/parse-pdf error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
