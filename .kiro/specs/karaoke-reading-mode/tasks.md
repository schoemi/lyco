# Implementierungsplan: Karaoke-Lesemodus

## Übersicht

Schrittweise Implementierung des Karaoke-Lesemodus als neue Route `/songs/[id]/karaoke/`. Beginn mit Typen und Hilfsfunktionen, dann Komponenten von innen nach außen, abschließend Verdrahtung in der Page-Komponente. Alle Codebeispiele in TypeScript/React.

## Tasks

- [ ] 1. Typen und Hilfsfunktionen erstellen
  - [x] 1.1 Karaoke-Typen definieren (`src/types/karaoke.ts`)
    - `DisplayMode`, `FlatLine`, `GradientConfig`, `KaraokeSettings` Typen anlegen
    - _Requirements: 1.1, 6.1_

  - [x] 1.2 `flattenLines` implementieren (`src/lib/karaoke/flatten-lines.ts`)
    - Iteriert über `song.strophen` (sortiert nach `orderIndex`), dann `zeilen`
    - Erzeugt flache `FlatLine[]`-Liste mit `globalIndex`, `indexInStrophe`, `stropheLineCount`
    - _Requirements: 1.3_

  - [ ]* 1.3 Property-Test für `flattenLines`
    - **Property 1: Zeilen-Abflachung bewahrt Vollständigkeit und Reihenfolge**
    - **Validates: Requirements 1.3**
    - Datei: `__tests__/karaoke/flatten-lines.property.test.ts`

  - [x] 1.4 `getLineOpacity` implementieren (`src/lib/karaoke/line-opacity.ts`)
    - Deckkraft-Berechnung nach Darstellungsmodus (Einzelzeile: nur aktive; Strophe: aktive 1.0, Rest 0.4; Song: aktive 1.0, gleiche Strophe 0.6, andere 0.3)
    - _Requirements: 4.2, 4.3, 5.2, 5.3, 5.4_

  - [ ]* 1.5 Property-Test für `getLineOpacity`
    - **Property 3: Deckkraft-Berechnung nach Darstellungsmodus**
    - **Validates: Requirements 4.2, 4.3, 5.2, 5.3, 5.4**
    - Datei: `__tests__/karaoke/line-opacity.property.test.ts`

  - [x] 1.6 `shouldFade` implementieren (`src/lib/karaoke/fade-visibility.ts`)
    - Fade-Effekt-Logik für obere/untere Ränder im Song-Modus
    - _Requirements: 5.5, 5.6_

  - [ ]* 1.7 Property-Test für `shouldFade`
    - **Property 7: Fade-Effekt an den Rändern im Song-Modus**
    - **Validates: Requirements 5.5, 5.6**
    - Datei: `__tests__/karaoke/fade-effect.property.test.ts`

  - [x] 1.8 localStorage-Hilfsfunktionen implementieren (`src/lib/karaoke/storage.ts`)
    - `loadKaraokeSettings`, `saveDisplayMode`, `saveScrollSpeed` mit try/catch und Fallback-Defaults
    - _Requirements: 6.4, 6.5, 10.5, 10.6_

  - [ ]* 1.9 Property-Test für Einstellungs-Persistenz
    - **Property 9: Einstellungs-Persistenz Round-Trip**
    - **Validates: Requirements 6.4, 6.5, 10.5, 10.6**
    - Datei: `__tests__/karaoke/settings-persistence.property.test.ts`

- [x] 2. Checkpoint – Hilfsfunktionen validieren
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Custom Hooks erstellen
  - [x] 3.1 `useAutoScroll` Hook implementieren (`src/lib/karaoke/use-auto-scroll.ts`)
    - `setInterval`-basierter Timer mit konfigurierbarer Geschwindigkeit
    - Stoppt automatisch bei letzter Zeile, `play`/`pause`/`toggle` API
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6_

  - [ ]* 3.2 Property-Test: Auto-Scroll stoppt an letzter Zeile
    - **Property 11: Auto-Scroll stoppt an letzter Zeile**
    - **Validates: Requirements 9.4**
    - Datei: `__tests__/karaoke/auto-scroll-stop.property.test.ts`

  - [ ]* 3.3 Property-Test: Manuelle Navigation stoppt Auto-Scroll
    - **Property 12: Manuelle Navigation stoppt Auto-Scroll**
    - **Validates: Requirements 9.5**
    - Datei: `__tests__/karaoke/manual-nav-stops-scroll.property.test.ts`

  - [x] 3.4 `useKaraokeKeyboard` Hook implementieren (`src/lib/karaoke/use-karaoke-keyboard.ts`)
    - Pfeil-hoch/runter, Leertaste (Toggle Auto-Scroll), Escape (zurück)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 3.5 Unit-Tests für Tastaturnavigation
    - Teste alle Tastatur-Events (ArrowUp, ArrowDown, Space, Escape)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
    - Datei: `__tests__/karaoke/keyboard-navigation.test.ts`

- [ ] 4. Darstellungsmodus-Komponenten erstellen
  - [x] 4.1 `EinzelzeileAnzeige` implementieren (`src/components/karaoke/einzelzeile-anzeige.tsx`)
    - Zeigt nur die aktive Zeile, zentriert
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 4.2 Property-Test: Einzelzeile-Modus zeigt genau eine Zeile
    - **Property 4: Einzelzeile-Modus zeigt genau eine Zeile**
    - **Validates: Requirements 3.1, 3.3**
    - Datei: `__tests__/karaoke/einzelzeile-mode.property.test.ts`

  - [x] 4.3 `StrophenAnzeige` implementieren (`src/components/karaoke/strophen-anzeige.tsx`)
    - Alle Zeilen der aktiven Strophe, aktive hervorgehoben, Rest abgetönt
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 4.4 Property-Test: Strophen-Modus zeigt genau die Zeilen der aktiven Strophe
    - **Property 5: Strophen-Modus zeigt genau die Zeilen der aktiven Strophe**
    - **Validates: Requirements 4.1, 4.5**
    - Datei: `__tests__/karaoke/strophen-mode.property.test.ts`

  - [x] 4.5 `SongAnzeige` implementieren (`src/components/karaoke/song-anzeige.tsx`)
    - Gesamter Song mit abgestufter Deckkraft, Fade-Effekt an Rändern, vertikale Zentrierung der aktiven Zeile
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 4.6 Property-Test: Song-Modus zeigt alle Zeilen
    - **Property 6: Song-Modus zeigt alle Zeilen**
    - **Validates: Requirements 5.1**
    - Datei: `__tests__/karaoke/song-mode.property.test.ts`

  - [x] 4.7 `TextAnzeige` implementieren (`src/components/karaoke/text-anzeige.tsx`)
    - Delegiert an `EinzelzeileAnzeige`, `StrophenAnzeige` oder `SongAnzeige` je nach `displayMode`
    - _Requirements: 2.2, 3.1, 4.1, 5.1_

- [x] 5. Checkpoint – Darstellungsmodi validieren
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. UI-Steuerungskomponenten erstellen
  - [x] 6.1 `ModusUmschalter` implementieren (`src/components/karaoke/modus-umschalter.tsx`)
    - Segmented-Control für Einzelzeile/Strophe/Song
    - _Requirements: 6.1, 6.2, 6.3, 7.5_

  - [ ]* 6.2 Property-Test: Moduswechsel bewahrt aktive Zeile
    - **Property 8: Moduswechsel bewahrt aktive Zeile**
    - **Validates: Requirements 6.3**
    - Datei: `__tests__/karaoke/mode-switch.property.test.ts`

  - [x] 6.3 `NavigationsButtons` implementieren (`src/components/karaoke/navigations-buttons.tsx`)
    - Chevron-hoch/runter, vertikal gestapelt, deaktiviert an Songgrenzen, min 44×44px Tippfläche
    - _Requirements: 7.2, 8.1, 8.2, 8.5, 8.6, 12.2, 12.5_

  - [ ]* 6.4 Property-Test: Navigation inkrementiert/dekrementiert um eins
    - **Property 10: Navigation inkrementiert/dekrementiert um eins**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 11.1, 11.2**
    - Datei: `__tests__/karaoke/navigation.property.test.ts`

  - [x] 6.5 `PlayPauseButton` implementieren (`src/components/karaoke/play-pause-button.tsx`)
    - Toggle-Button mit Play/Pause-Icon, dynamisches `aria-label`, min 44×44px
    - _Requirements: 7.3, 9.1, 9.2, 9.3, 12.3, 12.5_

  - [ ]* 6.6 Property-Test: Play-Button aria-label spiegelt Zustand wider
    - **Property 13: Play-Button aria-label spiegelt Zustand wider**
    - **Validates: Requirements 9.2, 12.3**
    - Datei: `__tests__/karaoke/play-button-aria.property.test.ts`

  - [x] 6.7 `EinstellungsDialog` implementieren (`src/components/karaoke/einstellungs-dialog.tsx`)
    - Modaler Dialog mit Slider (1–10s), Wertanzeige, ARIA-Attribute auf Slider
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 12.6_

  - [ ]* 6.8 Unit-Tests für EinstellungsDialog
    - Dialog öffnet/schließt, Slider-Bereich 1–10, Wertanzeige, ARIA-Attribute
    - _Requirements: 10.1, 10.2, 10.3, 12.6_
    - Datei: `__tests__/karaoke/einstellungs-dialog.test.ts`

  - [x] 6.9 `ZurueckButton` und `StrophenTitel` und `SongInfo` Komponenten erstellen
    - `ZurueckButton`: Pfeil-Button oben links mit `aria-label="Zurück zur Song-Detailseite"` (`src/components/karaoke/zurueck-button.tsx`)
    - `StrophenTitel`: Strophenname oben mittig (`src/components/karaoke/strophen-titel.tsx`)
    - `SongInfo`: Song-Titel + Künstler unten mittig (`src/components/karaoke/song-info.tsx`)
    - _Requirements: 2.1, 2.3, 2.4, 7.1, 12.1_

  - [ ]* 6.10 Property-Test: Strophentitel entspricht der aktiven Zeile
    - **Property 2: Strophentitel entspricht der aktiven Zeile**
    - **Validates: Requirements 2.4**
    - Datei: `__tests__/karaoke/strophe-title.property.test.ts`

- [x] 7. Checkpoint – Steuerungskomponenten validieren
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Hauptcontainer und Page-Route verdrahten
  - [x] 8.1 `KaraokeView` implementieren (`src/components/karaoke/karaoke-view.tsx`)
    - Vollbild-Layout mit Gradient-Hintergrund, alle Unterkomponenten zusammenführen
    - CSS-Transitions (200–400ms) für Zeilenwechsel und Moduswechsel
    - AriaLiveRegion für Screenreader-Benachrichtigung bei Zeilenwechsel
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 7.1, 7.2, 7.3, 7.4, 7.5, 12.4, 12.5, 12.7, 13.1, 13.2, 13.3_

  - [ ]* 8.2 Property-Test: Aria-live-Region aktualisiert bei Zeilenwechsel
    - **Property 14: Aria-live-Region aktualisiert bei Zeilenwechsel**
    - **Validates: Requirements 12.4**
    - Datei: `__tests__/karaoke/aria-live-update.property.test.ts`

  - [x] 8.3 `KaraokePage` implementieren (`src/app/(main)/songs/[id]/karaoke/page.tsx`)
    - Song-Daten laden via `/api/songs/[id]`, `flattenLines` aufrufen
    - Zustandsverwaltung: `activeLineIndex`, `displayMode`, `scrollSpeed`, `isAutoScrolling`, `settingsOpen`
    - localStorage-Integration für Modus und Geschwindigkeit
    - Fehler- und Leer-Zustände behandeln
    - Manuelle Navigation stoppt Auto-Scroll (Req 9.5)
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 6.2, 6.4, 6.5, 8.3, 8.4, 9.5, 9.6, 10.5, 10.6_

  - [ ]* 8.4 Unit-Tests für KaraokePage
    - Seite rendert mit gültigen Song-Daten, Fehlermeldung bei API-Fehler, Hinweis bei leerem Song, Standard-Modus ist Strophe, Standard-Geschwindigkeit ist 3s
    - _Requirements: 1.4, 1.5, 6.2, 9.6_
    - Datei: `__tests__/karaoke/karaoke-page.test.ts`

- [x] 9. Karaoke-Link auf Song-Detailseite hinzufügen
  - Link/Button zur Karaoke-Route auf der Song-Detailseite (`/songs/[id]`) ergänzen, analog zu den bestehenden Lernmodi-Links
  - _Requirements: 1.1_

- [x] 10. Abschluss-Checkpoint – Gesamtintegration validieren
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints sichern inkrementelle Validierung
- Property-Tests validieren universelle Korrektheitseigenschaften aus dem Design-Dokument
- Unit-Tests validieren spezifische Beispiele und Edge-Cases
