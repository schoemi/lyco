export type QuizTyp = 'multiple-choice' | 'reihenfolge' | 'diktat';

export interface MCQuestion {
  id: string;
  stropheId: string;
  zeileId: string;
  /** Der Zeilentext bis zur Lücke, z.B. "I walk a lonely ___" */
  prompt: string;
  /** Die 4 Antwortoptionen (gemischt) */
  options: string[];
  /** Index der korrekten Antwort in options[] */
  correctIndex: number;
  /** Kontext-Hinweis: Strophen-Name + benachbarte Zeile, wenn der Prompt wenig Kontext hat */
  contextHint?: string;
}

export interface ReihenfolgeQuestion {
  id: string;
  stropheId: string;
  stropheName: string;
  /** Zeilen in zufälliger Reihenfolge */
  shuffledZeilen: { zeileId: string; text: string }[];
  /** Korrekte Reihenfolge der zeileIds */
  correctOrder: string[];
}

export interface DiktatQuestion {
  id: string;
  stropheId: string;
  stropheName: string;
  zeileId: string;
  /** Der Originaltext der Zeile */
  originalText: string;
}

export type QuizQuestion = MCQuestion | ReihenfolgeQuestion | DiktatQuestion;

export interface QuizAnswer {
  questionId: string;
  stropheId: string;
  correct: boolean;
}

export interface DiffSegment {
  text: string;
  type: 'correct' | 'incorrect' | 'missing';
}
