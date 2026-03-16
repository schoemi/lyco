export type DifficultyLevel = "leicht" | "mittel" | "schwer" | "blind";

export interface GapData {
  gapId: string;
  zeileId: string;
  wordIndex: number;
  word: string;
  isGap: boolean;
  prefix: string;
  suffix: string;
}

export interface ScoreState {
  correct: number;
  total: number;
}

export type FeedbackState = "correct" | "incorrect" | null;
