/**
 * Unit-Tests für berechneUebungsbereich
 *
 * Testen: Übungsbereich-Berechnung basierend auf ausgewählten Strophen,
 * Sortierung nach orderIndex, End-Timecode-Berechnung, nicht-zusammenhängende Auswahlen
 *
 * Anforderungen: 4.2, 12.1, 12.2, 12.3
 */

import { describe, it, expect } from "vitest";
import { berechneUebungsbereich } from "@/lib/phrase-trainer/uebungsbereich";
import type { StropheDetail } from "@/types/song";

/** Hilfsfunktion: Erstellt eine minimale Strophe mit optionalem Timecode */
function erstelleStrophe(
  id: string,
  orderIndex: number,
  timecodeMs: number | null = null,
): StropheDetail {
  const markups = timecodeMs != null
    ? [
        {
          id: `markup-${id}`,
          typ: "TIMECODE" as const,
          ziel: "STROPHE" as const,
          wert: null,
          timecodeMs,
          wortIndex: null,
        },
      ]
    : [];

  return {
    id,
    name: `Strophe ${id}`,
    orderIndex,
    progress: 0,
    notiz: null,
    analyse: null,
    istInstrumental: false,
    zeilen: [],
    markups,
  };
}

const INSTRUMENTAL_DAUER = 240000; // 4 Minuten

describe("berechneUebungsbereich", () => {
  it("berechnet Start und Ende für eine einzelne ausgewählte Strophe (nicht die letzte)", () => {
    const strophen = [
      erstelleStrophe("s1", 0, 0),
      erstelleStrophe("s2", 1, 30000),
      erstelleStrophe("s3", 2, 60000),
    ];

    const result = berechneUebungsbereich(
      strophen,
      new Set(["s1"]),
      INSTRUMENTAL_DAUER,
    );

    expect(result).toEqual({ startMs: 0, endMs: 30000 });
  });

  it("berechnet Start und Ende für mehrere zusammenhängende Strophen", () => {
    const strophen = [
      erstelleStrophe("s1", 0, 0),
      erstelleStrophe("s2", 1, 30000),
      erstelleStrophe("s3", 2, 60000),
      erstelleStrophe("s4", 3, 90000),
    ];

    const result = berechneUebungsbereich(
      strophen,
      new Set(["s2", "s3"]),
      INSTRUMENTAL_DAUER,
    );

    expect(result).toEqual({ startMs: 30000, endMs: 90000 });
  });

  it("verwendet Instrumental-Dauer als endMs wenn letzte Strophe ausgewählt", () => {
    const strophen = [
      erstelleStrophe("s1", 0, 0),
      erstelleStrophe("s2", 1, 30000),
      erstelleStrophe("s3", 2, 60000),
    ];

    const result = berechneUebungsbereich(
      strophen,
      new Set(["s3"]),
      INSTRUMENTAL_DAUER,
    );

    expect(result).toEqual({ startMs: 60000, endMs: INSTRUMENTAL_DAUER });
  });

  it("behandelt nicht-zusammenhängende Auswahlen als durchgehenden Bereich", () => {
    const strophen = [
      erstelleStrophe("s1", 0, 0),
      erstelleStrophe("s2", 1, 30000),
      erstelleStrophe("s3", 2, 60000),
      erstelleStrophe("s4", 3, 90000),
    ];

    // s1 und s3 ausgewählt (nicht zusammenhängend) → Bereich von s1 bis s4
    const result = berechneUebungsbereich(
      strophen,
      new Set(["s1", "s3"]),
      INSTRUMENTAL_DAUER,
    );

    expect(result).toEqual({ startMs: 0, endMs: 90000 });
  });

  it("sortiert Strophen nach orderIndex unabhängig von der Eingabereihenfolge", () => {
    // Strophen in umgekehrter Reihenfolge übergeben
    const strophen = [
      erstelleStrophe("s3", 2, 60000),
      erstelleStrophe("s1", 0, 0),
      erstelleStrophe("s2", 1, 30000),
    ];

    const result = berechneUebungsbereich(
      strophen,
      new Set(["s2"]),
      INSTRUMENTAL_DAUER,
    );

    expect(result).toEqual({ startMs: 30000, endMs: 60000 });
  });

  it("gibt {0, 0} zurück wenn keine Strophe ausgewählt ist", () => {
    const strophen = [
      erstelleStrophe("s1", 0, 0),
      erstelleStrophe("s2", 1, 30000),
    ];

    const result = berechneUebungsbereich(
      strophen,
      new Set(),
      INSTRUMENTAL_DAUER,
    );

    expect(result).toEqual({ startMs: 0, endMs: 0 });
  });

  it("berechnet korrekt wenn alle Strophen ausgewählt sind", () => {
    const strophen = [
      erstelleStrophe("s1", 0, 0),
      erstelleStrophe("s2", 1, 30000),
      erstelleStrophe("s3", 2, 60000),
    ];

    const result = berechneUebungsbereich(
      strophen,
      new Set(["s1", "s2", "s3"]),
      INSTRUMENTAL_DAUER,
    );

    // Letzte Strophe ist die letzte im Song → endMs = Instrumental-Dauer
    expect(result).toEqual({ startMs: 0, endMs: INSTRUMENTAL_DAUER });
  });

  it("berechnet korrekt für eine einzelne Strophe die auch die letzte ist", () => {
    const strophen = [erstelleStrophe("s1", 0, 10000)];

    const result = berechneUebungsbereich(
      strophen,
      new Set(["s1"]),
      INSTRUMENTAL_DAUER,
    );

    expect(result).toEqual({ startMs: 10000, endMs: INSTRUMENTAL_DAUER });
  });

  it("nicht-zusammenhängende Auswahl mit letzter Strophe verwendet Instrumental-Dauer", () => {
    const strophen = [
      erstelleStrophe("s1", 0, 0),
      erstelleStrophe("s2", 1, 30000),
      erstelleStrophe("s3", 2, 60000),
    ];

    // s1 und s3 ausgewählt → letzte ausgewählte ist letzte im Song
    const result = berechneUebungsbereich(
      strophen,
      new Set(["s1", "s3"]),
      INSTRUMENTAL_DAUER,
    );

    expect(result).toEqual({ startMs: 0, endMs: INSTRUMENTAL_DAUER });
  });
});
