# Implementierungsplan: Zeile für Zeile – Lernmethode

## Übersicht

Schrittweise Implementierung der „Zeile für Zeile"-Lernmethode. Beginn mit abhängigkeitsfreien Utilities, dann Komponenten, Page-Orchestrierung, Integration in die Song-Detailseite und abschließend Property-Based Tests. Alle Aufrufe nutzen bestehende API-Endpunkte (`/api/songs/[id]`, `/api/sessions`, `/api/progress`) und den vorhandenen `StrophenAuswahlDialog`.

## Aufgaben

- [x] 1. Utility-Funktionen erstellen
  - [x] 1.1 `validateLine` implementieren in `src/lib/zeile-fuer-zeile/validate-line.ts`
    - Exportiere `validateLine(input: string, target: string): boolean`
    - Case-insensitive Vergleich mit `trim()` auf beiden Seiten
    - _Anforderungen: 3.2, 3.3, 3.4_

  - [x] 1.2 Property-Test für `validateLine` schreiben
    - **Property 1: Zeilenvergleich ist case-insensitive und trim-tolerant**
    - Datei: `__tests__/zeile-fuer-zeile/validate-line.property.test.ts`
    - **Validiert: Anforderungen 3.2, 3.3, 3.4**

  - [x] 1.3 `calculateStropheProgress` implementieren in `src/lib/zeile-fuer-zeile/progress.ts`
    - Exportiere `calculateStropheProgress(completedZeilen: number, totalZeilen: number): number`
    - Rückgabe `Math.round((completedZeilen / totalZeilen) * 100)`, bei `totalZeilen === 0` → `0`
    - _Anforderungen: 7.1, 7.2_

  - [x] 1.4 Property-Test für `calculateStropheProgress` schreiben
    - **Property 7: Fortschrittsberechnung ist proportional**
    - Datei: `__tests__/zeile-fuer-zeile/progress-calculation.property.test.ts`
    - **Validiert: Anforderungen 7.1, 7.2**

- [x] 2. Checkpoint – Utilities verifizieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. UI-Komponenten erstellen
  - [x] 3.1 `ZeileFuerZeileNavbar` implementieren in `src/components/zeile-fuer-zeile/navbar.tsx`
    - Props: `songId: string`, `songTitle: string`
    - Zurück-Link zu `/songs/[id]`, Song-Titel, Label „Zeile für Zeile"
    - Folgt dem Muster von `ClozeNavbar`
    - Mindestgröße 44×44px für Touch-Ziele
    - `aria-label="Zurück zur Song-Detailseite"` auf dem Zurück-Link
    - _Anforderungen: 1.5, 8.1, 8.4_

  - [x] 3.2 `FortschrittsDots` implementieren in `src/components/zeile-fuer-zeile/fortschritts-dots.tsx`
    - Props: `totalZeilen`, `currentIndex`, `completedIndices: Set<number>`
    - Ein Punkt pro Zeile: lila (aktiv), grün (abgeschlossen), grau (ausstehend)
    - `role="progressbar"` mit `aria-valuenow` und `aria-valuemax`
    - _Anforderungen: 5.1, 5.2, 5.3, 5.4, 8.2_

  - [x] 3.3 Property-Test für `FortschrittsDots` schreiben
    - **Property 6: Fortschritts-Dots spiegeln Zustand korrekt wider**
    - Datei: `__tests__/zeile-fuer-zeile/fortschritts-dots.property.test.ts`
    - **Validiert: Anforderungen 5.1, 5.2, 5.3, 5.4, 5.5**

  - [x] 3.4 `StrophenNavigator` implementieren in `src/components/zeile-fuer-zeile/strophen-navigator.tsx`
    - Props: `currentStropheName`, `currentPosition`, `totalStrophen`, `canGoBack`, `canGoForward`, `onPrevious`, `onNext`
    - Zeigt Strophen-Name und Position (z.B. „Strophe 2 von 5")
    - Pfeile links/rechts, deaktiviert wenn am Rand
    - Mindestgröße 44×44px, `aria-label` auf Pfeilen
    - _Anforderungen: 6.1, 6.2, 6.5, 6.6, 8.1, 8.4, 8.5_

  - [x] 3.5 `KumulativeAnsicht` implementieren in `src/components/zeile-fuer-zeile/kumulative-ansicht.tsx`
    - Props: `zeilen: Array<{ id: string; text: string }>`
    - Zeigt gelernte Zeilen in 14px, `text-gray-500`
    - Leer wenn keine Zeilen vorhanden
    - _Anforderungen: 2.3, 2.5_

  - [x] 3.6 `AktiveZeile` implementieren in `src/components/zeile-fuer-zeile/aktive-zeile.tsx`
    - Props: `text: string`, `visible: boolean`
    - 18px, primäre Textfarbe, `border-l-4 border-purple-600`
    - Text nur sichtbar wenn `visible=true` (Lösung angezeigt)
    - _Anforderungen: 2.1, 2.2_

  - [x] 3.7 `EingabeBereich` implementieren in `src/components/zeile-fuer-zeile/eingabe-bereich.tsx`
    - Props: `eingabe`, `onEingabeChange`, `onAbsenden`, `onWeiter`, `status`, `fehlversuche`, `disabled`, `istLetzteZeile`
    - Textarea mit `aria-label="Zeile aus dem Gedächtnis eingeben"`
    - Enter sendet ab, Shift+Enter für Zeilenumbruch
    - Grüner Rahmen bei korrekt, roter bei falsch
    - Weiter-Button deaktiviert bis Status „korrekt" oder „loesung"
    - `aria-live="polite"` Region für Feedback
    - Bei letzter Zeile: Button-Label „Strophe abschließen"
    - _Anforderungen: 3.1, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.6, 8.1, 8.3, 8.5_

- [x] 4. Checkpoint – Komponenten verifizieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Page-Komponente und State-Management
  - [x] 5.1 `ZeileFuerZeilePage` implementieren in `src/app/(main)/songs/[id]/zeile-fuer-zeile/page.tsx`
    - Song-Daten laden via `GET /api/songs/[id]`
    - Session erstellen via `POST /api/sessions` mit `ZEILE_FUER_ZEILE`
    - Auth-Redirect (401 → Login, 403/404 → Dashboard)
    - Hinweismeldung bei Song ohne Strophen
    - State verwalten: `currentStropheIndex`, `currentZeileIndex`, `completedZeilen`, `eingabe`, `fehlversuche`, `zeilenStatus`, `dialogOpen`, `activeStrophenIds`
    - Alle Komponenten orchestrieren (Navbar, FortschrittsDots, StrophenNavigator, KumulativeAnsicht, AktiveZeile, EingabeBereich)
    - `StrophenAuswahlDialog` aus `src/components/cloze/` importieren und einbinden
    - Folgt dem Muster der Cloze- und Emotional-Seiten
    - _Anforderungen: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.4, 9.1, 9.2, 9.7_

  - [x] 5.2 Eingabe-Logik und Textvergleich verdrahten
    - `validateLine` aufrufen bei Absenden
    - Bei korrekt: Status auf „korrekt", Weiter-Button aktivieren
    - Bei falsch: Fehlversuche erhöhen, Eingabefeld leeren
    - Bei 3 Fehlversuchen: Status auf „loesung", Lösung anzeigen
    - _Anforderungen: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 5.3 Weiter-Logik implementieren
    - Nächste Zeile als aktiv setzen, gelernte Zeile in kumulative Ansicht aufnehmen
    - Eingabefeld leeren, Fehlversuche zurücksetzen
    - Bei letzter Zeile: Erfolgsmeldung anzeigen
    - _Anforderungen: 4.3, 4.4, 4.5, 4.6_

  - [x] 5.4 Strophen-Navigation implementieren
    - Wechsel zwischen ausgewählten Strophen via Pfeile
    - Lernzustand pro Strophe in `Map<string, StropheLernzustand>` speichern
    - Beim Wechsel: Zustand der neuen Strophe laden oder Anfangszustand setzen
    - _Anforderungen: 6.3, 6.4, 6.7, 9.9_

  - [x] 5.5 Strophen-Auswahl-Logik implementieren
    - Dialog öffnen/schließen, Auswahl bestätigen
    - Bei Änderung: Lernzustand komplett zurücksetzen
    - Navigation nur zwischen ausgewählten Strophen
    - _Anforderungen: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12_

  - [x] 5.6 Fortschritts-Tracking implementieren
    - `calculateStropheProgress` aufrufen und via `PUT /api/progress` persistieren
    - Bei Strophen-Abschluss: 100% setzen
    - Bei allen Strophen abgeschlossen: Session via `POST /api/sessions` erstellen
    - _Anforderungen: 7.1, 7.2, 7.3_

  - [x] 5.7 Property-Test: Genau eine aktive Zeile und korrekte kumulative Ansicht
    - **Property 2: Genau eine aktive Zeile und korrekte kumulative Ansicht**
    - Datei: `__tests__/zeile-fuer-zeile/state-invariant.property.test.ts`
    - **Validiert: Anforderungen 2.1, 2.3**

  - [x] 5.8 Property-Test: Fehlversuch-Logik
    - **Property 3: Fehlversuch erhöht Zähler und leert Eingabe**
    - **Property 4: Drei Fehlversuche zeigen Lösung**
    - Datei: `__tests__/zeile-fuer-zeile/fehlerversuch.property.test.ts`
    - **Validiert: Anforderungen 3.6, 3.7, 3.8**

  - [x] 5.9 Property-Test: Weiter-Transition
    - **Property 5: Weiter-Transition setzt Zustand korrekt**
    - Datei: `__tests__/zeile-fuer-zeile/weiter-transition.property.test.ts`
    - **Validiert: Anforderungen 4.3, 4.4, 4.5**

  - [x] 5.10 Property-Test: Weiter-Button-Zustand
    - **Property 10: Weiter-Button ist nur bei abgeschlossener Zeile aktiv**
    - Datei: `__tests__/zeile-fuer-zeile/weiter-button-state.property.test.ts`
    - **Validiert: Anforderungen 4.2, 3.5, 3.7**

- [x] 6. Checkpoint – Page-Logik verifizieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integration und Verdrahtung
  - [x] 7.1 Link zur „Zeile für Zeile"-Methode auf der Song-Detailseite hinzufügen
    - In `src/app/(main)/songs/[id]/page.tsx` im Abschnitt „Lernmethoden" einen neuen Link einfügen
    - Link zu `/songs/[id]/zeile-fuer-zeile` mit Label „📝 Zeile für Zeile"
    - Folgt dem Stil der bestehenden Lernmethoden-Links
    - _Anforderungen: 1.1_

  - [x] 7.2 Property-Test: Strophen-Navigation innerhalb der Auswahl
    - **Property 8: Strophen-Navigation innerhalb der Auswahl**
    - Datei: `__tests__/zeile-fuer-zeile/strophen-navigation.property.test.ts`
    - **Validiert: Anforderungen 6.3, 6.4, 9.7, 9.9**

  - [x] 7.3 Property-Test: Strophen-Auswahl-Änderung setzt Lernzustand zurück
    - **Property 9: Strophen-Auswahl-Änderung setzt Lernzustand zurück**
    - Datei: `__tests__/zeile-fuer-zeile/selection-reset.property.test.ts`
    - **Validiert: Anforderungen 9.8**

- [x] 8. Abschluss-Checkpoint – Alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Aufgaben mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jede Aufgabe referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints sichern inkrementelle Validierung
- Property-Tests validieren universelle Korrektheitseigenschaften
- Unit-Tests validieren spezifische Beispiele und Edge-Cases
- Der `StrophenAuswahlDialog` wird aus `src/components/cloze/` wiederverwendet – kein neuer Dialog nötig
