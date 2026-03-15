# Implementierungsplan: Lückentext (Cloze Learning)

## Übersicht

Rein client-seitiges Lückentext-Feature. Keine neuen API-Routen oder DB-Tabellen nötig. Implementierung in TypeScript/React mit bestehenden APIs (`GET /api/songs/[id]`, `PUT /api/progress`, `POST /api/sessions`). Aufbau: Typen → Kernlogik → Property-Tests → UI-Komponenten → Seite → Integration.

## Tasks

- [x] 1. Typen und Kernlogik erstellen
  - [x] 1.1 Cloze-Typen definieren in `src/types/cloze.ts`
    - `DifficultyLevel`, `GapData`, `ScoreState`, `FeedbackState` exportieren
    - Typen gemäß Design-Dokument (Abschnitt „Neue Typen")
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1_

  - [x] 1.2 Gap-Generator implementieren in `src/lib/cloze/gap-generator.ts`
    - `seededRandom()` und `hashString()` Hilfsfunktionen
    - `DIFFICULTY_CONFIG` Mapping (leicht: 0.2, mittel: 0.4, schwer: 0.6, blind: 1.0)
    - `STOP_WORDS` Set (deutsch + englisch)
    - `generateGaps(zeilen, difficulty)` Hauptfunktion
    - Sonderregel: bei < 2 Wörtern und nicht-Blind mindestens 1 Wort sichtbar
    - Schlüsselwort-Priorisierung bei „leicht"
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.3 Antwort-Validierung implementieren in `src/lib/cloze/validate-answer.ts`
    - `validateAnswer(input, target)`: case-insensitive, trimmed Vergleich
    - _Requirements: 4.3_

  - [x] 1.4 Score-Berechnung implementieren in `src/lib/cloze/score.ts`
    - `calculateProgress(correct, total)`: Prozentwert 0–100, gerundet
    - _Requirements: 5.1, 5.2_

- [x] 2. Property-Based Tests für Kernlogik
  - [x] 2.1 Property-Test: Lücken-Anteil in `__tests__/cloze/gap-ratio.property.test.ts`
    - **Property 1: Lücken-Anteil entspricht Schwierigkeitsstufe**
    - Für jede Zeile ≥ 2 Wörter: Anteil der Lücken ≈ konfigurierter Prozentsatz (±1 Toleranz), Blind = 100%
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [x] 2.2 Property-Test: Determinismus in `__tests__/cloze/gap-determinism.property.test.ts`
    - **Property 2: Deterministische Lücken-Generierung**
    - Zweimaliger Aufruf mit gleichen Eingaben → identische Lücken
    - **Validates: Requirements 2.5**

  - [x] 2.3 Property-Test: Validierung in `__tests__/cloze/validate-answer.property.test.ts`
    - **Property 3: Case-insensitive Antwort-Validierung**
    - `validateAnswer` gibt `true` zurück gdw. trimmed+lowercased Strings identisch
    - **Validates: Requirements 4.3**

  - [x] 2.4 Property-Test: Score-Konsistenz in `__tests__/cloze/score-consistency.property.test.ts`
    - **Property 6: Score und Fortschritt sind konsistent**
    - `calculateProgress(correct, total)` = `Math.round(correct / total * 100)`
    - **Validates: Requirements 5.1, 5.2**

  - [x] 2.5 Property-Test: Hinweis-Format in `__tests__/cloze/hint-format.property.test.ts`
    - **Property 8: Hinweis-Format**
    - Für jedes Wort ≥ 1 Zeichen: Hint = ersterBuchstabe + '···'
    - **Validates: Requirements 7.2**

- [x] 3. Checkpoint – Kernlogik validieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. UI-Komponenten erstellen
  - [x] 4.1 GapInput-Komponente in `src/components/cloze/gap-input.tsx`
    - Inline-Input mit lila `border-bottom`, kein Rahmen, Mindestbreite 60px
    - Placeholder `'···'`, bei Hint: ersterBuchstabe + `'···'`
    - Breite wächst mit Eingabe
    - `readonly` wenn `feedback === "correct"`
    - Grüner Unterstrich/Text bei korrekt, roter bei falsch
    - `aria-label` gemäß Format „Lücke N von M in [Strophen-Name]"
    - `aria-live="polite"` für Feedback-Status
    - Mindest-Tippfläche 44×44px auf Touch-Geräten
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7, 9.1, 9.2, 9.3, 10.3_

  - [x] 4.2 StanzaBlock-Komponente in `src/components/cloze/stanza-block.tsx`
    - Weißer Block mit dünner Umrandung
    - Strophen-Name oben links, 11px, uppercase
    - Zeilen in orderIndex-Reihenfolge, sichtbare Wörter als Text, Lücken als GapInput inline
    - Leere Strophe: Label + leerer Inhaltsbereich
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 4.3 DifficultySelector-Komponente in `src/components/cloze/difficulty-selector.tsx`
    - 4 gleichbreite Buttons: „Leicht", „Mittel", „Schwer", „Blind"
    - Aktiver Button: lila Hintergrund
    - `role="radiogroup"` mit `aria-label="Schwierigkeitsstufe"`
    - Responsive: 2×2-Raster unter 640px
    - _Requirements: 3.1, 3.2, 9.4, 10.2_

  - [x] 4.4 ScorePill-Komponente in `src/components/cloze/score-pill.tsx`
    - Grüne Pill-Anzeige: „N / M richtig"
    - _Requirements: 1.5, 5.1_

  - [x] 4.5 HintButton-Komponente in `src/components/cloze/hint-button.tsx`
    - Button pro Gap, deaktiviert nach einmaliger Nutzung
    - _Requirements: 7.1, 7.3, 7.4_

  - [x] 4.6 CheckAllButton-Komponente in `src/components/cloze/check-all-button.tsx`
    - Primärer lila Button, volle Breite, am unteren Rand
    - Deaktiviert wenn keine offenen Gaps
    - Per Tastatur bedienbar (Enter/Space)
    - _Requirements: 6.1, 6.3, 9.5_

  - [x] 4.7 ClozeNavbar-Komponente in `src/components/cloze/cloze-navbar.tsx`
    - Zurück-Button, Song-Titel, Label „Lückentext"
    - _Requirements: 1.2_

- [x] 5. Property-Based Tests für UI-Logik
  - [x] 5.1 Property-Test: State-Reset in `__tests__/cloze/difficulty-reset.property.test.ts`
    - **Property 4: Schwierigkeitswechsel setzt State zurück**
    - Nach Wechsel: Antworten leer, Feedback null, Score reset, Hints leer
    - **Validates: Requirements 3.3, 3.5, 1.5**

  - [x] 5.2 Property-Test: Eingabe-Sperre in `__tests__/cloze/input-locking.property.test.ts`
    - **Property 5: Korrekte Antwort sperrt Eingabe, falsche bleibt editierbar**
    - `feedback === "correct"` → readonly; sonst editierbar
    - **Validates: Requirements 4.6, 4.7**

  - [x] 5.3 Property-Test: Check-All in `__tests__/cloze/check-all.property.test.ts`
    - **Property 7: Check-All validiert alle offenen Lücken**
    - Alle offenen Gaps mit nicht-leerer Eingabe erhalten Feedback
    - **Validates: Requirements 6.2, 6.3**

  - [x] 5.4 Property-Test: Einmaliger Hinweis in `__tests__/cloze/hint-single-use.property.test.ts`
    - **Property 9: Hinweis ist einmalig pro Lücke**
    - Nach Nutzung: HintButton deaktiviert, erneuter Aufruf ändert nichts (Idempotenz)
    - **Validates: Requirements 7.1, 7.3, 7.4**

  - [x] 5.5 Property-Test: Zeilen-Reihenfolge in `__tests__/cloze/zeilen-order.property.test.ts`
    - **Property 10: Zeilen werden in orderIndex-Reihenfolge dargestellt**
    - **Validates: Requirements 8.3**

  - [x] 5.6 Property-Test: Aria-Label in `__tests__/cloze/aria-label.property.test.ts`
    - **Property 11: Aria-Label-Format für Lücken**
    - Format: „Lücke N von M in [Strophen-Name]"
    - **Validates: Requirements 9.1**

  - [x] 5.7 Property-Test: Aria-Feedback in `__tests__/cloze/aria-feedback.property.test.ts`
    - **Property 12: Feedback-Status wird via aria-live kommuniziert**
    - Element mit `aria-live="polite"` enthält „Richtig" bzw. „Falsch"
    - **Validates: Requirements 9.2, 9.3**

- [x] 6. Checkpoint – UI-Komponenten und Property-Tests validieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Cloze-Seite zusammenbauen und integrieren
  - [x] 7.1 ClozePageClient implementieren in `src/app/(main)/songs/[id]/cloze/page.tsx`
    - Client Component analog zu `emotional/page.tsx`
    - Song-Daten laden via `fetch("/api/songs/${id}")`
    - Session tracken via `POST /api/sessions` mit `lernmethode: "LUECKENTEXT"`
    - State-Management: difficulty, gaps, answers, feedback, hints, score
    - Schwierigkeitsstufe „Leicht" als Default
    - Schwierigkeitswechsel: Reset aller Eingaben, Feedback, Score, Hints + Neuberechnung der Gaps
    - Blur-Handler: `validateAnswer()` aufrufen, Feedback setzen, Score aktualisieren
    - Check-All: alle offenen Gaps mit nicht-leerer Eingabe validieren
    - Hint-Logik: erster Buchstabe + '···' als Placeholder, einmalig pro Gap
    - Bei 100% Completion: `PUT /api/progress` für betroffene Strophen + `POST /api/sessions`
    - Auth-Redirect: 401 → `/login`, 403/404 → `/dashboard`
    - Fehlerbehandlung: Fehlermeldung bei 500, stille Fehler bei Progress/Session-API
    - Leere Strophen: Hinweis „Dieser Song hat noch keine Strophen"
    - Responsive: einspaltig unter 640px, reduziertes Padding
    - Tastatur-Navigation: Tab-Reihenfolge folgt Lesereihenfolge
    - Alle Komponenten verdrahten: ClozeNavbar, DifficultySelector, ProgressBar, ScorePill, StanzaBlocks, CheckAllButton
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 3.3, 3.4, 3.5, 4.3, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 6.2, 7.1, 7.2, 7.3, 7.4, 9.6, 10.1_

- [x] 8. Unit-Tests für Edge Cases und Integration
  - [x] 8.1 Unit-Tests für Gap-Generator in `__tests__/cloze/gap-generator.test.ts`
    - Edge Cases: leere Zeilen, 1-Wort-Zeilen, Sonderzeichen, leerer Text
    - _Requirements: 2.5, 2.6_

  - [x] 8.2 Unit-Tests für Seitenverhalten in `__tests__/cloze/cloze-page.test.ts`
    - Auth-Redirect bei 401, 403/404-Handling, Ladeindikator, Fehlermeldung
    - _Requirements: 1.6, 1.7_

  - [x] 8.3 Unit-Tests für Completion in `__tests__/cloze/completion.test.ts`
    - API-Aufrufe bei 100% Completion: Progress-API + Session-API
    - Stille Fehlerbehandlung bei API-Fehlern
    - _Requirements: 5.3, 5.4_

- [x] 9. Abschluss-Checkpoint – Alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Requirements für Nachvollziehbarkeit
- Property-Tests nutzen `fast-check` (bereits als devDependency vorhanden)
- Bestehende `ProgressBar` aus `src/components/songs/progress-bar.tsx` wird wiederverwendet
- Keine neuen API-Routen oder Datenbank-Migrationen nötig
