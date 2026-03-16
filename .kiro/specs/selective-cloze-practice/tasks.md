# Implementierungsplan: Selektive Lückentext-Übung

## Übersicht

Erweiterung der bestehenden Cloze_Page um einen Strophen-Auswahl-Dialog, der es Nutzern ermöglicht, gezielt einzelne Strophen für die Lückentext-Übung auszuwählen. Neue Dateien: `strophen-auswahl-dialog.tsx`, `constants.ts`, `strophen-selection.ts`. Änderungen an der bestehenden `page.tsx` für Filterung und Dialog-Integration.

## Aufgaben

- [x] 1. Konstante und Hilfsfunktionen erstellen
  - [x] 1.1 Erstelle `src/lib/cloze/constants.ts` mit `WEAKNESS_THRESHOLD = 80`
    - Exportierte Konstante für die Fortschritts-Schwelle
    - _Requirements: 4.2, 4.3, 4.4_
  - [x] 1.2 Erstelle `src/lib/cloze/strophen-selection.ts` mit `getWeakStrophenIds` und `hasWeaknesses`
    - `getWeakStrophenIds(progress)` gibt `Set<string>` der Strophen-IDs mit Fortschritt < WEAKNESS_THRESHOLD zurück
    - `hasWeaknesses(progress)` gibt `boolean` zurück
    - Importiert `WEAKNESS_THRESHOLD` aus `constants.ts`
    - _Requirements: 4.2, 4.4, 4.5_
  - [x] 1.3 Schreibe Property-Test für Schwächen-Erkennung
    - **Property 7: Schwächen-Indikator bei Fortschritt unter Schwelle**
    - **Validates: Requirements 4.2, 4.3, 7.6**
    - Datei: `__tests__/cloze/weakness-indicator.property.test.ts`
    - Teste `getWeakStrophenIds`: für jede Strophe mit Fortschritt < 80% muss die ID enthalten sein, für >= 80% nicht
  - [x] 1.4 Schreibe Property-Test für Schwächen-üben-Selektion
    - **Property 8: Schwächen üben selektiert korrekt**
    - **Validates: Requirements 4.4, 4.5**
    - Datei: `__tests__/cloze/practice-weaknesses.property.test.ts`
    - Teste dass `getWeakStrophenIds` genau die Strophen unter Schwelle selektiert; `hasWeaknesses` ist false wenn alle >= 80%
  - [x] 1.5 Schreibe Unit-Tests für `strophen-selection.ts`
    - Datei: `__tests__/cloze/strophen-selection.test.ts`
    - Edge Cases: leere Progress-Liste, alle bei 0%, alle bei 100%, gemischte Werte, exakt 80%
    - _Requirements: 4.2, 4.4, 4.5_

- [x] 2. Checkpoint – Hilfsfunktionen validieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. StrophenAuswahlDialog-Komponente implementieren
  - [x] 3.1 Erstelle `src/components/cloze/strophen-auswahl-dialog.tsx`
    - Props: `songId`, `strophen`, `activeStrophenIds`, `open`, `onConfirm`, `onCancel`
    - Interner State: `localSelection`, `progress`, `loadingProgress`, `validationError`
    - Fortschritt laden via `GET /api/progress?songId=X` beim Öffnen
    - Strophen als Checkbox-Liste sortiert nach `orderIndex`
    - Fortschritts-Anzeige (Prozentwert) neben jedem Strophen-Namen
    - Schwächen_Indikator (orangefarbenes Label) bei Fortschritt < 80% mit `aria-label="Schwäche – Fortschritt unter 80%"`
    - Buttons: „Alle auswählen", „Alle abwählen", „Schwächen üben", „Übung starten", „Abbrechen"
    - Validierung: mindestens 1 Strophe ausgewählt, sonst Fehlermeldung
    - „Schwächen üben"-Button deaktiviert wenn keine Schwächen vorhanden (Tooltip: „Keine Schwächen vorhanden")
    - ARIA: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Focus-Trap, Escape-Handling
    - Responsive: Vollbild unter 640px, zentrierter Modal ab 640px, scrollbare Liste, 44×44px Touch-Tippfläche
    - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4_
  - [x] 3.2 Schreibe Property-Test für Dialog-Checkbox-Vorauswahl
    - **Property 1: Dialog zeigt alle Strophen mit korrekter Vorauswahl**
    - **Validates: Requirements 1.3, 1.4**
    - Datei: `__tests__/cloze/dialog-checkbox-preselection.property.test.ts`
  - [x] 3.3 Schreibe Property-Test für Alle auswählen / Alle abwählen
    - **Property 3: Alle auswählen / Alle abwählen**
    - **Validates: Requirements 2.2, 2.3, 2.4**
    - Datei: `__tests__/cloze/select-all-none.property.test.ts`
  - [x] 3.4 Schreibe Property-Test für Strophen-Reihenfolge im Dialog
    - **Property 4: Strophen-Reihenfolge nach orderIndex**
    - **Validates: Requirements 2.5**
    - Datei: `__tests__/cloze/dialog-strophe-order.property.test.ts`
  - [x] 3.5 Schreibe Unit-Tests für StrophenAuswahlDialog
    - Datei: `__tests__/cloze/strophen-auswahl-dialog.test.ts`
    - Dialog-Rendering, ARIA-Attribute, Focus-Trap, Escape-Handling, Cancel-Button, Validierungsmeldung
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2_

- [x] 4. Checkpoint – Dialog-Komponente validieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. ClozePageClient um Strophen-Auswahl erweitern
  - [x] 5.1 Erweitere `src/app/(main)/songs/[id]/cloze/page.tsx` um `activeStrophenIds`-State und Dialog-Integration
    - Neuer State: `activeStrophenIds: Set<string> | null` (initial null → alle Strophen), `dialogOpen: boolean`
    - Initialisierung: nach Song-Laden `activeStrophenIds` auf alle Strophen-IDs setzen
    - `getZeilenFromSong` filtert nach `activeStrophenIds`
    - `sortedStrophen` wird nach `activeStrophenIds` gefiltert
    - Button „Strophen auswählen" oberhalb der StanzaBlocks einfügen
    - `StrophenAuswahlDialog` einbinden mit `open={dialogOpen}`, `onConfirm`, `onCancel`
    - _Requirements: 1.1, 1.2, 1.5, 3.2, 3.3_
  - [x] 5.2 Implementiere `handleStrophenConfirm`-Handler
    - Setzt `activeStrophenIds` auf neue Auswahl
    - Schließt Dialog
    - Generiert Gaps neu nur für aktive Strophen
    - Setzt Antworten, Feedback, Hints und Score zurück
    - Setzt `completionFired.current = false`
    - _Requirements: 3.4, 3.5_
  - [x] 5.3 Passe `handleDifficultyChange` an: Gaps nur für aktive Strophen generieren, `activeStrophenIds` beibehalten
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 5.4 Passe `persistCompletion` an: Fortschritt nur für aktive Strophen persistieren
    - Iteriert nur über Strophen deren ID in `activeStrophenIds` enthalten ist
    - _Requirements: 5.1, 5.2_
  - [x] 5.5 Schreibe Property-Test für initiale Auswahl
    - **Property 2: Initiale Auswahl umfasst alle Strophen**
    - **Validates: Requirements 1.5**
    - Datei: `__tests__/cloze/initial-all-selected.property.test.ts`
  - [x] 5.6 Schreibe Property-Test für Lücken nur aktive Strophen
    - **Property 5: Lücken nur für aktive Strophen**
    - **Validates: Requirements 3.2, 3.3**
    - Datei: `__tests__/cloze/gaps-active-only.property.test.ts`
  - [x] 5.7 Schreibe Property-Test für State-Reset bei Auswahl-Bestätigung
    - **Property 6: State-Reset bei Auswahl-Bestätigung**
    - **Validates: Requirements 3.4, 3.5**
    - Datei: `__tests__/cloze/selection-state-reset.property.test.ts`
  - [x] 5.8 Schreibe Property-Test für Fortschritt nur aktive Strophen
    - **Property 9: Fortschritt nur für aktive Strophen persistiert**
    - **Validates: Requirements 5.1, 5.2**
    - Datei: `__tests__/cloze/progress-active-only.property.test.ts`
  - [x] 5.9 Schreibe Property-Test für Auswahl-Erhalt bei Schwierigkeitswechsel
    - **Property 10: Strophen-Auswahl bleibt bei Schwierigkeitswechsel erhalten**
    - **Validates: Requirements 6.1**
    - Datei: `__tests__/cloze/selection-preserved-difficulty.property.test.ts`
  - [x] 5.10 Schreibe Unit-Tests für ClozePageClient-Integration
    - Datei: `__tests__/cloze/cloze-page-selection.test.ts`
    - Button „Strophen auswählen" vorhanden, Dialog-Öffnung, Fortschritts-Persistierung nur für aktive Strophen
    - _Requirements: 1.1, 1.2, 5.1, 5.2_

- [x] 6. Abschluss-Checkpoint – Alle Tests und Integration validieren
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Requirements für Nachvollziehbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften aus dem Design-Dokument
- Unit-Tests decken spezifische Beispiele und Edge Cases ab
