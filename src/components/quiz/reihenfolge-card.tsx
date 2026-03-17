"use client";

import { useState, useCallback, useRef } from "react";
import type { ReihenfolgeQuestion } from "@/types/quiz";
import { validateReihenfolge } from "@/lib/quiz/validate-answer";

interface ReihenfolgeCardProps {
  question: ReihenfolgeQuestion;
  onSubmit: (order: string[]) => void;
  onWeiter: () => void;
}

export function ReihenfolgeCard({
  question,
  onSubmit,
  onWeiter,
}: ReihenfolgeCardProps) {
  const [items, setItems] = useState(question.shuffledZeilen);
  const [submitted, setSubmitted] = useState(false);
  const [lineResults, setLineResults] = useState<('correct' | 'incorrect')[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === dropIndex) return;
      setItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(dropIndex, 0, moved);
        return next;
      });
      setDragIndex(null);
    },
    [dragIndex]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  const swapItems = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return;
      setItems((prev) => {
        const next = [...prev];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
      // Focus the card at the new position after swap
      requestAnimationFrame(() => {
        cardRefs.current[target]?.focus();
      });
    },
    [items.length]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
      if (submitted) return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        swapItems(index, -1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        swapItems(index, 1);
      }
    },
    [submitted, swapItems]
  );

  const handleConfirm = () => {
    const order = items.map((item) => item.zeileId);
    const result = validateReihenfolge(order, question);
    setLineResults(result.lineResults);
    setSubmitted(true);
    onSubmit(order);
  };

  const getLineStatus = (index: number): "correct" | "incorrect" | null => {
    if (!submitted) return null;
    return lineResults[index] ?? null;
  };

  const getCardClasses = (index: number): string => {
    const base =
      "min-h-[44px] min-w-[44px] rounded-lg border px-4 py-3 text-sm font-medium transition-colors select-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2";

    const status = getLineStatus(index);
    if (status === "correct") {
      return `${base} border-green-500 bg-green-50 text-green-800`;
    }
    if (status === "incorrect") {
      return `${base} border-red-500 bg-red-50 text-red-800`;
    }

    if (dragIndex === index) {
      return `${base} border-purple-400 bg-purple-50 text-gray-900 opacity-50`;
    }

    return `${base} border-gray-200 bg-white text-gray-900 hover:border-purple-400 hover:bg-purple-50 cursor-grab active:cursor-grabbing`;
  };

  // Build the correct order text for display after submission
  const correctOrderItems = question.correctOrder.map((zeileId) => {
    const item = question.shuffledZeilen.find((z) => z.zeileId === zeileId);
    return item?.text ?? "";
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-gray-700">
        Bringe die Zeilen von <span className="font-semibold">{question.stropheName}</span> in die richtige Reihenfolge:
      </p>

      <div className="flex flex-col gap-2" role="list" aria-label="Zeilen zum Sortieren">
        {items.map((item, index) => (
          <div
            key={item.zeileId}
            ref={(el) => { cardRefs.current[index] = el; }}
            role="listitem"
            draggable={!submitted}
            tabIndex={0}
            aria-label={`${item.text}, Position ${index + 1} von ${items.length}`}
            aria-roledescription="verschiebbare Karte"
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={getCardClasses(index)}
          >
            {item.text}
          </div>
        ))}
      </div>

      <div aria-live="polite" className="min-h-[24px]">
        {submitted && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-700">
              Korrekte Reihenfolge:
            </p>
            <ol className="list-decimal list-inside text-sm text-gray-600">
              {correctOrderItems.map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {!submitted && (
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          Bestätigen
        </button>
      )}

      {submitted && (
        <button
          type="button"
          onClick={onWeiter}
          className="w-full rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          Weiter
        </button>
      )}
    </div>
  );
}
