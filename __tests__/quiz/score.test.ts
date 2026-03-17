import { describe, it, expect } from 'vitest';
import { calculateScore, calculateStropheScores, getEmpfehlung } from '@/lib/quiz/score';
import type { QuizAnswer } from '@/types/quiz';
import type { SongDetail } from '@/types/song';

describe('calculateScore', () => {
  it('returns 0 for empty answers', () => {
    const result = calculateScore([]);
    expect(result).toEqual({ correct: 0, total: 0, prozent: 0 });
  });

  it('calculates correct score for mixed answers', () => {
    const answers: QuizAnswer[] = [
      { questionId: 'q1', stropheId: 's1', correct: true },
      { questionId: 'q2', stropheId: 's1', correct: false },
      { questionId: 'q3', stropheId: 's1', correct: true },
      { questionId: 'q4', stropheId: 's1', correct: true },
    ];
    const result = calculateScore(answers);
    expect(result).toEqual({ correct: 3, total: 4, prozent: 75 });
  });

  it('returns 100% when all answers are correct', () => {
    const answers: QuizAnswer[] = [
      { questionId: 'q1', stropheId: 's1', correct: true },
      { questionId: 'q2', stropheId: 's1', correct: true },
    ];
    const result = calculateScore(answers);
    expect(result).toEqual({ correct: 2, total: 2, prozent: 100 });
  });

  it('returns 0% when all answers are wrong', () => {
    const answers: QuizAnswer[] = [
      { questionId: 'q1', stropheId: 's1', correct: false },
      { questionId: 'q2', stropheId: 's1', correct: false },
    ];
    const result = calculateScore(answers);
    expect(result).toEqual({ correct: 0, total: 2, prozent: 0 });
  });
});

describe('calculateStropheScores', () => {
  const song: SongDetail = {
    id: 'song1',
    titel: 'Test Song',
    kuenstler: null,
    sprache: null,
    emotionsTags: [],
    progress: 0,
    sessionCount: 0,
    analyse: null,
    coachTipp: null,
    strophen: [
      { id: 's1', name: 'Verse 1', orderIndex: 0, progress: 0, notiz: null, analyse: null, zeilen: [], markups: [] },
      { id: 's2', name: 'Chorus', orderIndex: 1, progress: 0, notiz: null, analyse: null, zeilen: [], markups: [] },
    ],
  };

  it('returns empty map for empty answers', () => {
    const result = calculateStropheScores([], song);
    expect(result.size).toBe(0);
  });

  it('groups answers by stropheId and calculates prozent', () => {
    const answers: QuizAnswer[] = [
      { questionId: 'q1', stropheId: 's1', correct: true },
      { questionId: 'q2', stropheId: 's1', correct: false },
      { questionId: 'q3', stropheId: 's2', correct: true },
      { questionId: 'q4', stropheId: 's2', correct: true },
    ];
    const result = calculateStropheScores(answers, song);
    expect(result.get('s1')).toBe(50);
    expect(result.get('s2')).toBe(100);
  });

  it('ignores answers for strophes not in the song', () => {
    const answers: QuizAnswer[] = [
      { questionId: 'q1', stropheId: 's1', correct: true },
      { questionId: 'q2', stropheId: 'unknown', correct: true },
    ];
    const result = calculateStropheScores(answers, song);
    expect(result.size).toBe(1);
    expect(result.has('unknown')).toBe(false);
  });
});

describe('getEmpfehlung', () => {
  it('returns nochmal for score below 70', () => {
    expect(getEmpfehlung(0)).toBe('nochmal');
    expect(getEmpfehlung(50)).toBe('nochmal');
    expect(getEmpfehlung(69)).toBe('nochmal');
  });

  it('returns weiter for score 70 or above', () => {
    expect(getEmpfehlung(70)).toBe('weiter');
    expect(getEmpfehlung(85)).toBe('weiter');
    expect(getEmpfehlung(100)).toBe('weiter');
  });
});
