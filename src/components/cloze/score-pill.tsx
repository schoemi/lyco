"use client";

interface ScorePillProps {
  correct: number;
  total: number;
}

export function ScorePill({ correct, total }: ScorePillProps) {
  return (
    <span className="inline-flex items-center rounded-full bg-success-100 px-3 py-1 text-sm font-medium text-success-700">
      {correct} / {total} richtig
    </span>
  );
}
