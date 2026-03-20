/**
 * Backup-Serializer für Song/Set Export & Import
 *
 * Konvertiert zwischen Prisma-Datenmodellen und dem
 * versionierten Manifest-Format für ZIP-Archive.
 */

import type {
  SongManifest,
  StropheManifest,
  ZeileManifest,
  MarkupManifest,
  AudioQuelleManifest,
  SetManifest,
  SetSongEntry,
} from "./backup-types";
import { CURRENT_EXPORT_VERSION } from "./backup-types";

// ---------------------------------------------------------------------------
// Prisma-Datentypen (Eingabe für Serialisierung)
// ---------------------------------------------------------------------------

/** Markup-Daten wie sie aus Prisma kommen */
export interface MarkupData {
  id: string;
  typ: string;
  ziel: string;
  wert: string | null;
  timecodeMs: number | null;
  wortIndex: number | null;
}

/** Zeile mit Markups */
export interface ZeileData {
  id: string;
  text: string;
  uebersetzung: string | null;
  orderIndex: number;
  markups: MarkupData[];
}

/** Strophe mit Zeilen, Markups, Interpretationen und Notizen */
export interface StropheData {
  id: string;
  name: string;
  orderIndex: number;
  analyse: string | null;
  zeilen: ZeileData[];
  markups: MarkupData[];
  interpretationen: { text: string }[];
  notizen: { text: string }[];
}

/** AudioQuelle-Daten */
export interface AudioQuelleData {
  url: string;
  typ: string;
  label: string;
  orderIndex: number;
  rolle: string;
}

/** Song mit allen Relationen (wie von Prisma mit include geladen) */
export interface SongExportData {
  id: string;
  titel: string;
  kuenstler: string | null;
  sprache: string | null;
  emotionsTags: string[];
  coverUrl: string | null;
  analyse: string | null;
  coachTipp: string | null;
  strophen: StropheData[];
  audioQuellen: AudioQuelleData[];
}

/** Set mit Songs (wie von Prisma mit include geladen) */
export interface SetExportData {
  name: string;
  description: string | null;
  songs: {
    orderIndex: number;
    folder: string;
  }[];
}

// ---------------------------------------------------------------------------
// Prisma-Erstellungsdaten (Ausgabe der Deserialisierung)
// ---------------------------------------------------------------------------

/** Daten zum Erstellen eines Songs via Prisma */
export interface SongCreateData {
  originalId: string;
  titel: string;
  kuenstler: string | null;
  sprache: string | null;
  emotionsTags: string[];
  coverUrl: string | null;
  analyse: string | null;
  coachTipp: string | null;
  strophen: StropheCreateData[];
  audioQuellen: AudioQuelleCreateData[];
}

export interface StropheCreateData {
  originalId: string;
  name: string;
  orderIndex: number;
  analyse: string | null;
  interpretation: string | null;
  notiz: string | null;
  zeilen: ZeileCreateData[];
  markups: MarkupCreateData[];
}

export interface ZeileCreateData {
  originalId: string;
  text: string;
  uebersetzung: string | null;
  orderIndex: number;
  markups: MarkupCreateData[];
}

export interface MarkupCreateData {
  typ: string;
  ziel: string;
  wert: string | null;
  timecodeMs: number | null;
  wortIndex: number | null;
}

export interface AudioQuelleCreateData {
  url: string;
  typ: string;
  label: string;
  orderIndex: number;
  rolle: string;
}

export interface SetCreateData {
  name: string;
  description: string | null;
  songs: SetSongEntry[];
}

// ---------------------------------------------------------------------------
// Serialisierung: Prisma → Manifest
// ---------------------------------------------------------------------------

function serializeMarkup(markup: MarkupData): MarkupManifest {
  return {
    typ: markup.typ,
    ziel: markup.ziel,
    wert: markup.wert,
    timecodeMs: markup.timecodeMs,
    wortIndex: markup.wortIndex,
  };
}

function serializeZeile(zeile: ZeileData): ZeileManifest {
  return {
    originalId: zeile.id,
    text: zeile.text,
    uebersetzung: zeile.uebersetzung,
    orderIndex: zeile.orderIndex,
    markups: zeile.markups.map(serializeMarkup),
  };
}

function serializeStrophe(strophe: StropheData): StropheManifest {
  return {
    originalId: strophe.id,
    name: strophe.name,
    orderIndex: strophe.orderIndex,
    analyse: strophe.analyse,
    interpretation: strophe.interpretationen[0]?.text ?? null,
    notiz: strophe.notizen[0]?.text ?? null,
    zeilen: strophe.zeilen.map(serializeZeile),
    markups: strophe.markups.map(serializeMarkup),
  };
}

function serializeAudioQuelle(aq: AudioQuelleData): AudioQuelleManifest {
  return {
    url: aq.url,
    typ: aq.typ,
    label: aq.label,
    orderIndex: aq.orderIndex,
    rolle: aq.rolle,
  };
}

/**
 * Konvertiert Song-Daten aus dem Prisma-Modell in ein SongManifest.
 */
export function serializeSong(song: SongExportData): SongManifest {
  return {
    exportVersion: CURRENT_EXPORT_VERSION,
    originalId: song.id,
    titel: song.titel,
    kuenstler: song.kuenstler,
    sprache: song.sprache,
    emotionsTags: song.emotionsTags,
    coverUrl: song.coverUrl,
    analyse: song.analyse,
    coachTipp: song.coachTipp,
    strophen: song.strophen.map(serializeStrophe),
    audioQuellen: song.audioQuellen.map(serializeAudioQuelle),
  };
}

/**
 * Konvertiert ein Set in ein SetManifest.
 */
export function serializeSet(set: SetExportData): SetManifest {
  return {
    exportVersion: CURRENT_EXPORT_VERSION,
    name: set.name,
    description: set.description,
    songs: set.songs.map((s) => ({
      folder: s.folder,
      orderIndex: s.orderIndex,
    })),
  };
}

// ---------------------------------------------------------------------------
// Deserialisierung: Manifest → Prisma-Erstellungsdaten
// ---------------------------------------------------------------------------

function deserializeMarkup(markup: MarkupManifest): MarkupCreateData {
  return {
    typ: markup.typ,
    ziel: markup.ziel,
    wert: markup.wert,
    timecodeMs: markup.timecodeMs,
    wortIndex: markup.wortIndex,
  };
}

function deserializeZeile(zeile: ZeileManifest): ZeileCreateData {
  return {
    originalId: zeile.originalId,
    text: zeile.text,
    uebersetzung: zeile.uebersetzung,
    orderIndex: zeile.orderIndex,
    markups: zeile.markups.map(deserializeMarkup),
  };
}

function deserializeStrophe(strophe: StropheManifest): StropheCreateData {
  return {
    originalId: strophe.originalId,
    name: strophe.name,
    orderIndex: strophe.orderIndex,
    analyse: strophe.analyse,
    interpretation: strophe.interpretation,
    notiz: strophe.notiz,
    zeilen: strophe.zeilen.map(deserializeZeile),
    markups: strophe.markups.map(deserializeMarkup),
  };
}

function deserializeAudioQuelle(aq: AudioQuelleManifest): AudioQuelleCreateData {
  return {
    url: aq.url,
    typ: aq.typ,
    label: aq.label,
    orderIndex: aq.orderIndex,
    rolle: aq.rolle,
  };
}

/**
 * Konvertiert ein SongManifest zurück in Daten für die Prisma-Erstellung.
 */
export function deserializeSong(manifest: SongManifest): SongCreateData {
  return {
    originalId: manifest.originalId,
    titel: manifest.titel,
    kuenstler: manifest.kuenstler,
    sprache: manifest.sprache,
    emotionsTags: manifest.emotionsTags,
    coverUrl: manifest.coverUrl,
    analyse: manifest.analyse,
    coachTipp: manifest.coachTipp,
    strophen: manifest.strophen.map(deserializeStrophe),
    audioQuellen: manifest.audioQuellen.map(deserializeAudioQuelle),
  };
}

/**
 * Konvertiert ein SetManifest zurück in Daten für die Prisma-Erstellung.
 */
export function deserializeSet(manifest: SetManifest): SetCreateData {
  return {
    name: manifest.name,
    description: manifest.description,
    songs: manifest.songs.map((s) => ({
      folder: s.folder,
      orderIndex: s.orderIndex,
    })),
  };
}
