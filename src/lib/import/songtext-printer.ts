import type { ParsedSong } from "@/types/import";

export function printSongtext(parsed: ParsedSong): string {
  return parsed.strophen
    .map((strophe) => [`[${strophe.name}]`, ...strophe.zeilen].join("\n"))
    .join("\n\n");
}
