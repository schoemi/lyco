# Implementierungsplan: Frontend-Integration Songtext-Übersetzung

## Übersicht

Schrittweise Implementierung der Übersetzungs-UI: Zuerst der Shared Hook, dann die beiden Einzelkomponenten (Button + Sprachauswahl), dann Integration in die Song-Detailseite, dann Integration in die Emotional-Lernen-Seite. Jeder Schritt baut auf dem vorherigen auf.

## Aufgaben

- [x] 1. `useTranslation` Hook erstellen
  - [x] 1.1 Hook in `src/hooks/use-translation.ts` implementieren
    - `UseTranslationOptions` Interface: `songId: string`, `setSong: React.Dispatch<React.SetStateAction<SongDetail | null>>`
    - `UseTranslationReturn` Interface: `translating`, `translateError`, `translateSuccess`, `zielsprache`, `setZielsprache`, `handleTranslate`
    - `handleTranslate`: Guard gegen Doppelklick, POST an `/api/songs/${songId}/translate` mit `{ zielsprache }`, Fehlerbehandlung (Fehlermeldung aus `res.json().error`), bei Erfolg `setSong` mit aktualisierten `uebersetzung`-Feldern (Zuordnung über `zeileId`/`stropheId`)
    - Standardwert für `zielsprache`: `"Deutsch"`
    - _Anforderungen: 1.2, 1.3, 1.4, 1.5, 1.6, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2_

  - [x] 1.2 Property-Test für `useTranslation` Hook schreiben
    - **Property 1: Optimistisches UI-Update – Zuordnung über zeileId**
    - Für beliebige `SongDetail`-Daten und ein passendes `UebersetzungResult`: Nach `setSong`-Aufruf enthält jede Zeile die korrekte `uebersetzung` gemäß `zeileId`-Zuordnung
    - **Validiert: Anforderungen 4.1, 4.2**

- [x] 2. `TranslateButton` Komponente erstellen
  - [x] 2.1 Komponente in `src/components/songs/translate-button.tsx` implementieren
    - Props: `translating: boolean`, `onClick: () => void`
    - Text: `translating ? "Übersetze…" : "🌐 Übersetzen"`
    - Deaktiviert wenn `translating === true`
    - `aria-label="Songtext übersetzen"`, `aria-busy={translating}`
    - Mindestgröße 44×44px, Styling: `border-blue-300 text-blue-700 hover:bg-blue-50`
    - _Anforderungen: 1.1, 1.3, 6.1, 6.3, 6.6_

  - [x] 2.2 Unit-Tests für `TranslateButton` schreiben
    - Button-Text wechselt zwischen „🌐 Übersetzen" und „Übersetze…"
    - Button ist deaktiviert wenn `translating=true`
    - `aria-label` und `aria-busy` korrekt gesetzt
    - _Anforderungen: 1.3, 6.1, 6.3_

- [x] 3. `LanguageSelector` Komponente erstellen
  - [x] 3.1 Komponente in `src/components/songs/language-selector.tsx` implementieren
    - Props: `value: string`, `onChange: (sprache: string) => void`, `disabled?: boolean`
    - `SPRACHEN`-Konstante: Deutsch, Englisch, Spanisch, Französisch, Italienisch, Portugiesisch
    - `<label>` mit `htmlFor` oder `aria-label="Zielsprache auswählen"`
    - Natives `<select>`-Element, Mindesthöhe 44px
    - _Anforderungen: 2.1, 2.2, 2.3, 6.2, 6.5_

  - [x] 3.2 Unit-Tests für `LanguageSelector` schreiben
    - Alle 6 Sprachen als Optionen vorhanden
    - `onChange` wird bei Auswahl aufgerufen
    - `aria-label` korrekt gesetzt
    - _Anforderungen: 2.2, 6.2, 6.5_

- [x] 4. Checkpoint – Basiskomponenten validieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer fragen.

- [x] 5. Integration in die Song-Detailseite
  - [x] 5.1 `useTranslation` Hook in `src/app/(main)/songs/[id]/page.tsx` einbinden
    - Import und Aufruf von `useTranslation({ songId: id, setSong })`
    - `TranslateButton` und `LanguageSelector` in der Aktionsleiste neben dem „Analysieren"-Button platzieren
    - Fehlerbereich für `translateError` (roter Rahmen mit `role="alert"`, analog zu `analyseError`)
    - Erfolgsmeldung nach erfolgreicher Übersetzung
    - Warnung wenn `song.sprache === zielsprache` (Original- und Zielsprache identisch)
    - _Anforderungen: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.4_

  - [x] 5.2 Property-Test für Sprachwarnung schreiben
    - **Property 2: Sprachwarnung bei identischer Zielsprache**
    - Für beliebige Songs mit gesetztem `sprache`-Feld: Wenn `zielsprache === song.sprache`, wird eine Warnung angezeigt
    - **Validiert: Anforderung 2.5**

- [x] 6. Integration in die Emotional-Lernen-Seite
  - [x] 6.1 `TranslationTab` in `src/components/emotional/translation-tab.tsx` erweitern
    - Neue Props: `translating`, `translateError`, `translateSuccess`, `zielsprache`, `setZielsprache`, `onTranslate`
    - Prüfung ob Übersetzungen vorhanden: `strophen.some(s => s.zeilen.some(z => z.uebersetzung))`
    - Wenn keine Übersetzungen: Hinweistext + `TranslateButton` + `LanguageSelector` + Fehler-/Ladezustand
    - Wenn Übersetzungen vorhanden: Bestehende `StropheCard`-Darstellung (unverändert)
    - _Anforderungen: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.2 `useTranslation` Hook in `src/app/(main)/songs/[id]/emotional/page.tsx` einbinden
    - Import und Aufruf von `useTranslation({ songId: id, setSong })`
    - Hook-Werte an `TranslationTab` weitergeben
    - _Anforderungen: 5.2, 5.3, 5.4, 5.5_

  - [x] 6.3 Unit-Tests für TranslationTab-Integration schreiben
    - Hinweistext wird angezeigt wenn keine Übersetzungen vorhanden
    - TranslateButton und LanguageSelector werden angezeigt wenn keine Übersetzungen vorhanden
    - StropheCards werden angezeigt wenn Übersetzungen vorhanden
    - Fehlermeldung wird im Tab angezeigt bei Fehler
    - _Anforderungen: 5.1, 5.2, 5.4, 5.5_

- [x] 7. Abschluss-Checkpoint – Alle Tests und Integration validieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer fragen.

## Hinweise

- Aufgaben mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jede Aufgabe referenziert spezifische Anforderungen zur Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften
- Unit-Tests validieren spezifische Beispiele und Randfälle
