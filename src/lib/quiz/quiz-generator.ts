import type { SongDetail, StropheDetail } from '@/types/song';
import type { MCQuestion, ReihenfolgeQuestion, DiktatQuestion } from '@/types/quiz';

/**
 * Seeded PRNG (mulberry32).
 * Returns a function that produces deterministic floats in [0, 1).
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Filters strophes to only those in activeStrophenIds (if provided).
 * Skips strophes with no lines (Req 11.4).
 */
export function filterActiveStrophen(
  song: SongDetail,
  activeStrophenIds?: Set<string>,
): StropheDetail[] {
  return song.strophen.filter((s) => {
    if (s.zeilen.length === 0) return false;
    if (activeStrophenIds && !activeStrophenIds.has(s.id)) return false;
    return true;
  });
}

/**
 * Collects all unique words from active strophes.
 */
export function collectWords(
  song: SongDetail,
  activeStrophenIds?: Set<string>,
): string[] {
  const strophen = filterActiveStrophen(song, activeStrophenIds);
  const wordSet = new Set<string>();
  for (const strophe of strophen) {
    for (const zeile of strophe.zeilen) {
      const words = zeile.text.split(/\s+/).filter((w) => w.length > 0);
      for (const word of words) {
        wordSet.add(word);
      }
    }
  }
  return Array.from(wordSet);
}

/**
 * Fisher-Yates shuffle using a provided RNG for determinism.
 * Returns a new shuffled array (does not mutate input).
 */
export function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Maximum number of MC questions per session */
export const MC_QUESTION_LIMIT = 10;

/**
 * Builds a context hint for questions where the prompt alone lacks context
 * (e.g. gap at position 0). Shows strophe name + adjacent line.
 */
function buildContextHint(
  strophe: StropheDetail,
  zeileIndex: number,
): string {
  const sorted = [...strophe.zeilen].sort((a, b) => a.orderIndex - b.orderIndex);
  const parts: string[] = [strophe.name];

  if (zeileIndex > 0) {
    // Show previous line
    parts.push(sorted[zeileIndex - 1].text);
  } else if (sorted.length > 1) {
    // First line → show next line as context (marked)
    parts.push('→ ' + sorted[zeileIndex + 1].text);
  }

  return parts.join(' · ');
}

/**
 * Generates Multiple-Choice questions.
 * Per line: picks a random word position as the gap, builds prompt from text before it,
 * selects 3 distractors from the word pool, shuffles 4 options.
 * Limited to MC_QUESTION_LIMIT questions, randomly sampled from all available lines.
 * Req 2.1–2.5, 10.7, 11.4
 */
export function generateMCQuestions(
  song: SongDetail,
  activeStrophenIds?: Set<string>,
  seed?: number,
): MCQuestion[] {
  const rng = mulberry32(seed ?? Date.now());
  const strophen = filterActiveStrophen(song, activeStrophenIds);
  const wordPool = collectWords(song, activeStrophenIds);

  // Collect all candidate lines with their strophe context
  const candidates: { strophe: StropheDetail; zeile: typeof strophen[0]['zeilen'][0]; zeileIndex: number }[] = [];
  for (const strophe of strophen) {
    const sorted = [...strophe.zeilen].sort((a, b) => a.orderIndex - b.orderIndex);
    for (let i = 0; i < sorted.length; i++) {
      const words = sorted[i].text.split(/\s+/).filter((w) => w.length > 0);
      if (words.length === 0) continue;
      candidates.push({ strophe, zeile: sorted[i], zeileIndex: i });
    }
  }

  // Shuffle and limit to MC_QUESTION_LIMIT
  const selected = shuffleArray(candidates, rng).slice(0, MC_QUESTION_LIMIT);

  const questions: MCQuestion[] = [];

  for (const { strophe, zeile, zeileIndex } of selected) {
    const words = zeile.text.split(/\s+/).filter((w) => w.length > 0);

    // Pick a random position for the gap
    const gapIndex = Math.floor(rng() * words.length);
    const correctWord = words[gapIndex];

    // Build prompt: text up to the gap, then "___"
    const promptWords = words.slice(0, gapIndex);
    const prompt = promptWords.length > 0
      ? promptWords.join(' ') + ' ___'
      : '___';

    // Add context hint when prompt starts with gap (no leading text)
    const contextHint = gapIndex === 0
      ? buildContextHint(strophe, zeileIndex)
      : undefined;

    // Select 3 distractors from word pool (not identical to correct word)
    const distractorPool = wordPool.filter((w) => w !== correctWord);
    const distractors: string[] = [];

    if (distractorPool.length > 0) {
      const shuffledPool = shuffleArray(distractorPool, rng);
      for (let i = 0; i < 3; i++) {
        distractors.push(shuffledPool[i % shuffledPool.length]);
      }
    } else {
      // All words are the same — fill with the correct word (Req 2.5)
      for (let i = 0; i < 3; i++) {
        distractors.push(correctWord);
      }
    }

    // Build options: correct + 3 distractors, then shuffle
    const options = shuffleArray([correctWord, ...distractors], rng);
    const correctIndex = options.indexOf(correctWord);

    questions.push({
      id: `mc-${strophe.id}-${zeile.id}`,
      stropheId: strophe.id,
      zeileId: zeile.id,
      prompt,
      contextHint,
      options,
      correctIndex,
    });
  }

  return questions;
}

/**
 * Generates Reihenfolge (ordering) questions.
 * One question per strophe with ≥2 lines. Lines are shuffled.
 * Req 4.1, 4.7, 10.7, 11.4
 */
export function generateReihenfolgeQuestions(
  song: SongDetail,
  activeStrophenIds?: Set<string>,
  seed?: number,
): ReihenfolgeQuestion[] {
  const rng = mulberry32(seed ?? Date.now());
  const strophen = filterActiveStrophen(song, activeStrophenIds);
  const questions: ReihenfolgeQuestion[] = [];

  for (const strophe of strophen) {
    // Skip strophes with ≤1 line (Req 4.7)
    if (strophe.zeilen.length <= 1) continue;

    // Correct order by orderIndex
    const sorted = [...strophe.zeilen].sort((a, b) => a.orderIndex - b.orderIndex);
    const correctOrder = sorted.map((z) => z.id);

    const zeilenItems = sorted.map((z) => ({ zeileId: z.id, text: z.text }));
    const shuffledZeilen = shuffleArray(zeilenItems, rng);

    questions.push({
      id: `rf-${strophe.id}`,
      stropheId: strophe.id,
      stropheName: strophe.name,
      shuffledZeilen,
      correctOrder,
    });
  }

  return questions;
}

/**
 * Generates Diktat (dictation) questions.
 * One question per line, with strophe name as context.
 * Req 5.1, 10.7, 11.4
 */
export function generateDiktatQuestions(
  song: SongDetail,
  activeStrophenIds?: Set<string>,
  seed?: number,
): DiktatQuestion[] {
  // seed is accepted for API consistency but not used for ordering here
  const strophen = filterActiveStrophen(song, activeStrophenIds);
  const questions: DiktatQuestion[] = [];

  for (const strophe of strophen) {
    for (const zeile of strophe.zeilen) {
      questions.push({
        id: `dk-${strophe.id}-${zeile.id}`,
        stropheId: strophe.id,
        stropheName: strophe.name,
        zeileId: zeile.id,
        originalText: zeile.text,
      });
    }
  }

  return questions;
}
