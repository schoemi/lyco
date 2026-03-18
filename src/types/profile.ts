export interface ProfileData {
  id: string;
  name: string | null;
  email: string;
  alter: number | null;
  geschlecht: "MAENNLICH" | "WEIBLICH" | "DIVERS" | null;
  erfahrungslevel: "ANFAENGER" | "FORTGESCHRITTEN" | "ERFAHREN" | "PROFI" | null;
  stimmlage: string | null;
  genre: string | null;
  sprache: string;
  geniusApiKeyMasked: string | null;
}

export interface UpdateProfileInput {
  name?: string;
  alter?: number | null;
  geschlecht?: "MAENNLICH" | "WEIBLICH" | "DIVERS" | null;
  erfahrungslevel?: "ANFAENGER" | "FORTGESCHRITTEN" | "ERFAHREN" | "PROFI" | null;
  stimmlage?: string | null;
  genre?: string | null;
  sprache?: string;
  geniusApiKey?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CoachResult {
  coachTipp: string;
}
