# Implementation Plan: Quiz-Lernmodus

## Übersicht

Implementierung des Quiz-Lernmodus mit drei Quiz-Typen (Multiple Choice, Reihenfolge/Drag & Drop, Diktat), Strophen-Auswahl, Score-Screen mit Empfehlung und Progress/Session-Integration. Folgt dem bestehenden Cloze-Muster: reine Funktionen in `src/lib/quiz/`, UI-Komponenten in `src/components/quiz/`, Client-Page unter `/songs/[id]/quiz`.

## Tasks

- [x] 1. Shared Strophen-Selection und Quiz-Typen einrichten
  - [x] 1.1 Strophen-Selection nach `src/lib/shared/` verschieben
    - Erstelle `src/lib/shared/strophen-selection.ts` mit `getWeakStrophenIds` und `hasWeaknesses` (kopiert aus `src/lib/cloze/strophen-selection.ts`)
    - Erstelle `src/lib/shared/constants.ts` mit `WEAKNESS_THRESHOLD = 80`
    - Aktualisiere `src/lib/cloze/strophen-selection.ts` als Re-Export von `src/lib/shared/strophen-selection.ts`
    - Aktualisiere `src/lib/cloze/constants.ts` als Re-Export von `src/lib/shared/constants.ts`
    - Stelle sicher, dass bestehende Cloze-Imports weiterhin funktionieren
    - _Requirements: 10.5_

  - [x] 1.2 Quiz-Typen definieren in `src/types/quiz.ts`
    - Definiere `QuizTyp`, `MCQuestion`, `ReihenfolgeQuestion`, `DiktatQuestion`, `QuizQuestion`, `QuizAnswer`, `DiffSegment`
    - _Requirements: 1.2, 1.3, 2.1, 4.1, 5.1_

- [x] 2. Quiz-Generator reine Funktionen implementieren
  - [x] 2.1 Erstelle `src/lib/quiz/quiz-generator.ts`
    - Implementiere `filterActiveStrophen(song, activeStrophenIds?)` — filtert Strophen nach aktiven IDs
    - Implementiere `collectWords(song, activeStrophenIds?)` — sammelt alle einzigartigen Wörter
    - Implementiere `shuffleArray<T>(arr, rng)` — deterministisches Mischen mit seeded random
    - Implementiere `generateMCQuestions(song, activeStrophenIds?, seed?)` — generiert MC-Fragen mit 4 Optionen pro Zeile, 1 korrekt, 3 Distraktoren aus Wortpool
    - Implementiere `generateReihenfolgeQuestions(song, activeStrophenIds?, seed?)` — generiert Reihenfolge-Fragen pro Strophe (≥2 Zeilen), Zeilen gemischt
    - Implementiere `generateDiktatQuestions(song, activeStrophenIds?, seed?)` — generiert Diktat-Fragen pro Zeile mit Strophen-Name als Kontext
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.7, 5.1, 10.7, 11.4_

  - [x] 2.2 Property-Test: MC-Fragen haben immer genau 4 Optionen mit genau 1 korrekter Antwort
    - **Property: MC options count and correctness**
    - Für beliebige SongDetail mit ≥1 Zeile: jede generierte MCQuestion hat `options.length === 4` und `options[correctIndex]` ist das korrekte Wort
    - **Validates: Requirements 2.2, 2.3**

  - [x] 2.3 Property-Test: Reihenfolge-Fragen überspringen Strophen mit ≤1 Zeile
    - **Property: Reihenfolge skips single-line strophes**
    - Für beliebige SongDetail: keine ReihenfolgeQuestion hat eine Strophe mit weniger als 2 Zeilen
    - **Validates: Requirements 4.7**

  - [x] 2.4 Property-Test: Quiz-Generator nutzt nur aktive Strophen
    - **Property: Active strophen filtering**
    - Für beliebige SongDetail und activeStrophenIds-Subset: alle generierten Fragen referenzieren nur stropheIds aus dem aktiven Set
    - **Validates: Requirements 10.7**

- [x] 3. Normalisierung und Diktat-Vergleich implementieren
  - [x] 3.1 Erstelle `src/lib/quiz/normalize.ts`
    - Implementiere `normalizeText(text)` — trim + lowercase
    - _Requirements: 5.7_

  - [x] 3.2 Erstelle `src/lib/quiz/validate-answer.ts`
    - Implementiere `validateDiktat(input, target)` — wortweiser Vergleich, gibt `{ correct, diff: DiffSegment[] }` zurück
    - Korrekt wenn normalisierter Text exakt übereinstimmt
    - Diff: übereinstimmende Wörter → `correct`, abweichende → `incorrect`, fehlende → `missing`
    - _Requirements: 5.3, 5.4, 5.7_

  - [x] 3.3 Property-Test: Normalisierter Text ist idempotent und korrekte Eingabe wird als korrekt gewertet
    - **Property: Normalization idempotency and correctness**
    - `normalizeText(normalizeText(x)) === normalizeText(x)` für beliebige Strings
    - `validateDiktat(target, target).correct === true` für beliebige Strings
    - **Validates: Requirements 5.7**

- [x] 4. Score-Berechnung implementieren
  - [x] 4.1 Erstelle `src/lib/quiz/score.ts`
    - Implementiere `calculateScore(answers)` — berechnet `{ correct, total, prozent }`
    - Implementiere `calculateStropheScores(answers, song)` — berechnet Fortschritt pro Strophe als `Map<stropheId, prozent>`
    - Implementiere `getEmpfehlung(prozent)` — gibt `'nochmal'` zurück wenn < 70%, sonst `'weiter'`
    - _Requirements: 6.1, 6.2, 6.3, 7.3_

  - [x] 4.2 Property-Test: Score-Berechnung und Empfehlung
    - **Property: Score consistency and recommendation threshold**
    - `calculateScore(answers).prozent` liegt immer zwischen 0 und 100
    - `getEmpfehlung(p)` gibt `'nochmal'` für p < 70 und `'weiter'` für p ≥ 70
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 5. Checkpoint — Alle reinen Funktionen testen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. UI-Komponenten implementieren
  - [x] 6.1 Erstelle `src/components/quiz/quiz-navbar.tsx`
    - Zurück-Button (Link zu `/songs/[id]`), Song-Titel, Label „Quiz"
    - Gleiche Struktur wie `ClozeNavbar`
    - _Requirements: 1.1_

  - [x] 6.2 Erstelle `src/components/quiz/quiz-typ-auswahl.tsx`
    - Drei Kacheln: Multiple Choice, Reihenfolge, Diktat — jeweils mit Kurzbeschreibung
    - Responsive: einspaltig unter 640px, dreispaltig ab 640px
    - `onSelect: (typ: QuizTyp) => void` Callback
    - _Requirements: 1.2, 1.3, 9.1, 9.2_

  - [x] 6.3 Erstelle `src/components/quiz/multiple-choice-card.tsx`
    - Frage oben (14px), 4 Antwort-Buttons in voller Breite untereinander
    - Sofortfeedback bei Klick: grün = korrekt, rot = falsch, korrekte Antwort zusätzlich grün markieren
    - Alle Buttons disabled nach Auswahl, Weiter-Button erscheint
    - `role="radiogroup"` mit `aria-label="Antwortoptionen"`, `aria-live="polite"` für Feedback
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 8.1, 8.2, 9.3_

  - [x] 6.4 Erstelle `src/components/quiz/reihenfolge-card.tsx`
    - Verschiebbare Karten per Drag & Drop (HTML5 DnD API)
    - Tastatur-Alternative: Pfeil-Tasten zum Verschieben
    - Bestätigen-Button → Feedback: grün/rot pro Zeile, korrekte Reihenfolge sichtbar
    - Weiter-Button nach Feedback
    - `aria-label` und `aria-roledescription="verschiebbare Karte"` pro Karte
    - Mindest-Tippfläche 44×44px
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 8.3, 8.4, 9.4_

  - [x] 6.5 Erstelle `src/components/quiz/diktat-card.tsx`
    - Strophen-Name als Kontext, Textarea (volle Breite, min-h 120px) + Abgabe-Button
    - Nach Abgabe: Diff-Anzeige (grün/rot), Originaltext vollständig anzeigen
    - Weiter-Button nach Vergleich
    - `aria-label="Zeile aus dem Gedächtnis eingeben"` auf Textarea
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.5, 9.5_

  - [x] 6.6 Erstelle `src/components/quiz/score-screen.tsx`
    - Punktzahl „N / M korrekt", Empfehlung basierend auf Score
    - Button „Quiz wiederholen" (`onRepeat`), Button „Zurück zur Song-Seite" (Link zu `/songs/[id]`)
    - `aria-live="polite"` für Ergebnis-Kommunikation
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.7_

- [x] 7. Strophen-Auswahl-Dialog für Quiz
  - [x] 7.1 Erstelle `src/components/quiz/strophen-auswahl-dialog.tsx`
    - Gleiche Struktur wie `src/components/cloze/strophen-auswahl-dialog.tsx`
    - Nutzt `getWeakStrophenIds` und `hasWeaknesses` aus `src/lib/shared/strophen-selection.ts`
    - Checkboxen mit Strophen-Name und Fortschritt (%), „Alle auswählen", „Alle abwählen", „Schwächen üben"
    - Validierung: mindestens eine Strophe muss ausgewählt sein
    - „Schwächen üben" deaktiviert wenn keine Strophe unter 80%
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.8_

- [x] 8. Checkpoint — Alle Komponenten erstellt
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Quiz-Page zusammenbauen und verdrahten
  - [x] 9.1 Erstelle `src/app/(main)/songs/[id]/quiz/page.tsx`
    - `"use client"` Komponente mit State-Management analog zur Cloze-Page
    - State: `song`, `quizTyp`, `questions`, `currentIndex`, `answers`, `phase` ('auswahl' | 'quiz' | 'score'), `loading`, `error`, `activeStrophenIds`, `dialogOpen`
    - Beim Laden: `GET /api/songs/[id]` → Song laden, alle Strophen als aktiv setzen
    - Auth-Check: 401 → redirect `/login`, 403/404 → redirect `/dashboard`
    - Fehlerbehandlung: Fehlermeldung + Zurück-Button bei Ladefehler
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 11.1_

  - [x] 9.2 Quiz-Typ-Auswahl → Fragen generieren → Quiz-Phase starten
    - Bei Typ-Auswahl: passenden Generator aufrufen mit `activeStrophenIds`
    - Fragen durchlaufen: `currentIndex` inkrementieren, Antworten in `answers[]` sammeln
    - Nach letzter Frage: Score berechnen → Score-Phase
    - Strophen-Auswahl bleibt bei Typ-Wechsel und Wiederholung erhalten
    - _Requirements: 1.3, 10.7, 10.9_

  - [x] 9.3 Progress- und Session-Integration verdrahten
    - Bei Score-Phase: `calculateStropheScores` → `PUT /api/progress` pro aktiver Strophe
    - `POST /api/sessions` mit `lernmethode: "QUIZ"`
    - Fehlerbehandlung: Progress-Fehler → Retry-Möglichkeit, Session-Fehler → silent log
    - ProgressBar mit aktuellem Song-Fortschritt anzeigen
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 11.2, 11.3_

  - [x] 9.4 Tastatur-Navigation sicherstellen
    - Tab-Reihenfolge folgt logischer Lesereihenfolge
    - Alle interaktiven Elemente per Tastatur erreichbar
    - _Requirements: 8.6_

- [x] 10. Final Checkpoint — Alle Tests bestehen, Feature vollständig verdrahtet
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Requirements für Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften der reinen Funktionen
