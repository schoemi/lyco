# Implementierungsplan: Rückwärts lernen – Lernmethode

## Übersicht

Schrittweise Implementierung der „Rückwärts lernen"-Lernmethode. Das Feature maximiert die Wiederverwendung bestehender Komponenten aus `zeile-fuer-zeile/`. Beginn mit Prop-Erweiterungen der bestehenden Komponenten, dann die neue ErklaerungTooltip-Komponente, anschließend die Page-Komponente mit umgekehrter Strophen-Sortierung, Integration in die Song-Detailseite und abschließend Property-Based Tests.

## Aufgaben

- [x] 1. Bestehende Komponenten erweitern
  - [x] 1.1 `ZeileFuerZeileNavbar` um optionales `label`-Prop erweitern
    - In `src/components/zeile-fuer-zeile/navbar.tsx` ein optionales `label?: string`-Prop hinzufügen (Default: „Zeile für Zeile")
    - Das hartcodierte Label durch `{label}` ersetzen
    - Bestehende Aufrufe bleiben durch den Default-Wert kompatibel
    - _Anforderungen: 1.6_

  - [x] 1.2 `StrophenNavigator` um optionale Props erweitern
    - In `src/components/zeile-fuer-zeile/strophen-navigator.tsx` zwei optionale Props hinzufügen: `positionSuffix?: string` und `showDirectionIcon?: boolean`
    - Positions-Label erweitern: `Strophe {N} von {M}{positionSuffix}`
    - Bei `showDirectionIcon={true}` einen ←-Pfeil vor dem Label anzeigen
    - Bestehende Aufrufe bleiben durch Default-Werte kompatibel
    - _Anforderungen: 2.1, 2.2, 2.3_

- [x] 2. Neue Komponente: ErklaerungTooltip erstellen
  - [x] 2.1 `ErklaerungTooltip` implementieren in `src/components/rueckwaerts/erklaerung-tooltip.tsx`
    - Props: `visible: boolean`, `onClose: () => void`
    - Modaler Dialog mit `role="dialog"` und `aria-labelledby`
    - Titel: „Warum von hinten?", Inhalt: Kurze Erklärung des Primacy-Effekts (2-3 Sätze)
    - Schließen-Button mit `aria-label="Erklärung schließen"`, Mindestgröße 44×44px
    - Schließbar per Escape-Taste oder Klick auf Schließen-Button
    - _Anforderungen: 3.1, 3.2, 3.3, 3.5, 10.1, 10.5, 10.6_

  - [x] 2.2 Property-Test: ErklaerungTooltip zeigt sich beim ersten Besuch und persistiert Schließen
    - **Property 3: ErklaerungTooltip zeigt sich beim ersten Besuch und persistiert Schließen in localStorage**
    - Datei: `__tests__/rueckwaerts/erklaerung-tooltip.property.test.ts`
    - Teste: Tooltip sichtbar wenn `localStorage` leer, nach Schließen wird `localStorage` gesetzt, bei erneutem Mount nicht mehr sichtbar
    - **Validiert: Anforderungen 3.1, 3.3, 3.4**

- [x] 3. Checkpoint – Komponenten-Erweiterungen verifizieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Page-Komponente und State-Management
  - [x] 4.1 `RueckwaertsPage` implementieren in `src/app/(main)/songs/[id]/rueckwaerts/page.tsx`
    - Song-Daten laden via `GET /api/songs/[id]`
    - Session erstellen via `POST /api/sessions` mit `lernmethode: "RUECKWAERTS"`
    - Auth-Redirect (401 → Login, 403/404 → Dashboard)
    - Hinweismeldung bei Song ohne Strophen
    - Strophen nach `orderIndex` ABSTEIGEND sortieren (einziger logischer Unterschied zu Zeile-für-Zeile)
    - State verwalten: `currentStropheIndex`, `currentZeileIndex`, `completedZeilen`, `eingabe`, `fehlversuche`, `zeilenStatus`, `dialogOpen`, `activeStrophenIds`, `tooltipVisible`
    - Alle Komponenten orchestrieren: Navbar (mit `label="Rückwärts lernen"`), FortschrittsDots, StrophenNavigator (mit `positionSuffix="— von hinten"` und `showDirectionIcon={true}`), KumulativeAnsicht, AktiveZeile, EingabeBereich, ErklaerungTooltip
    - `StrophenAuswahlDialog` aus `src/components/cloze/` importieren und einbinden
    - Folgt dem Muster der `ZeileFuerZeilePage`
    - _Anforderungen: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 4.1, 4.4, 4.5, 4.6, 9.1, 9.2_

  - [x] 4.2 Eingabe-Logik und Textvergleich verdrahten
    - `validateLine` aus `src/lib/zeile-fuer-zeile/validate-line.ts` importieren und aufrufen
    - Bei korrekt: Status auf „korrekt", Weiter-Button aktivieren
    - Bei falsch: Fehlversuche erhöhen, Eingabefeld leeren
    - Bei 3 Fehlversuchen: Status auf „loesung", Lösung anzeigen
    - _Anforderungen: 4.7, 4.8, 4.9, 4.10, 4.11_

  - [x] 4.3 Weiter-Logik implementieren
    - Nächste Zeile als aktiv setzen, gelernte Zeile in kumulative Ansicht aufnehmen
    - Eingabefeld leeren, Fehlversuche zurücksetzen
    - Bei letzter Zeile: Erfolgsmeldung anzeigen
    - _Anforderungen: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 4.4 Strophen-Navigation in umgekehrter Reihenfolge implementieren
    - Wechsel zwischen ausgewählten Strophen via Pfeile (umgekehrte Reihenfolge)
    - Lernzustand pro Strophe in `Map<string, StropheLernzustand>` speichern
    - Beim Wechsel: Zustand der neuen Strophe laden oder Anfangszustand setzen
    - Pfeile deaktivieren am Rand der umgekehrten Reihenfolge
    - _Anforderungen: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 4.5 Strophen-Auswahl-Logik implementieren
    - Dialog öffnen/schließen, Auswahl bestätigen
    - Bei Änderung: Lernzustand komplett zurücksetzen, Übung mit erster Zeile der letzten ausgewählten Strophe neu beginnen
    - Navigation nur zwischen ausgewählten Strophen in umgekehrter Reihenfolge
    - _Anforderungen: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

  - [x] 4.6 Tooltip-Logik mit localStorage implementieren
    - Beim Mount prüfen: `localStorage.getItem("rueckwaerts-tooltip-gesehen")`
    - Wenn nicht gesehen: `tooltipVisible = true`
    - Beim Schließen: `localStorage.setItem("rueckwaerts-tooltip-gesehen", "true")`, `tooltipVisible = false`
    - _Anforderungen: 3.1, 3.3, 3.4_

  - [x] 4.7 Fortschritts-Tracking implementieren
    - `calculateStropheProgress` aus `src/lib/zeile-fuer-zeile/progress.ts` importieren
    - Fortschritt via `PUT /api/progress` persistieren
    - Bei Strophen-Abschluss: 100% setzen
    - Bei allen Strophen abgeschlossen: Session via `POST /api/sessions` erstellen
    - _Anforderungen: 8.1, 8.2, 8.3_

  - [x] 4.8 Property-Test: Strophen sind in umgekehrter Reihenfolge sortiert
    - **Property 1: Strophen sind nach orderIndex absteigend sortiert**
    - Datei: `__tests__/rueckwaerts/strophen-reverse-order.property.test.ts`
    - Für beliebige Strophen-Arrays: nach Sortierung ist jeder `orderIndex` ≥ dem nächsten
    - **Validiert: Anforderungen 1.2**

  - [x] 4.9 Property-Test: Positions-Label zeigt „— von hinten" Suffix
    - **Property 2: Positions-Label zeigt „— von hinten" Suffix**
    - Datei: `__tests__/rueckwaerts/position-label.property.test.ts`
    - StrophenNavigator mit `positionSuffix="— von hinten"` rendert den Suffix im Label
    - **Validiert: Anforderungen 2.1, 2.2**

- [x] 5. Checkpoint – Page-Logik verifizieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integration und Verdrahtung
  - [x] 6.1 Link zur „Rückwärts lernen"-Methode auf der Song-Detailseite hinzufügen
    - In `src/app/(main)/songs/[id]/page.tsx` im Abschnitt „Lernmethoden" einen neuen Link einfügen
    - Link zu `/songs/[id]/rueckwaerts` mit Label „🔄 Rückwärts lernen"
    - Folgt dem Stil der bestehenden Lernmethoden-Links
    - _Anforderungen: 1.1_

  - [x] 6.2 Property-Test: Alle bestehenden Zeile-für-Zeile-Properties gelten weiterhin
    - **Property 4: Alle bestehenden Zeile-für-Zeile-Properties gelten weiterhin**
    - Datei: `__tests__/rueckwaerts/zeile-fuer-zeile-compat.property.test.ts`
    - Verifiziere, dass `validateLine` und `calculateStropheProgress` unverändert funktionieren
    - Verifiziere, dass die erweiterten Komponenten (Navbar, StrophenNavigator) ohne die neuen Props identisch zum bisherigen Verhalten sind
    - **Validiert: Anforderungen 4.1–4.11, 5.1–5.6, 6.1–6.5**

- [x] 7. Abschluss-Checkpoint – Alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Aufgaben mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jede Aufgabe referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints sichern inkrementelle Validierung
- Property-Tests validieren universelle Korrektheitseigenschaften
- Das Feature nutzt ausschließlich bestehende API-Endpunkte und den vorhandenen `RUECKWAERTS`-Enum-Wert – keine Backend-Änderungen nötig
- Der `StrophenAuswahlDialog` wird aus `src/components/cloze/` wiederverwendet – kein neuer Dialog nötig
- Alle Utilities (`validateLine`, `calculateStropheProgress`) werden aus `src/lib/zeile-fuer-zeile/` wiederverwendet
