# Implementierungsplan: Lesemodus Stopp-Button (Reading Mode Stop Button)

## Übersicht

Der Lesemodus (Karaoke-Ansicht) erhält einen Stop-Button (■-Icon) in der Steuerungsleiste, der die Audio-Wiedergabe stoppt und die Abspielposition auf 0 ms zurücksetzt. Die Implementierung umfasst: Erweiterung des `AudioPlayButtonHandle`-Interfaces um eine `stop()`-Methode, eine neue `AudioStopButton`-Komponente, Integration in `KaraokeView` und `KaraokePage` mit Reset von Zeilenanzeige und Auto-Scroll.

## Tasks

- [x] 1. AudioPlayButtonHandle um stop()-Methode erweitern
  - [x] 1.1 `stop()`-Methode zum imperativen Handle in `src/components/karaoke/audio-play-button.tsx` hinzufügen
    - `AudioPlayButtonHandle`-Interface um `stop(): void` erweitern
    - In `useImperativeHandle`: `stop()` implementiert `audio.pause()` gefolgt von `audio.currentTime = 0`
    - Guard-Clause: wenn `audioRef.current` null ist, No-Op (kein Fehler)
    - Wenn Audio bereits pausiert ist, nur `currentTime = 0` setzen
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 1.2 Property-Test: Stop setzt Position zurück und pausiert Wiedergabe
    - **Property 1: Stop setzt Position zurück**
    - **Property 2: Stop pausiert Wiedergabe**
    - **Validates: Requirements 2.2, 2.3, 5.1, 5.2**
    - Für beliebige Ausgangszustände (playing/paused, beliebige currentTime) gilt nach `stop()`: `audio.paused === true && audio.currentTime === 0`
    - Test-Datei: `__tests__/reading-mode-stop-button/stop-reset.property.test.ts`

  - [x] 1.3 Property-Test: Stop ist idempotent
    - **Property 3: Stop ist idempotent**
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - Mehrfaches Aufrufen von `stop()` hat denselben Effekt wie einmaliges Aufrufen
    - Test-Datei: `__tests__/reading-mode-stop-button/stop-idempotent.property.test.ts`

  - [x] 1.4 Property-Test: Stop ohne Audio ist No-Op
    - **Property 6: Stop ohne Audio ist No-Op**
    - **Validates: Requirements 2.5**
    - Wenn `audioRef.current === null`, wirft `stop()` keinen Fehler
    - Test-Datei: `__tests__/reading-mode-stop-button/stop-noop.property.test.ts`

- [x] 2. AudioStopButton-Komponente erstellen
  - [x] 2.1 Neue Komponente `AudioStopButton` in `src/components/karaoke/audio-stop-button.tsx` erstellen
    - Props: `onStop: () => void`, `disabled?: boolean`
    - Button mit Viereck-Icon (■) als inline SVG (`<rect x="4" y="4" width="16" height="16" rx="2" />`)
    - Visueller Stil konsistent mit bestehenden Karaoke-Buttons: `min-h-[44px] min-w-[44px] rounded-full text-white`
    - `aria-label="Stopp"`, SVG mit `aria-hidden="true"`
    - `disabled`-Prop steuert Klick-Verhalten und visuelle Darstellung
    - Bei Klick: `onStop()` aufrufen
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4_

  - [x] 2.2 Unit-Tests für AudioStopButton
    - Rendert Viereck-Icon korrekt
    - Ruft `onStop` bei Klick auf
    - Ignoriert Klick wenn `disabled={true}`
    - Hat korrektes `aria-label="Stopp"`
    - SVG hat `aria-hidden="true"`
    - Touch-Target mindestens 44×44px
    - Test-Datei: `__tests__/reading-mode-stop-button/audio-stop-button.test.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4_

- [x] 3. Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integration in KaraokeView und KaraokePage
  - [x] 4.1 `KaraokeView` in `src/components/karaoke/karaoke-view.tsx` erweitern
    - Neue Prop `onStop: () => void` zum `KaraokeViewProps`-Interface hinzufügen
    - `AudioStopButton` importieren und in der Controls-Row direkt nach dem `AudioPlayButton` platzieren
    - `disabled`-Logik: `!song.audioQuellen.some((q) => q.typ === "MP3")` (konsistent mit AudioPlayButton)
    - `onStop`-Prop an `AudioStopButton` weiterleiten
    - _Requirements: 4.1, 4.2, 4.3, 1.6_

  - [x] 4.2 `KaraokePage` in `src/app/(main)/songs/[id]/karaoke/page.tsx` erweitern
    - `handleAudioStop`-Callback mit `useCallback` erstellen:
      1. `audioRef.current?.stop()` aufrufen
      2. `setActiveLineIndex(0)` aufrufen
      3. `pause()` aufrufen (Auto-Scroll deaktivieren)
    - `onStop={handleAudioStop}` als Prop an `KaraokeView` übergeben
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.3 Property-Test: Stop setzt Zeilenanzeige zurück
    - **Property 4: Stop setzt Zeilenanzeige zurück**
    - **Validates: Requirements 3.2**
    - Nach `handleAudioStop()` gilt `activeLineIndex === 0`
    - Test-Datei: `__tests__/reading-mode-stop-button/stop-line-reset.property.test.ts`

  - [x] 4.4 Property-Test: Stop deaktiviert Auto-Scroll
    - **Property 5: Stop deaktiviert Auto-Scroll**
    - **Validates: Requirements 3.3**
    - Nach `handleAudioStop()` ist Auto-Scroll deaktiviert
    - Test-Datei: `__tests__/reading-mode-stop-button/stop-autoscroll.property.test.ts`

- [x] 5. Abschluss-Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Tasks mit `*` markiert sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für die Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften aus dem Design-Dokument
- Unit-Tests validieren spezifische Beispiele und Randfälle
- Das Projekt verwendet `fast-check` (v4.6.0) mit `vitest` (v4.1.0) für Property-Based Tests
- Der `AudioStopButton` folgt dem visuellen Stil der bestehenden Karaoke-Buttons (rund, 44×44px, weiße Icons)
- Die `stop()`-Methode folgt dem bestehenden Pattern des `useImperativeHandle` in `AudioPlayButton`
