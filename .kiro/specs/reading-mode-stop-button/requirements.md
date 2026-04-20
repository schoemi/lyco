# Requirements Document

## Einführung

Dieses Feature fügt einen Stop-Button (■-Icon) zur Player-Steuerungsleiste im Lesemodus (Karaoke-Ansicht) hinzu. Der Stop-Button unterscheidet sich vom bestehenden Pause-Button: Er pausiert die Audio-Wiedergabe und setzt die Abspielposition auf den Anfang (0 ms) zurück. Zusätzlich wird die Zeilenanzeige auf die erste Zeile zurückgesetzt und ein aktiver Auto-Scroll deaktiviert. Die Implementierung umfasst eine neue `AudioStopButton`-Komponente, eine Erweiterung des `AudioPlayButtonHandle`-Interfaces um eine `stop()`-Methode sowie die Integration in `KaraokeView` und `KaraokePage`.

## Glossar

- **AudioStopButton**: Die neue UI-Komponente, die den Stop-Button (■-Icon) rendert
- **AudioPlayButton**: Die bestehende Komponente zur Audio-Wiedergabe mit imperativem Handle
- **AudioPlayButtonHandle**: Das imperative Interface des AudioPlayButton, das Methoden wie `seekTo`, `getCurrentTimeMs`, `getDurationMs`, `getIsPlaying` und die neue `stop`-Methode bereitstellt
- **KaraokeView**: Die Ansichtskomponente des Lesemodus, die die Steuerungsleiste mit Play-, Stop- und Navigations-Buttons enthält
- **KaraokePage**: Die Seitenkomponente des Lesemodus, die den Zustand (aktive Zeile, Auto-Scroll) verwaltet und Callbacks an KaraokeView übergibt
- **HTMLAudioElement**: Das native Browser-Audio-Element, das die tatsächliche Wiedergabe steuert
- **Auto-Scroll**: Die automatische Weiterschaltung der Zeilenanzeige im Lesemodus, gesteuert durch den PlayPauseButton
- **ActiveLineIndex**: Der Index der aktuell hervorgehobenen Zeile in der Karaoke-Anzeige
- **MP3-Quelle**: Eine Audioquelle vom Typ "MP3" in der `audioQuellen`-Liste eines Songs
- **Touch-Target**: Die minimale Interaktionsfläche eines Buttons (mindestens 44×44px gemäß WCAG 2.5.8)

## Requirements

### Requirement 1: AudioStopButton-Komponente

**User Story:** Als Nutzer möchte ich einen Stop-Button in der Karaoke-Steuerungsleiste sehen, damit ich die Wiedergabe stoppen und zum Anfang zurückkehren kann.

#### Acceptance Criteria für Requirement 1

1. THE AudioStopButton SHALL einen Button mit einem Viereck-Icon (■) rendern
2. THE AudioStopButton SHALL dem visuellen Stil der bestehenden Karaoke-Buttons folgen (rund, weiße Icons auf transparentem Hintergrund)
3. THE AudioStopButton SHALL ein Touch-Target von mindestens 44×44 Pixeln bereitstellen
4. WHEN der Nutzer auf den AudioStopButton klickt, THE AudioStopButton SHALL die übergebene `onStop`-Callback-Funktion aufrufen
5. WHEN die `disabled`-Prop `true` ist, THE AudioStopButton SHALL Klick-Interaktionen ignorieren und visuell als deaktiviert dargestellt werden
6. WHEN keine MP3-Quelle in den Audioquellen vorhanden ist, THE AudioStopButton SHALL mit `disabled={true}` gerendert werden

### Requirement 2: AudioPlayButtonHandle.stop()-Methode

**User Story:** Als Entwickler möchte ich eine `stop()`-Methode im AudioPlayButtonHandle haben, damit die Audio-Wiedergabe programmatisch gestoppt und die Position zurückgesetzt werden kann.

#### Acceptance Criteria für Requirement 2

1. THE AudioPlayButtonHandle SHALL eine `stop()`-Methode bereitstellen
2. WHEN `stop()` aufgerufen wird, THE AudioPlayButton SHALL die Audio-Wiedergabe pausieren (`audio.pause()`)
3. WHEN `stop()` aufgerufen wird, THE AudioPlayButton SHALL die Abspielposition auf 0 setzen (`audio.currentTime = 0`)
4. WHEN `stop()` aufgerufen wird und die Wiedergabe bereits pausiert ist, THE AudioPlayButton SHALL nur die Position auf 0 zurücksetzen
5. WHEN `stop()` aufgerufen wird und das Audio-Element nicht verfügbar ist (`audioRef.current === null`), THE AudioPlayButton SHALL keinen Fehler werfen (No-Op)
6. WHEN `stop()` aufgerufen wird, THE AudioPlayButton SHALL das `onPlayStateChange`-Callback mit `false` auslösen (via `onPause`-Event des Audio-Elements)
7. WHEN `stop()` aufgerufen wird, THE AudioPlayButton SHALL das `onTimeUpdate`-Callback mit `0` auslösen (via `timeupdate`-Event des Audio-Elements)

### Requirement 3: Stop-Verhalten in KaraokePage

**User Story:** Als Nutzer möchte ich, dass beim Stoppen der Wiedergabe die gesamte Karaoke-Ansicht in den Anfangszustand zurückkehrt, damit ich den Song von vorne beginnen kann.

#### Acceptance Criteria für Requirement 3

1. WHEN der Stop-Button betätigt wird, THE KaraokePage SHALL `audioRef.current.stop()` aufrufen, um die Audio-Wiedergabe zu stoppen und die Position zurückzusetzen
2. WHEN der Stop-Button betätigt wird, THE KaraokePage SHALL den `activeLineIndex` auf 0 setzen, um die erste Zeile hervorzuheben
3. WHEN der Stop-Button betätigt wird und Auto-Scroll aktiv ist, THE KaraokePage SHALL den Auto-Scroll pausieren
4. WHEN der Stop-Button betätigt wird und Auto-Scroll bereits inaktiv ist, THE KaraokePage SHALL den Zustand unverändert lassen (kein Fehler)

### Requirement 4: Integration in KaraokeView

**User Story:** Als Nutzer möchte ich den Stop-Button an einer logischen Position in der Steuerungsleiste finden, damit ich ihn intuitiv bedienen kann.

#### Acceptance Criteria für Requirement 4

1. THE KaraokeView SHALL den AudioStopButton in der Steuerungsleiste direkt neben dem AudioPlayButton platzieren
2. THE KaraokeView SHALL eine neue `onStop`-Prop akzeptieren und an den AudioStopButton weiterleiten
3. WHEN keine MP3-Audioquelle vorhanden ist, THE KaraokeView SHALL den AudioStopButton als deaktiviert rendern (konsistent mit dem AudioPlayButton-Verhalten)

### Requirement 5: Idempotenz und Zustandskonsistenz

**User Story:** Als Nutzer möchte ich den Stop-Button jederzeit betätigen können, ohne dass unerwartete Fehler auftreten, unabhängig vom aktuellen Wiedergabezustand.

#### Acceptance Criteria für Requirement 5

1. WHEN `stop()` mehrfach hintereinander aufgerufen wird, THE AudioPlayButton SHALL nach jedem Aufruf denselben Endzustand herstellen (`audio.paused === true` und `audio.currentTime === 0`)
2. WHEN `stop()` aufgerufen wird und die Wiedergabe bereits bei Position 0 pausiert ist, THE AudioPlayButton SHALL den Zustand unverändert lassen
3. WHEN `handleAudioStop()` mehrfach hintereinander aufgerufen wird, THE KaraokePage SHALL nach jedem Aufruf denselben Endzustand herstellen (`activeLineIndex === 0`, Auto-Scroll deaktiviert)

### Requirement 6: Barrierefreiheit

**User Story:** Als Nutzer mit Screenreader oder eingeschränkter Motorik möchte ich den Stop-Button barrierefrei bedienen können, damit ich die volle Funktionalität des Lesemodus nutzen kann.

#### Acceptance Criteria für Requirement 6

1. THE AudioStopButton SHALL ein `aria-label` mit dem Wert `"Stopp"` besitzen
2. THE AudioStopButton SHALL per Tastatur erreichbar sein (Tab-Navigation) und per Enter oder Space aktivierbar sein
3. THE AudioStopButton SHALL das SVG-Icon mit `aria-hidden="true"` auszeichnen, damit der Screenreader nur das `aria-label` vorliest
4. WHEN der AudioStopButton deaktiviert ist, THE AudioStopButton SHALL das `disabled`-Attribut setzen, damit Screenreader den Zustand korrekt kommunizieren
