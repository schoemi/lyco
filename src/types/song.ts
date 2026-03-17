import { MarkupTyp, MarkupZiel } from "@/generated/prisma/client";

// --- Eingabe-Typen ---

export interface CreateSetInput {
  name: string;
}

export interface CreateSongInput {
  titel: string;
  kuenstler?: string;
  sprache?: string;
  emotionsTags?: string[];
}

export interface UpdateSongInput {
  titel?: string;
  kuenstler?: string;
  sprache?: string;
  emotionsTags?: string[];
}

export interface ImportStropheInput {
  name: string;
  zeilen: ImportZeileInput[];
  markups?: ImportMarkupInput[];
}

export interface ImportZeileInput {
  text: string;
  uebersetzung?: string;
  markups?: ImportMarkupInput[];
}

export interface ImportMarkupInput {
  typ: MarkupTyp;
  ziel: MarkupZiel;
  wert?: string;
  timecodeMs?: number;
  wortIndex?: number;
}

export interface ImportSongInput {
  titel: string;
  kuenstler?: string;
  sprache?: string;
  emotionsTags?: string[];
  strophen: ImportStropheInput[];
}

export interface CreateMarkupInput {
  typ: MarkupTyp;
  ziel: MarkupZiel;
  stropheId?: string;
  zeileId?: string;
  wortIndex?: number;
  wert?: string;
  timecodeMs?: number;
}

export interface UpdateMarkupInput {
  wert?: string;
  timecodeMs?: number;
}

// --- Ausgabe-Typen ---

export interface SetWithSongCount {
  id: string;
  name: string;
  songCount: number;
  lastActivity: string | null;
  createdAt: string;
}

export interface SongWithProgress {
  id: string;
  titel: string;
  kuenstler: string | null;
  sprache: string | null;
  emotionsTags: string[];
  progress: number;
  sessionCount: number;
  status: "neu" | "aktiv" | "gelernt";
}

export interface SongDetail {
  id: string;
  titel: string;
  kuenstler: string | null;
  sprache: string | null;
  emotionsTags: string[];
  progress: number;
  sessionCount: number;
  analyse: string | null;
  coachTipp: string | null;
  strophen: StropheDetail[];
}

export interface StropheDetail {
  id: string;
  name: string;
  orderIndex: number;
  progress: number;
  notiz: string | null;
  analyse: string | null;
  zeilen: ZeileDetail[];
  markups: MarkupResponse[];
}

export interface ZeileDetail {
  id: string;
  text: string;
  uebersetzung: string | null;
  orderIndex: number;
  markups: MarkupResponse[];
}

export interface MarkupResponse {
  id: string;
  typ: MarkupTyp;
  ziel: MarkupZiel;
  wert: string | null;
  timecodeMs: number | null;
  wortIndex: number | null;
}

export interface StropheProgress {
  stropheId: string;
  stropheName: string;
  prozent: number;
}

// --- Analyse-Typen ---

export interface SongAnalyseResult {
  songAnalyse: string;
  emotionsTags: string[];
  strophenAnalysen: StropheAnalyseResult[];
}

export interface StropheAnalyseResult {
  stropheId: string;
  analyse: string;
}

// --- Dashboard ---

export interface DashboardData {
  sets: DashboardSet[];
  allSongs: SongWithProgress[];
  totalSongs: number;
  totalSessions: number;
  averageProgress: number;
  faelligeStrophenAnzahl: number;
  streak: number;
  activeSongCount: number;
}

export interface DashboardSet {
  id: string;
  name: string;
  songs: SongWithProgress[];
}

// --- Eingabe-Typen für Strophen-CRUD ---

export interface CreateStropheInput {
  name: string;
}

export interface UpdateStropheInput {
  name?: string;
}

export interface ReorderItem {
  id: string;
  orderIndex: number;
}

// --- Eingabe-Typen für Zeilen-CRUD ---

export interface CreateZeileInput {
  text: string;
  uebersetzung?: string;
}

export interface UpdateZeileInput {
  text?: string;
  uebersetzung?: string;
}

// --- Übersetzungs-Typen ---

export interface UebersetzungResult {
  songId: string;
  zielsprache: string;
  strophen: StropheUebersetzungResult[];
}

export interface StropheUebersetzungResult {
  stropheId: string;
  stropheName: string;
  zeilen: ZeileUebersetzungResult[];
}

export interface ZeileUebersetzungResult {
  zeileId: string;
  originalText: string;
  uebersetzung: string;
}
