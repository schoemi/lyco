/**
 * Serializes a song's strophes back into raw text format for editing.
 * Uses [Section] markers for strophe names and blank lines between strophes.
 *
 * This is a pure utility function with no server dependencies,
 * safe to import from client components.
 */
export function songToRawText(song: {
  strophen: { name: string; zeilen: { text: string; orderIndex: number }[]; orderIndex: number }[];
}): string {
  const sorted = [...song.strophen].sort((a, b) => a.orderIndex - b.orderIndex);

  return sorted
    .map((s) => {
      const header = `[${s.name}]`;
      const lines = [...s.zeilen]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((z) => z.text);
      return [header, ...lines].join("\n");
    })
    .join("\n\n");
}
