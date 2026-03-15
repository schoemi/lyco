// --- Eingabe-Typen ---

export interface UpsertInterpretationInput {
  stropheId: string;
  text: string;
}

// --- Ausgabe-Typen ---

export interface InterpretationResponse {
  id: string;
  stropheId: string;
  text: string;
  updatedAt: string;
}
