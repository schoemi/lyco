import type { AudioRolle } from "@/generated/prisma/client";
import type { AudioQuelleResponse } from "@/types/audio";

export interface PlaylistSong {
  id: string;
  titel: string;
  kuenstler: string | null;
  orderIndex: number;
  audioQuellen: AudioQuelleResponse[]; // nur MP3-Quellen
}

export interface SetPlaylistResponse {
  setId: string;
  setName: string;
  songs: PlaylistSong[]; // gefiltert und sortiert
  skippedSongCount: number; // Songs ohne MP3-Quelle
}

export type { AudioRolle };
