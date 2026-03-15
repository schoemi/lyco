import type { ParsedSong } from "@/types/import";
import type { ImportSongInput } from "@/types/song";

export function toImportSongInput(
  titel: string,
  kuenstler: string,
  parsed: ParsedSong
): ImportSongInput {
  return {
    titel,
    kuenstler: kuenstler || undefined,
    strophen: parsed.strophen.map((s) => ({
      name: s.name,
      zeilen: s.zeilen.map((text) => ({ text })),
    })),
  };
}
