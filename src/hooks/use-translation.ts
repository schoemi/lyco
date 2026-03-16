"use client";

import { useCallback, useState } from "react";
import type { SongDetail, UebersetzungResult } from "@/types/song";

export interface UseTranslationOptions {
  songId: string;
  setSong: React.Dispatch<React.SetStateAction<SongDetail | null>>;
}

export interface UseTranslationReturn {
  translating: boolean;
  translateError: string | null;
  translateSuccess: boolean;
  zielsprache: string;
  setZielsprache: (sprache: string) => void;
  handleTranslate: () => Promise<void>;
}

export function useTranslation({
  songId,
  setSong,
}: UseTranslationOptions): UseTranslationReturn {
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [translateSuccess, setTranslateSuccess] = useState(false);
  const [zielsprache, setZielsprache] = useState("Deutsch");

  const handleTranslate = useCallback(async () => {
    if (translating || !songId) return;

    setTranslating(true);
    setTranslateError(null);
    setTranslateSuccess(false);

    try {
      const res = await fetch(`/api/songs/${songId}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zielsprache }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Übersetzung fehlgeschlagen");
      }

      const result: UebersetzungResult = await res.json();

      setSong((prev) => {
        if (!prev) return prev;
        const updatedStrophen = prev.strophen.map((strophe) => {
          const resultStrophe = result.strophen.find(
            (s) => s.stropheId === strophe.id
          );
          if (!resultStrophe) return strophe;
          const updatedZeilen = strophe.zeilen.map((zeile) => {
            const resultZeile = resultStrophe.zeilen.find(
              (z) => z.zeileId === zeile.id
            );
            return resultZeile
              ? { ...zeile, uebersetzung: resultZeile.uebersetzung }
              : zeile;
          });
          return { ...strophe, zeilen: updatedZeilen };
        });
        return { ...prev, strophen: updatedStrophen };
      });

      setTranslateSuccess(true);
    } catch (err) {
      setTranslateError(
        err instanceof Error ? err.message : "Ein Fehler ist aufgetreten"
      );
    } finally {
      setTranslating(false);
    }
  }, [songId, translating, zielsprache, setSong]);

  return {
    translating,
    translateError,
    translateSuccess,
    zielsprache,
    setZielsprache,
    handleTranslate,
  };
}
