import { WEAKNESS_THRESHOLD } from "./constants";
import type { StropheDetail, StropheProgress, ZeileDetail } from "@/types/song";

/** Gibt die IDs aller Strophen mit Fortschritt < WEAKNESS_THRESHOLD zurück */
export function getWeakStrophenIds(progress: StropheProgress[]): Set<string> {
  return new Set(
    progress
      .filter((p) => p.prozent < WEAKNESS_THRESHOLD)
      .map((p) => p.stropheId),
  );
}

/** Prüft ob mindestens eine Strophe unter der Schwelle liegt */
export function hasWeaknesses(progress: StropheProgress[]): boolean {
  return progress.some((p) => p.prozent < WEAKNESS_THRESHOLD);
}

/** Filtert Strophen mit istInstrumental === true heraus */
export function filterLernbareStrophen(
  strophen: StropheDetail[],
): StropheDetail[] {
  return strophen.filter((s) => !s.istInstrumental);
}

/** Filtert Zeilen mit istKommentar === true heraus */
export function filterLernbareZeilen(zeilen: ZeileDetail[]): ZeileDetail[] {
  return zeilen.filter((z) => !z.istKommentar);
}
