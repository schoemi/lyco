import { AudioTyp, AudioRolle } from "@/generated/prisma/client";

export interface AudioQuelleResponse {
  id: string;
  url: string;
  typ: AudioTyp;
  label: string;
  orderIndex: number;
  rolle: AudioRolle;
}

export interface CreateAudioQuelleInput {
  url: string;
  typ: AudioTyp;
  label: string;
}

export interface UpdateAudioQuelleInput {
  url?: string;
  typ?: AudioTyp;
  label?: string;
  rolle?: AudioRolle;
}
