/**
 * PDF-Formatter für Song-Export
 *
 * Erzeugt ein PDF-Dokument mit PDFKit:
 * - A4-Format, Ränder 50pt
 * - Legende oben rechts auf jeder Seite (nur verwendete Vocal-Tags)
 * - Kopfzeile: Titel (20pt bold) + Künstler (14pt regular)
 * - Zwei-Spalten-Layout wenn Kommentare aktiviert:
 *   Links: Liedtext mit Vocal-Tags
 *   Rechts: Kommentare (istKommentar-Zeilen + Strophen-Analyse)
 * - Vocal-Tags: Range-Text in der Tag-Farbe, Inline-Tags als farbige Marker
 * - Instrumentale Strophen mit "[Instrumental]"-Label
 * - Übersetzungen unterhalb der Original-Zeile (10pt, grau)
 *
 * Vocal-Tags werden aus dem ChordPro-Format im Zeilentext geparst
 * und mit den Farben aus den TagDefinitionen gerendert.
 */

import PDFDocument from "pdfkit";
import type {
  ExportOptions,
  ExportStropheData,
  ExportZeileData,
  FormatterResult,
  SongExportData,
} from "../export-types";
import { applyExportOptions } from "../format-filter";
import { generateExportFilename } from "../filename-generator";
import { parseChordPro, stripChordPro } from "@/lib/vocal-tag/chordpro-parser";
import type { TagDefinitionData } from "@/types/vocal-tag";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TagLookup {
  label: string;
  color: string;
}

/** Layout-Konfiguration für Spalten */
interface ColumnLayout {
  /** Linke Spalte: X-Start */
  leftX: number;
  /** Linke Spalte: Breite */
  leftWidth: number;
  /** Rechte Spalte: X-Start (nur wenn Kommentare aktiv) */
  rightX: number;
  /** Rechte Spalte: Breite */
  rightWidth: number;
  /** Ob die rechte Spalte aktiv ist */
  hasRightColumn: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UNKNOWN_TAG_COLOR = "#9ca3af";
const LEGEND_FONT_SIZE = 7;
const LEGEND_SWATCH_SIZE = 7;
const LEGEND_GAP = 3;
const LEGEND_ITEM_GAP = 8;
/** Ca. 2cm Abstand vom Rand (≈ 57pt) */
const LEGEND_MARGIN = 57;

/** Abstand zwischen linker und rechter Spalte */
const COLUMN_GAP = 20;
/** Anteil der linken Spalte an der verfügbaren Breite (wenn Kommentare aktiv) */
const LEFT_COLUMN_RATIO = 0.6;

// ---------------------------------------------------------------------------
// Collect used tags
// ---------------------------------------------------------------------------

function collectUsedTags(
  song: SongExportData,
  knownTags: string[],
): Set<string> {
  const used = new Set<string>();
  for (const strophe of song.strophen) {
    for (const zeile of strophe.zeilen) {
      if (zeile.istKommentar) continue;
      const result = parseChordPro(zeile.text, knownTags);
      for (const node of result.nodes) {
        if (
          (node.type === "chordpro-tag" || node.type === "chordpro-range") &&
          node.tag
        ) {
          used.add(node.tag);
        }
      }
    }
  }
  return used;
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function computeLayout(doc: PDFKit.PDFDocument, showKommentare: boolean): ColumnLayout {
  const contentWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const leftX = doc.page.margins.left;

  if (!showKommentare) {
    return {
      leftX,
      leftWidth: contentWidth,
      rightX: 0,
      rightWidth: 0,
      hasRightColumn: false,
    };
  }

  const leftWidth = Math.floor(contentWidth * LEFT_COLUMN_RATIO);
  const rightX = leftX + leftWidth + COLUMN_GAP;
  const rightWidth = contentWidth - leftWidth - COLUMN_GAP;

  return {
    leftX,
    leftWidth,
    rightX,
    rightWidth,
    hasRightColumn: true,
  };
}

// ---------------------------------------------------------------------------
// Legend rendering
// ---------------------------------------------------------------------------

function renderLegend(
  doc: PDFKit.PDFDocument,
  usedTags: Set<string>,
  tagLookup: Map<string, TagLookup>,
  tagDefinitions: TagDefinitionData[],
): void {
  if (usedTags.size === 0) return;

  const savedX = doc.x;
  const savedY = doc.y;

  const orderedTags = tagDefinitions
    .filter((td) => usedTags.has(td.tag))
    .sort((a, b) => a.indexNr - b.indexNr);

  const knownTagSet = new Set(tagDefinitions.map((td) => td.tag));
  const unknownTags = [...usedTags].filter((t) => !knownTagSet.has(t)).sort();

  const allItems = [
    ...orderedTags.map((td) => ({ label: td.label, color: td.color })),
    ...unknownTags.map((t) => ({ label: t, color: UNKNOWN_TAG_COLOR })),
  ];

  doc.font("Helvetica").fontSize(LEGEND_FONT_SIZE);
  let totalWidth = 0;
  for (let i = 0; i < allItems.length; i++) {
    totalWidth += LEGEND_SWATCH_SIZE + LEGEND_GAP + doc.widthOfString(allItems[i].label);
    if (i < allItems.length - 1) totalWidth += LEGEND_ITEM_GAP;
  }

  const pageWidth = doc.page.width;
  const y = doc.page.margins.top;
  let x = pageWidth - LEGEND_MARGIN - totalWidth;

  for (const item of allItems) {
    doc.save().rect(x, y, LEGEND_SWATCH_SIZE, LEGEND_SWATCH_SIZE).fill(item.color).restore();

    doc.font("Helvetica").fontSize(LEGEND_FONT_SIZE).fillColor("#555555");
    const textX = x + LEGEND_SWATCH_SIZE + LEGEND_GAP;
    doc.text(item.label, textX, y, { lineBreak: false });
    const textWidth = doc.widthOfString(item.label);
    x = textX + textWidth + LEGEND_ITEM_GAP;
  }

  doc.x = savedX;
  doc.y = savedY;
}

// ---------------------------------------------------------------------------
// Text rendering with inline ChordPro tags
// ---------------------------------------------------------------------------

function renderTextWithTags(
  doc: PDFKit.PDFDocument,
  text: string,
  knownTags: string[],
  tagLookup: Map<string, TagLookup>,
  fontSize: number,
  fontName: string,
  textColor: string,
  width: number,
): void {
  const result = parseChordPro(text, knownTags);

  if (result.nodes.length === 0) {
    doc.font(fontName).fontSize(fontSize).fillColor(textColor).text("", { width });
    return;
  }

  const hasTags = result.nodes.some(
    (n) => n.type === "chordpro-tag" || n.type === "chordpro-range",
  );

  if (!hasTags) {
    const plainText = result.nodes.map((n) => n.content ?? "").join("");
    doc.font(fontName).fontSize(fontSize).fillColor(textColor).text(plainText, { width });
    return;
  }

  for (let i = 0; i < result.nodes.length; i++) {
    const node = result.nodes[i];
    const isLast = i === result.nodes.length - 1;

    if (node.type === "text") {
      doc
        .font(fontName)
        .fontSize(fontSize)
        .fillColor(textColor)
        .text(node.content ?? "", { continued: !isLast, width });
    } else if (node.type === "chordpro-range") {
      const tag = node.tag ?? "";
      const lookup = tagLookup.get(tag);
      const color = lookup?.color ?? UNKNOWN_TAG_COLOR;

      doc
        .font(fontName)
        .fontSize(fontSize)
        .fillColor(color)
        .text(node.rangeText ?? "", { continued: !isLast, width });
    } else if (node.type === "chordpro-tag") {
      const tag = node.tag ?? "";
      const lookup = tagLookup.get(tag);
      const color = lookup?.color ?? UNKNOWN_TAG_COLOR;
      const label = lookup?.label ?? tag;
      const display = node.zusatztext ? `(${label}: ${node.zusatztext})` : `(${label})`;

      doc
        .font("Helvetica-Bold")
        .fontSize(fontSize - 2)
        .fillColor(color)
        .text(display, { continued: !isLast, width });
    }
  }
}

// ---------------------------------------------------------------------------
// Strophe rendering (two-column)
// ---------------------------------------------------------------------------

/**
 * Sammelt Kommentar-Texte einer Strophe (Analyse + istKommentar-Zeilen).
 */
function collectComments(strophe: ExportStropheData): string[] {
  const comments: string[] = [];

  if (strophe.analyse != null && strophe.analyse.trim() !== "") {
    comments.push(strophe.analyse);
  }

  return comments;
}

/**
 * Rendert die Kommentare in der rechten Spalte auf der gegebenen Y-Position.
 */
function renderCommentsColumn(
  doc: PDFKit.PDFDocument,
  comments: string[],
  layout: ColumnLayout,
  startY: number,
): void {
  if (comments.length === 0 || !layout.hasRightColumn) return;

  const savedX = doc.x;
  const savedY = doc.y;

  doc.x = layout.rightX;
  doc.y = startY;

  for (let i = 0; i < comments.length; i++) {
    if (i > 0) doc.y += 4; // kleiner Abstand zwischen Kommentaren
    doc
      .font("Helvetica-Oblique")
      .fontSize(9)
      .fillColor("#666666")
      .text(comments[i], layout.rightX, doc.y, { width: layout.rightWidth });
  }

  // Cursor wiederherstellen — wir nehmen das Maximum von links und rechts
  doc.x = savedX;
  doc.y = Math.max(savedY, doc.y);
}

/**
 * Rendert eine Zeile (nur Nicht-Kommentar-Zeilen in der linken Spalte).
 */
function renderZeile(
  doc: PDFKit.PDFDocument,
  zeile: ExportZeileData,
  knownTags: string[],
  tagLookup: Map<string, TagLookup>,
  showVocalTags: boolean,
  showUebersetzungen: boolean,
  width: number,
): void {
  // Kommentar-Zeilen als kursive Regieanweisungen im Liedtext rendern (gesteuert durch vocalTags)
  if (zeile.istKommentar) {
    if (showVocalTags) {
      doc.font("Helvetica-Oblique").fontSize(11).fillColor("#000000")
        .text(stripChordPro(zeile.text), { width });
    }
    return;
  }

  if (!showVocalTags) {
    doc.font("Helvetica").fontSize(11).fillColor("#000000").text(stripChordPro(zeile.text), { width });
  } else {
    renderTextWithTags(doc, zeile.text, knownTags, tagLookup, 11, "Helvetica", "#000000", width);
  }

  if (showUebersetzungen && zeile.uebersetzung != null && zeile.uebersetzung !== "") {
    doc.font("Helvetica").fontSize(10).fillColor("#888888").text(zeile.uebersetzung, { width });
  }
}

/**
 * Rendert eine Strophe im Zwei-Spalten-Layout.
 */
function renderStrophe(
  doc: PDFKit.PDFDocument,
  strophe: ExportStropheData,
  knownTags: string[],
  tagLookup: Map<string, TagLookup>,
  showVocalTags: boolean,
  showKommentare: boolean,
  showUebersetzungen: boolean,
  layout: ColumnLayout,
): void {
  // Strophen-Name als Überschrift
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000")
    .text(strophe.name, layout.leftX, doc.y, { width: layout.leftWidth });

  if (strophe.istInstrumental) {
    doc.font("Helvetica").fontSize(11).fillColor("#000000")
      .text("[Instrumental]", { width: layout.leftWidth });
  }

  // Y-Position merken für die rechte Spalte
  const stropheStartY = doc.y;

  // Wenn keine Kommentar-Spalte: Analyse inline rendern, Zeilen normal
  if (!showKommentare || !layout.hasRightColumn) {
    if (strophe.analyse != null && strophe.analyse.trim() !== "") {
      doc
        .font("Helvetica-Oblique")
        .fontSize(10)
        .fillColor("#000000")
        .text(strophe.analyse, { indent: 20, width: layout.leftWidth });
    }

    const sortedZeilen = [...strophe.zeilen].sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );
    for (const zeile of sortedZeilen) {
      renderZeile(doc, zeile, knownTags, tagLookup, showVocalTags, showUebersetzungen, layout.leftWidth);
    }
    return;
  }

  // Zwei-Spalten-Layout: Liedtext links, Kommentare rechts

  // Linke Spalte: nur Nicht-Kommentar-Zeilen
  const sortedZeilen = [...strophe.zeilen].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );
  for (const zeile of sortedZeilen) {
    renderZeile(doc, zeile, knownTags, tagLookup, showVocalTags, showUebersetzungen, layout.leftWidth);
  }

  const leftEndY = doc.y;

  // Rechte Spalte: Kommentare
  const comments = collectComments(strophe);
  renderCommentsColumn(doc, comments, layout, stropheStartY);

  // Cursor auf das Maximum beider Spalten setzen
  doc.x = layout.leftX;
  doc.y = Math.max(leftEndY, doc.y);
}

// ---------------------------------------------------------------------------
// Main formatter
// ---------------------------------------------------------------------------

export async function formatPdf(
  song: SongExportData,
  options: ExportOptions,
  tagDefinitions: TagDefinitionData[] = [],
): Promise<FormatterResult> {
  const filtered = applyExportOptions(song, options);

  const tagLookup = new Map<string, TagLookup>();
  for (const td of tagDefinitions) {
    tagLookup.set(td.tag, { label: td.label, color: td.color });
  }
  const knownTags = tagDefinitions.map((td) => td.tag);

  const usedTags = options.vocalTags
    ? collectUsedTags(filtered, knownTags)
    : new Set<string>();

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const layout = computeLayout(doc, options.kommentare);

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.on("pageAdded", () => {
    renderLegend(doc, usedTags, tagLookup, tagDefinitions);
  });

  renderLegend(doc, usedTags, tagLookup, tagDefinitions);

  // Kopfzeile
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#000000").text(filtered.titel);
  if (filtered.kuenstler != null && filtered.kuenstler.trim() !== "") {
    doc.font("Helvetica").fontSize(14).fillColor("#000000").text(filtered.kuenstler);
  }
  doc.moveDown(1);

  // Strophen
  const sortedStrophen = [...filtered.strophen].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  for (let i = 0; i < sortedStrophen.length; i++) {
    if (i > 0) doc.moveDown(0.5);
    renderStrophe(
      doc,
      sortedStrophen[i],
      knownTags,
      tagLookup,
      options.vocalTags,
      options.kommentare,
      options.uebersetzungen,
      layout,
    );
  }

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
