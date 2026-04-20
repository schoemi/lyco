/**
 * PDF-Formatter für Song-Export
 *
 * Erzeugt ein PDF-Dokument mit PDFKit:
 * - A4-Format, Ränder 50pt
 * - Kopfzeile: Titel (20pt bold) + Künstler (14pt regular)
 * - Strophen-Name als Überschrift (12pt bold), Zeilen darunter (11pt regular)
 * - Vocal-Tags als farbige Inline-Markierungen (9pt) vor dem zugehörigen Text
 * - Instrumentale Strophen mit "[Instrumental]"-Label
 * - Kommentar-Zeilen kursiv (11pt italic), Analyse-Texte eingerückt (10pt, 20pt Einrückung)
 * - Übersetzungen unterhalb der Original-Zeile (10pt, grau)
 * - Dateiname mit `.pdf` Endung
 *
 * Async wegen PDFKit-Stream-basierter Ausgabe.
 */

import PDFDocument from "pdfkit";
import type {
  ExportOptions,
  ExportStropheData,
  ExportZeileData,
  FormatterResult,
  SongExportData,
} from "../export-types";
import { VOCAL_TAG_TYPES } from "../export-types";
import { applyExportOptions } from "../format-filter";
import { generateExportFilename } from "../filename-generator";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Farb-Mapping für Vocal-Tags im PDF */
const MARKUP_COLORS: Record<string, string> = {
  ATMUNG: "#2196F3", // Blau
  KOPFSTIMME: "#9C27B0", // Lila
  BRUSTSTIMME: "#F44336", // Rot
  BELT: "#FF9800", // Orange
  FALSETT: "#00BCD4", // Cyan
  PAUSE: "#607D8B", // Grau-Blau
  WIEDERHOLUNG: "#4CAF50", // Grün
};

/** Default-Farbe für unbekannte Markup-Typen */
const DEFAULT_MARKUP_COLOR = "#000000";

// ---------------------------------------------------------------------------
// Vocal-Tag rendering
// ---------------------------------------------------------------------------

/**
 * Rendert Vocal-Tag-Markups als farbige Inline-Markierungen vor dem Text.
 * Strophen-Level und Zeilen-Level Markups werden gleich behandelt.
 */
function renderVocalTags(
  doc: PDFKit.PDFDocument,
  markups: { typ: string; wert: string | null }[],
): void {
  const vocalTags = markups.filter((m) =>
    (VOCAL_TAG_TYPES as string[]).includes(m.typ),
  );

  for (const tag of vocalTags) {
    const color = MARKUP_COLORS[tag.typ] ?? DEFAULT_MARKUP_COLOR;
    const label = tag.wert ? `[${tag.typ}] ${tag.wert}` : `[${tag.typ}]`;

    doc.font("Helvetica").fontSize(9).fillColor(color).text(label);
  }
}

// ---------------------------------------------------------------------------
// Zeile rendering
// ---------------------------------------------------------------------------

/**
 * Rendert eine einzelne Zeile inkl. Vocal-Tags und Übersetzung.
 */
function renderZeile(doc: PDFKit.PDFDocument, zeile: ExportZeileData): void {
  // Zeilen-Level Vocal-Tags vor der Zeile
  renderVocalTags(doc, zeile.markups);

  if (zeile.istKommentar) {
    // Kommentar-Zeilen kursiv (11pt italic)
    doc.font("Helvetica-Oblique").fontSize(11).fillColor("#000000").text(zeile.text);
  } else {
    // Reguläre Zeile (11pt regular)
    doc.font("Helvetica").fontSize(11).fillColor("#000000").text(zeile.text);
  }

  // Übersetzung unterhalb der Original-Zeile (10pt, grau)
  if (zeile.uebersetzung != null && zeile.uebersetzung !== "") {
    doc.font("Helvetica").fontSize(10).fillColor("#888888").text(zeile.uebersetzung);
  }
}

// ---------------------------------------------------------------------------
// Strophe rendering
// ---------------------------------------------------------------------------

/**
 * Rendert eine Strophe mit Name, Vocal-Tags, Zeilen und optionaler Analyse.
 */
function renderStrophe(
  doc: PDFKit.PDFDocument,
  strophe: ExportStropheData,
): void {
  // Strophen-Name als Überschrift (12pt bold)
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000").text(strophe.name);

  // Instrumentale Strophen mit "[Instrumental]"-Label
  if (strophe.istInstrumental) {
    doc.font("Helvetica").fontSize(11).fillColor("#000000").text("[Instrumental]");
  }

  // Strophen-Level Vocal-Tags
  renderVocalTags(doc, strophe.markups);

  // Analyse-Text eingerückt (10pt, 20pt Einrückung)
  if (strophe.analyse != null && strophe.analyse !== "") {
    doc
      .font("Helvetica-Oblique")
      .fontSize(10)
      .fillColor("#000000")
      .text(strophe.analyse, { indent: 20 });
  }

  // Zeilen sortiert nach orderIndex
  const sortedZeilen = [...strophe.zeilen].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  for (const zeile of sortedZeilen) {
    renderZeile(doc, zeile);
  }
}

// ---------------------------------------------------------------------------
// Main formatter
// ---------------------------------------------------------------------------

/**
 * Formatiert Song-Daten als PDF-Dokument.
 *
 * - Wendet Export-Optionen an (Format-Filter)
 * - Sortiert Strophen nach orderIndex aufsteigend
 * - Sortiert Zeilen innerhalb jeder Strophe nach orderIndex aufsteigend
 * - Erzeugt PDF mit PDFKit (A4, 50pt Ränder)
 * - Gibt FormatterResult mit Buffer zurück
 *
 * @param song - Die Song-Export-Daten
 * @param options - Die Export-Optionen
 * @returns Promise<FormatterResult> mit PDF als Buffer
 */
export async function formatPdf(
  song: SongExportData,
  options: ExportOptions,
): Promise<FormatterResult> {
  // Format-Filter anwenden
  const filtered = applyExportOptions(song, options);

  // PDF-Dokument erstellen (A4, 50pt Ränder)
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // Buffer-Sammlung über Stream
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // --- Kopfzeile ---

  // Titel (20pt bold)
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#000000").text(filtered.titel);

  // Künstler (14pt regular)
  if (filtered.kuenstler != null && filtered.kuenstler.trim() !== "") {
    doc.font("Helvetica").fontSize(14).fillColor("#000000").text(filtered.kuenstler);
  }

  // Abstand nach Kopfzeile
  doc.moveDown(1);

  // --- Strophen ---

  // Strophen sortiert nach orderIndex
  const sortedStrophen = [...filtered.strophen].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  for (let i = 0; i < sortedStrophen.length; i++) {
    // Abstand zwischen Strophen
    if (i > 0) {
      doc.moveDown(0.5);
    }
    renderStrophe(doc, sortedStrophen[i]);
  }

  // PDF abschließen
  doc.end();
  const data = await pdfPromise;

  const filename = generateExportFilename(song.titel, song.kuenstler, "pdf");

  return {
    data,
    filename,
    contentType: "application/pdf",
    extension: "pdf",
  };
}
