import type { DifficultyLevel, GapData } from "@/types/cloze";

export interface ZeileInput {
  id: string;
  text: string;
}

export const DIFFICULTY_CONFIG: Record<DifficultyLevel, { ratio: number; preferKeywords: boolean }> = {
  leicht: { ratio: 0.2, preferKeywords: true },
  mittel: { ratio: 0.4, preferKeywords: false },
  schwer: { ratio: 0.6, preferKeywords: false },
  blind: { ratio: 1.0, preferKeywords: false },
};

export const STOP_WORDS = new Set([
  "der", "die", "das", "ein", "eine", "und", "oder", "aber",
  "in", "im", "an", "am", "auf", "aus", "bei", "mit", "von",
  "zu", "zum", "zur", "für", "über", "unter", "nach", "vor",
  "the", "a", "an", "and", "or", "but", "in", "on", "at",
  "to", "for", "of", "with", "by", "from", "is", "are", "was",
  "i", "you", "he", "she", "it", "we", "they", "my", "your",
  "ich", "du", "er", "sie", "es", "wir", "ihr", "mein", "dein",
]);

export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export function generateGaps(zeilen: ZeileInput[], difficulty: DifficultyLevel): GapData[] {
  const config = DIFFICULTY_CONFIG[difficulty];
  const result: GapData[] = [];

  for (const zeile of zeilen) {
    const words = zeile.text.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) continue;

    let numGaps = Math.round(words.length * config.ratio);

    // Special rule: for lines with < 2 words and non-Blind, keep at least 1 word visible
    if (words.length < 2 && difficulty !== "blind") {
      numGaps = Math.min(numGaps, words.length - 1);
    }

    numGaps = Math.max(0, Math.min(numGaps, words.length));

    const seed = hashString(zeile.id + difficulty);
    const rng = seededRandom(seed);

    // Build indices with priority sorting for "leicht"
    const indices = words.map((_, i) => i);

    if (config.preferKeywords) {
      // For "leicht": sort so keywords (longer, non-stop-words) come first
      indices.sort((a, b) => {
        const aIsStop = STOP_WORDS.has(words[a].toLowerCase());
        const bIsStop = STOP_WORDS.has(words[b].toLowerCase());
        if (aIsStop !== bIsStop) return aIsStop ? 1 : -1;
        // Prefer longer words
        if (words[b].length !== words[a].length) return words[b].length - words[a].length;
        return 0;
      });
    }

    // Shuffle indices using seeded random (Fisher-Yates)
    // For "leicht", we only shuffle within priority groups to maintain keyword preference
    if (!config.preferKeywords) {
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
    } else {
      // Shuffle within groups: non-stop-words first, then stop-words
      const nonStop = indices.filter((i) => !STOP_WORDS.has(words[i].toLowerCase()));
      const stop = indices.filter((i) => STOP_WORDS.has(words[i].toLowerCase()));

      // Shuffle each group
      for (let i = nonStop.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [nonStop[i], nonStop[j]] = [nonStop[j], nonStop[i]];
      }
      for (let i = stop.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [stop[i], stop[j]] = [stop[j], stop[i]];
      }

      indices.length = 0;
      indices.push(...nonStop, ...stop);
    }

    // Select first numGaps indices as gaps
    const gapIndices = new Set(indices.slice(0, numGaps));

    for (let i = 0; i < words.length; i++) {
      result.push({
        gapId: `${zeile.id}-${i}`,
        zeileId: zeile.id,
        wordIndex: i,
        word: words[i],
        isGap: gapIndices.has(i),
      });
    }
  }

  return result;
}
