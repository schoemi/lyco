"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ImportTabs } from "@/components/import/import-tabs";
import { TextEditor } from "@/components/import/text-editor";
import { PdfUploader } from "@/components/import/pdf-uploader";
import { GeniusSearchPanel } from "@/components/import/genius-search-panel";
import { parseSongtext } from "@/lib/import/songtext-parser";
import { toImportSongInput } from "@/lib/import/to-import-input";
import type { ImportMode } from "@/types/import";

interface Zeile {
  text: string;
  uebersetzung: string;
}

interface Strophe {
  name: string;
  zeilen: Zeile[];
}

function createZeile(): Zeile {
  return { text: "", uebersetzung: "" };
}

function createStrophe(): Strophe {
  return { name: "", zeilen: [createZeile()] };
}

export default function SongImportPage() {
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<ImportMode>("text");

  // Manual form state (existing)
  const [titel, setTitel] = useState("");
  const [kuenstler, setKuenstler] = useState("");
  const [sprache, setSprache] = useState("");
  const [emotionsTags, setEmotionsTags] = useState("");
  const [strophen, setStrophen] = useState<Strophe[]>([createStrophe()]);

  // Text import state
  const [songtext, setSongtext] = useState("");
  const [textTitel, setTextTitel] = useState("");
  const [textKuenstler, setTextKuenstler] = useState("");

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // --- Manual form logic (unchanged) ---

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!titel.trim()) {
      errors.titel = "Titel ist erforderlich";
    }

    if (strophen.length === 0) {
      errors.strophen = "Mindestens eine Strophe erforderlich";
    }

    for (let i = 0; i < strophen.length; i++) {
      const s = strophen[i];
      if (s.zeilen.length === 0 || s.zeilen.every((z) => !z.text.trim())) {
        errors[`strophen_${i}_zeilen`] = `Strophe ${i + 1}: Mindestens eine Zeile mit Text erforderlich`;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function updateStrophe(index: number, field: keyof Strophe, value: string) {
    setStrophen((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  function addStrophe() {
    setStrophen((prev) => [...prev, createStrophe()]);
  }

  function removeStrophe(index: number) {
    if (strophen.length <= 1) return;
    setStrophen((prev) => prev.filter((_, i) => i !== index));
  }

  function updateZeile(stropheIdx: number, zeileIdx: number, field: keyof Zeile, value: string) {
    setStrophen((prev) =>
      prev.map((s, si) =>
        si === stropheIdx
          ? {
              ...s,
              zeilen: s.zeilen.map((z, zi) =>
                zi === zeileIdx ? { ...z, [field]: value } : z
              ),
            }
          : s
      )
    );
  }

  function addZeile(stropheIdx: number) {
    setStrophen((prev) =>
      prev.map((s, i) =>
        i === stropheIdx ? { ...s, zeilen: [...s.zeilen, createZeile()] } : s
      )
    );
  }

  function removeZeile(stropheIdx: number, zeileIdx: number) {
    if (strophen[stropheIdx].zeilen.length <= 1) return;
    setStrophen((prev) =>
      prev.map((s, i) =>
        i === stropheIdx
          ? { ...s, zeilen: s.zeilen.filter((_, zi) => zi !== zeileIdx) }
          : s
      )
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    setLoading(true);

    const payload = {
      titel: titel.trim(),
      kuenstler: kuenstler.trim() || undefined,
      sprache: sprache.trim() || undefined,
      emotionsTags: emotionsTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      strophen: strophen.map((s) => ({
        name: s.name.trim() || undefined,
        zeilen: s.zeilen
          .filter((z) => z.text.trim())
          .map((z) => ({
            text: z.text.trim(),
            uebersetzung: z.uebersetzung.trim() || undefined,
          })),
      })),
    };

    try {
      const res = await fetch("/api/songs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Import fehlgeschlagen");
        setLoading(false);
        return;
      }

      const data = await res.json();
      router.push(`/songs/${data.song.id}`);
    } catch {
      setError("Netzwerkfehler. Bitte versuche es erneut.");
      setLoading(false);
    }
  }

  // --- Text import logic ---

  async function handleTextImport() {
    setError("");
    if (!textTitel.trim()) {
      setError("Titel ist erforderlich");
      return;
    }
    const parsed = parseSongtext(songtext);
    if (parsed.strophen.length === 0) {
      setError("Kein Songtext erkannt");
      return;
    }
    setLoading(true);
    const payload = toImportSongInput(textTitel.trim(), textKuenstler.trim(), parsed);
    try {
      const res = await fetch("/api/songs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Import fehlgeschlagen");
        setLoading(false);
        return;
      }
      const data = await res.json();
      router.push(`/songs/${data.song.id}`);
    } catch {
      setError("Netzwerkfehler. Bitte versuche es erneut.");
      setLoading(false);
    }
  }

  // --- PDF result handler ---

  function handlePdfResult(data: { titel: string; kuenstler: string; text: string }) {
    setTextTitel(data.titel);
    setTextKuenstler(data.kuenstler);
    setSongtext(data.text);
    setActiveTab("text");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Song importieren</h1>

      <ImportTabs active={activeTab} onChange={setActiveTab} />

      {error && (
        <div role="alert" className="mt-4 rounded-md bg-error-50 p-3 text-sm text-error-700">
          {error}
        </div>
      )}

      {/* Tab: Manuell */}
      <div id="tabpanel-manuell" role="tabpanel" className={activeTab === "manuell" ? "" : "hidden"}>
        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
          {/* Metadaten */}
          <div className="space-y-4">
            <div>
              <label htmlFor="titel" className="mb-1 block text-sm font-medium text-neutral-700">
                Titel *
              </label>
              <input
                id="titel"
                type="text"
                aria-label="Song-Titel"
                aria-required="true"
                aria-invalid={!!fieldErrors.titel}
                aria-describedby={fieldErrors.titel ? "titel-error" : undefined}
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500 ${
                  fieldErrors.titel ? "border-error-500" : "border-neutral-300"
                }`}
                placeholder="z.B. Bohemian Rhapsody"
              />
              {fieldErrors.titel && (
                <p id="titel-error" role="alert" className="mt-1 text-sm text-error-600">
                  {fieldErrors.titel}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="kuenstler" className="mb-1 block text-sm font-medium text-neutral-700">
                Künstler
              </label>
              <input
                id="kuenstler"
                type="text"
                aria-label="Künstler"
                value={kuenstler}
                onChange={(e) => setKuenstler(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
                placeholder="z.B. Queen"
              />
            </div>

            <div>
              <label htmlFor="sprache" className="mb-1 block text-sm font-medium text-neutral-700">
                Sprache
              </label>
              <input
                id="sprache"
                type="text"
                aria-label="Sprache"
                value={sprache}
                onChange={(e) => setSprache(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
                placeholder="z.B. Englisch"
              />
            </div>

            <div>
              <label htmlFor="emotionsTags" className="mb-1 block text-sm font-medium text-neutral-700">
                Emotions-Tags (kommagetrennt)
              </label>
              <input
                id="emotionsTags"
                type="text"
                aria-label="Emotions-Tags"
                value={emotionsTags}
                onChange={(e) => setEmotionsTags(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
                placeholder="z.B. Melancholie, Sehnsucht"
              />
            </div>
          </div>

          {/* Strophen */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">Strophen</h2>
              <button
                type="button"
                onClick={addStrophe}
                aria-label="Strophe hinzufügen"
                className="min-h-[44px] min-w-[44px] rounded-md bg-newsong-600 px-3 py-2 text-sm font-medium text-white hover:bg-newsong-700 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2"
              >
                + Strophe
              </button>
            </div>

            {fieldErrors.strophen && (
              <p role="alert" className="mb-2 text-sm text-error-600">
                {fieldErrors.strophen}
              </p>
            )}

            <div className="space-y-4">
              {strophen.map((strophe, si) => (
                <div key={si} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <label
                      htmlFor={`strophe-name-${si}`}
                      className="text-sm font-medium text-neutral-700"
                    >
                      Strophe {si + 1} – Name
                    </label>
                    {strophen.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStrophe(si)}
                        aria-label={`Strophe ${si + 1} entfernen`}
                        className="min-h-[44px] min-w-[44px] rounded-md bg-error-50 px-3 py-2 text-sm font-medium text-error-700 hover:bg-error-100 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2"
                      >
                        Entfernen
                      </button>
                    )}
                  </div>

                  <input
                    id={`strophe-name-${si}`}
                    type="text"
                    aria-label={`Name der Strophe ${si + 1}`}
                    value={strophe.name}
                    onChange={(e) => updateStrophe(si, "name", e.target.value)}
                    className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
                    placeholder="z.B. Verse 1, Chorus, Bridge"
                  />

                  {fieldErrors[`strophen_${si}_zeilen`] && (
                    <p role="alert" className="mb-2 text-sm text-error-600">
                      {fieldErrors[`strophen_${si}_zeilen`]}
                    </p>
                  )}

                  <div className="space-y-2">
                    {strophe.zeilen.map((zeile, zi) => (
                      <div key={zi} className="flex gap-2">
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            aria-label={`Text der Zeile ${zi + 1} in Strophe ${si + 1}`}
                            value={zeile.text}
                            onChange={(e) => updateZeile(si, zi, "text", e.target.value)}
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
                            placeholder="Zeilentext"
                          />
                          <input
                            type="text"
                            aria-label={`Übersetzung der Zeile ${zi + 1} in Strophe ${si + 1}`}
                            value={zeile.uebersetzung}
                            onChange={(e) => updateZeile(si, zi, "uebersetzung", e.target.value)}
                            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
                            placeholder="Übersetzung (optional)"
                          />
                        </div>
                        {strophe.zeilen.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeZeile(si, zi)}
                            aria-label={`Zeile ${zi + 1} aus Strophe ${si + 1} entfernen`}
                            className="min-h-[44px] min-w-[44px] self-start rounded-md bg-neutral-100 px-2 py-2 text-sm text-neutral-600 hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addZeile(si)}
                    aria-label={`Zeile zu Strophe ${si + 1} hinzufügen`}
                    className="mt-2 min-h-[44px] min-w-[44px] rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
                  >
                    + Zeile
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            aria-label="Song importieren"
            className="min-h-[44px] w-full rounded-md bg-newsong-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-newsong-700 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Importiere…" : "Song importieren"}
          </button>
        </form>
      </div>

      {/* Tab: Text einfügen */}
      <div id="tabpanel-text" role="tabpanel" className={activeTab === "text" ? "" : "hidden"}>
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="text-titel" className="mb-1 block text-sm font-medium text-neutral-700">
              Titel *
            </label>
            <input
              id="text-titel"
              type="text"
              aria-label="Song-Titel"
              aria-required="true"
              value={textTitel}
              onChange={(e) => setTextTitel(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
              placeholder="z.B. Bohemian Rhapsody"
            />
          </div>

          <div>
            <label htmlFor="text-kuenstler" className="mb-1 block text-sm font-medium text-neutral-700">
              Künstler
            </label>
            <input
              id="text-kuenstler"
              type="text"
              aria-label="Künstler"
              value={textKuenstler}
              onChange={(e) => setTextKuenstler(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-newsong-500"
              placeholder="z.B. Queen"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Songtext
            </label>
            <TextEditor value={songtext} onChange={setSongtext} />
          </div>

          <button
            type="button"
            onClick={handleTextImport}
            disabled={loading}
            aria-label="Song importieren"
            className="min-h-[44px] w-full rounded-md bg-newsong-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-newsong-700 focus:outline-none focus:ring-2 focus:ring-newsong-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Importiere…" : "Song importieren"}
          </button>
        </div>
      </div>

      {/* Tab: PDF Upload */}
      <div id="tabpanel-pdf" role="tabpanel" className={activeTab === "pdf" ? "" : "hidden"}>
        <div className="mt-6 space-y-4">
          <p className="text-sm text-neutral-600">
            Lade eine PDF-Datei mit einem Songtext hoch. Der Text wird automatisch extrahiert und zur Vorschau im Text-Editor angezeigt.
          </p>
          <PdfUploader
            onResult={handlePdfResult}
            onError={(msg) => setError(msg)}
          />
        </div>
      </div>

      {/* Tab: Genius */}
      <div id="tabpanel-genius" role="tabpanel" className={activeTab === "genius" ? "" : "hidden"}>
        <GeniusSearchPanel
          onImportSuccess={(songId) => router.push(`/songs/${songId}`)}
          onError={() => {}}
        />
      </div>
    </div>
  );
}
