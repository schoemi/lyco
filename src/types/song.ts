import { MarkupTyp, MarkupZiel } from "@/generated/prisma/client";
import { AudioQuelleResponse } from "@/types/audio";

// --- Eingabe-Typen ---

export interface CreateSetInput {
  name: string;
  description?: string;
}

export interface UpdateSetInput {
  name: string;
  description?: string;
}

export interface ReorderSetSongItem {
  songId: string;
  orderIndex: number;
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
  coverUrl?: string | null;
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
  coverUrl?: string;
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
  description: string | null;
  songCount: number;
  lastActivity: string | null;
  createdAt: string;
}

export interface SetDetail {
  id: string;
  name: string;
  description: string | null;
  songCount: number;
  songs: SetSongWithProgress[];
}

export interface SetSongWithProgress {
  id: string;
  titel: string;
  kuenstler: string | null;
  sprache: string | null;
  coverUrl: string | null;
  progress: number;
  sessionCount: number;
  status: "neu" | "aktiv" | "gelernt";
  orderIndex: number;
}

export interface SongWithProgress {
  id: string;
  titel: string;
  kuenstler: string | null;
  sprache: string | null;
  emotionsTags: string[];
  coverUrl: string | null;
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
  coverUrl: string | null;
  progress: number;
  sessionCount: number;
  analyse: string | null;
  coachTipp: string | null;
  strophen: StropheDetail[];
  audioQuellen: AudioQuelleResponse[];
  sets: { id: string; name: string }[];
  istFreigabe?: boolean;
  eigentuemerName?: string;
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

// --- Freigabe-Typen ---

export interface CreateSongFreigabeInput {
  songId: string;
  empfaengerEmail: string;
}

export interface CreateSetFreigabeInput {
  setId: string;
  empfaengerEmail: string;
}

export interface FreigabeEmpfaenger {
  id: string;
  empfaenger: { id: string; name: string; email: string };
  erstelltAm: string;
}

export interface EmpfangenesSet {
  freigabeId: string;
  set: { id: string; name: string; description: string | null };
  eigentuemerName: string;
  songs: SongWithProgress[];
}

export interface EmpfangenerSong {
  freigabeId: string;
  song: SongWithProgress;
  eigentuemerName: string;
}

export interface GeteilteInhalte {
  sets: EmpfangenesSet[];
  songs: EmpfangenerSong[];
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
  geteilteInhalte: GeteilteInhalte;
}

export interface DashboardSet {
  id: string;
  name: string;
  description: string | null;
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
