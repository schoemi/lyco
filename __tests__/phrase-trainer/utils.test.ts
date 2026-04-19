/**
 * Unit-Tests für Phrasen-Trainer Utility-Funktionen
 *
 * Testen: hatTimecode, findeInstrumental, findeReferenzVokal, berechnePanning
 * mit beispielbasierten Tests und Edge Cases.
 *
 * Anforderungen: 1.5, 5.1, 5.4, 7.2
 */

import { describe, it, expect } from "vitest";
import {
  hatTimecode,
  findeInstrumental,
  findeReferenzVokal,
  berechnePanning,
} from "@/lib/phrase-trainer/utils";
import type { StropheDetail, MarkupResponse } from "@/types/song";
import type { AudioQuelleResponse } from "@/types/audio";

// --- Hilfsfunktionen ---

/** Erstellt eine minimale Strophe mit gegebenen Markups */
function erstelleStrophe(markups: MarkupResponse[]): StropheDetail {
  return {
    id: "strophe-1",
    name: "Test Strophe",
    orderIndex: 0,
    progress: 0,
    notiz: null,
    analyse: null,
    istInstrumental: false,
    zeilen: [],
    markups,
  };
}

/** Erstellt eine AudioQuelle mit gegebener Rolle */
function erstelleAudioQuelle(
  id: string,
  rolle: "STANDARD" | "INSTRUMENTAL" | "REFERENZ_VOKAL",
  label = "Test Audio",
): AudioQuelleResponse {
  return {
    id,
    url: `https://example.com/${id}.mp3`,
    typ: "MP3" as const,
    label,
    orderIndex: 0,
    rolle,
  };
}

// --- hatTimecode ---

describe("hatTimecode", () => {
  it("gibt true zurück wenn Strophe einen gültigen TIMECODE/STROPHE Markup hat", () => {
    const strophe = erstelleStrophe([
      {
        id: "m1",
        typ: "TIMECODE",
        ziel: "STROPHE",
        wert: null,
        timecodeMs: 30000,
        wortIndex: null,
      },
    ]);

    expect(hatTimecode(strophe)).toBe(true);
  });

  it("gibt true zurück wenn timecodeMs = 0 (Anfang des Songs)", () => {
    const strophe = erstelleStrophe([
      {
        id: "m1",
        typ: "TIMECODE",
        ziel: "STROPHE",
        wert: null,
        timecodeMs: 0,
        wortIndex: null,
      },
    ]);

    expect(hatTimecode(strophe)).toBe(true);
  });

  it("gibt false zurück wenn keine Markups vorhanden sind", () => {
    const strophe = erstelleStrophe([]);

    expect(hatTimecode(strophe)).toBe(false);
  });

  it("gibt false zurück wenn timecodeMs null ist", () => {
    const strophe = erstelleStrophe([
      {
        id: "m1",
        typ: "TIMECODE",
        ziel: "STROPHE",
        wert: null,
        timecodeMs: null,
        wortIndex: null,
      },
    ]);

    expect(hatTimecode(strophe)).toBe(false);
  });

  it("gibt false zurück wenn TIMECODE auf ZEILE statt STROPHE zielt", () => {
    const strophe = erstelleStrophe([
      {
        id: "m1",
        typ: "TIMECODE",
        ziel: "ZEILE",
        wert: null,
        timecodeMs: 30000,
        wortIndex: null,
      },
    ]);

    expect(hatTimecode(strophe)).toBe(false);
  });

  it("gibt false zurück wenn TIMECODE auf WORT statt STROPHE zielt", () => {
    const strophe = erstelleStrophe([
      {
        id: "m1",
        typ: "TIMECODE",
        ziel: "WORT",
        wert: null,
        timecodeMs: 30000,
        wortIndex: 2,
      },
    ]);

    expect(hatTimecode(strophe)).toBe(false);
  });

  it("gibt false zurück wenn Markup-Typ nicht TIMECODE ist", () => {
    const strophe = erstelleStrophe([
      {
        id: "m1",
        typ: "PAUSE",
        ziel: "STROPHE",
        wert: null,
        timecodeMs: 30000,
        wortIndex: null,
      },
    ]);

    expect(hatTimecode(strophe)).toBe(false);
  });

  it("gibt true zurück wenn gültiger TIMECODE neben anderen Markups existiert", () => {
    const strophe = erstelleStrophe([
      {
        id: "m1",
        typ: "PAUSE",
        ziel: "STROPHE",
        wert: null,
        timecodeMs: null,
        wortIndex: null,
      },
      {
        id: "m2",
        typ: "TIMECODE",
        ziel: "ZEILE",
        wert: null,
        timecodeMs: 10000,
        wortIndex: null,
      },
      {
        id: "m3",
        typ: "TIMECODE",
        ziel: "STROPHE",
        wert: null,
        timecodeMs: 30000,
        wortIndex: null,
      },
    ]);

    expect(hatTimecode(strophe)).toBe(true);
  });
});

// --- findeInstrumental ---

describe("findeInstrumental", () => {
  it("findet die AudioQuelle mit Rolle INSTRUMENTAL", () => {
    const quellen = [
      erstelleAudioQuelle("a1", "STANDARD", "Standard Audio"),
      erstelleAudioQuelle("a2", "INSTRUMENTAL", "Instrumental"),
      erstelleAudioQuelle("a3", "REFERENZ_VOKAL", "Referenz"),
    ];

    const result = findeInstrumental(quellen);

    expect(result).not.toBeNull();
    expect(result!.id).toBe("a2");
    expect(result!.rolle).toBe("INSTRUMENTAL");
  });

  it("gibt null zurück wenn kein INSTRUMENTAL vorhanden ist", () => {
    const quellen = [
      erstelleAudioQuelle("a1", "STANDARD", "Standard Audio"),
      erstelleAudioQuelle("a2", "REFERENZ_VOKAL", "Referenz"),
    ];

    const result = findeInstrumental(quellen);

    expect(result).toBeNull();
  });

  it("gibt null zurück bei leerer AudioQuellen-Liste", () => {
    const result = findeInstrumental([]);

    expect(result).toBeNull();
  });

  it("gibt die erste INSTRUMENTAL zurück wenn mehrere vorhanden sind", () => {
    const quellen = [
      erstelleAudioQuelle("a1", "INSTRUMENTAL", "Instrumental 1"),
      erstelleAudioQuelle("a2", "INSTRUMENTAL", "Instrumental 2"),
    ];

    const result = findeInstrumental(quellen);

    expect(result).not.toBeNull();
    expect(result!.id).toBe("a1");
  });

  it("ignoriert STANDARD und REFERENZ_VOKAL Rollen", () => {
    const quellen = [
      erstelleAudioQuelle("a1", "STANDARD"),
      erstelleAudioQuelle("a2", "REFERENZ_VOKAL"),
    ];

    const result = findeInstrumental(quellen);

    expect(result).toBeNull();
  });
});

// --- findeReferenzVokal ---

describe("findeReferenzVokal", () => {
  it("findet die AudioQuelle mit Rolle REFERENZ_VOKAL", () => {
    const quellen = [
      erstelleAudioQuelle("a1", "STANDARD", "Standard Audio"),
      erstelleAudioQuelle("a2", "INSTRUMENTAL", "Instrumental"),
      erstelleAudioQuelle("a3", "REFERENZ_VOKAL", "Referenz Vokal"),
    ];

    const result = findeReferenzVokal(quellen);

    expect(result).not.toBeNull();
    expect(result!.id).toBe("a3");
    expect(result!.rolle).toBe("REFERENZ_VOKAL");
  });

  it("gibt null zurück wenn kein REFERENZ_VOKAL vorhanden ist", () => {
    const quellen = [
      erstelleAudioQuelle("a1", "STANDARD"),
      erstelleAudioQuelle("a2", "INSTRUMENTAL"),
    ];

    const result = findeReferenzVokal(quellen);

    expect(result).toBeNull();
  });

  it("gibt null zurück bei leerer AudioQuellen-Liste", () => {
    const result = findeReferenzVokal([]);

    expect(result).toBeNull();
  });

  it("gibt die erste REFERENZ_VOKAL zurück wenn mehrere vorhanden sind", () => {
    const quellen = [
      erstelleAudioQuelle("a1", "REFERENZ_VOKAL", "Referenz 1"),
      erstelleAudioQuelle("a2", "REFERENZ_VOKAL", "Referenz 2"),
    ];

    const result = findeReferenzVokal(quellen);

    expect(result).not.toBeNull();
    expect(result!.id).toBe("a1");
  });

  it("ignoriert STANDARD und INSTRUMENTAL Rollen", () => {
    const quellen = [
      erstelleAudioQuelle("a1", "STANDARD"),
      erstelleAudioQuelle("a2", "INSTRUMENTAL"),
    ];

    const result = findeReferenzVokal(quellen);

    expect(result).toBeNull();
  });
});

// --- berechnePanning ---

describe("berechnePanning", () => {
  it("gibt beide Spuren auf Mitte bei Wert 0 (mono)", () => {
    const result = berechnePanning(0);

    // berechnePanning(0) → { aufnahme: -0, referenz: 0 }
    // -0 und 0 sind mathematisch gleich, aber Object.is unterscheidet sie
    expect(result.aufnahme).toBeCloseTo(0);
    expect(result.referenz).toBeCloseTo(0);
  });

  it("gibt volle Stereo-Trennung bei Wert 1", () => {
    const result = berechnePanning(1);

    expect(result).toEqual({ aufnahme: -1, referenz: 1 });
  });

  it("gibt moderate Trennung bei Wert 0.5 (Initialwert)", () => {
    const result = berechnePanning(0.5);

    expect(result).toEqual({ aufnahme: -0.5, referenz: 0.5 });
  });

  it("Aufnahme geht nach links (negativ), Referenz nach rechts (positiv)", () => {
    const result = berechnePanning(0.7);

    expect(result.aufnahme).toBeLessThan(0);
    expect(result.referenz).toBeGreaterThan(0);
  });

  it("Aufnahme und Referenz sind symmetrisch (Betrag gleich)", () => {
    const result = berechnePanning(0.3);

    expect(Math.abs(result.aufnahme)).toBeCloseTo(Math.abs(result.referenz));
  });

  it("berechnet korrekt für Wert 0.25", () => {
    const result = berechnePanning(0.25);

    expect(result).toEqual({ aufnahme: -0.25, referenz: 0.25 });
  });
});
