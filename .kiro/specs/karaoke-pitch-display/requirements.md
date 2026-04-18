# Requirements Document: Karaoke Pitch Display

## Einleitung

Erweiterung des bestehenden Vocal Trainers um eine Karaoke-artige Pitch-Visualisierung. Die vorhandenen Referenz-Frequenzdaten (`ReferenzDaten` mit `ReferenzFrame[]`) werden genutzt, um horizontale Pitch-Balken oberhalb des Songtexts darzustellen. Ein Wiedergabe-Cursor bewegt sich synchron zur Audio-Wiedergabe durch die Pitch-Balken. Das bestehende Timecode-basierte Zeilen-Highlighting bleibt erhalten.

## Glossar

- **Pitch_Display**: Die SVG/Canvas-basierte Visualisierungskomponente, die Pitch-Balken oberhalb des Songtexts rendert
- **Pitch_Balken**: Ein einzelner horizontaler Balken, dessen vertikale Position die Tonhöhe (MIDI-Wert) und dessen horizontale Ausdehnung die Dauer einer stimmaktiven Phase repräsentiert
- **Wiedergabe_Cursor**: Eine vertikale Linie, die sich synchron zur Audio-Wiedergabe horizontal durch die Pitch-Balken bewegt
- **ReferenzDaten**: Voranalysierte JSON-Daten des Vocal-Stems mit Frame-weisen Frequenzinformationen (Typ `ReferenzDaten` aus `src/types/vocal-trainer.ts`)
- **ReferenzFrame**: Einzelner Analyse-Frame mit `timestampMs`, `f0Hz`, `midiValue`, `isVoiced` und `isOnset`
- **Timecode_Highlighting**: Das bestehende System, das Strophen- und Zeilen-Timecodes nutzt, um die aktive Textzeile während der Audio-Wiedergabe hervorzuheben (via `useTimecodeScroll`)
- **Vocal_Trainer_View**: Die bestehende Hauptkomponente des Vocal Trainers (`vocal-trainer-view.tsx`)
- **Karaoke_View**: Die bestehende Karaoke-Ansicht (`karaoke-view.tsx`) mit Text-Darstellung und Audio-Wiedergabe
- **TextAnzeige**: Die bestehende Komponente zur Darstellung des Songtexts in verschiedenen Modi (Einzelzeile, Strophe, Song)
- **Sichtfenster**: Der aktuell sichtbare Zeitausschnitt der Pitch-Visualisierung, der sich mit dem Wiedergabe-Cursor mitbewegt

## Requirements

### Requirement 1: Pitch-Balken aus ReferenzDaten erzeugen

**User Story:** Als Sänger möchte ich die Tonhöhen des Referenz-Vocals als horizontale Balken sehen, damit ich die Melodie visuell verfolgen kann.

#### Akzeptanzkriterien

1. WHEN ReferenzDaten für einen Song vorhanden sind, THE Pitch_Display SHALL zusammenhängende stimmaktive Frames (`isVoiced === true`) zu Pitch_Balken aggregieren
2. THE Pitch_Display SHALL die vertikale Position jedes Pitch_Balkens proportional zum MIDI-Wert (`midiValue`) des ReferenzFrames berechnen
3. THE Pitch_Display SHALL die horizontale Position und Breite jedes Pitch_Balkens proportional zu `timestampMs` (Start) und Dauer der stimmaktiven Phase berechnen
4. WHEN ein ReferenzFrame `isVoiced === false` hat, THE Pitch_Display SHALL keinen Pitch_Balken für diesen Frame rendern
5. IF die ReferenzDaten keine stimmaktiven Frames enthalten, THEN THE Pitch_Display SHALL eine leere Visualisierung ohne Pitch_Balken rendern
6. FOR ALL gültigen ReferenzDaten gilt: die Anzahl der erzeugten Pitch_Balken SHALL kleiner oder gleich der Anzahl zusammenhängender stimmaktiver Segmente in den Frames sein (Aggregations-Invariante)

### Requirement 2: Pitch-Visualisierung oberhalb des Textes positionieren

**User Story:** Als Sänger möchte ich die Pitch-Balken oberhalb des Songtexts sehen, damit ich gleichzeitig die Melodie und den Text verfolgen kann.

#### Akzeptanzkriterien

1. THE Pitch_Display SHALL oberhalb der TextAnzeige-Komponente im Layout positioniert werden
2. THE Pitch_Display SHALL eine konfigurierbare Höhe zwischen 80px und 200px einnehmen
3. THE Pitch_Display SHALL die volle verfügbare Breite des Containers nutzen
4. WHILE die TextAnzeige sichtbar ist, THE Pitch_Display SHALL den verfügbaren vertikalen Platz mit der TextAnzeige teilen, ohne dass der Text abgeschnitten wird
5. WHEN der DisplayMode auf „keinText" gesetzt ist, THE Pitch_Display SHALL den gesamten verfügbaren Bereich nutzen

### Requirement 3: Wiedergabe-Cursor synchron zur Audio-Wiedergabe

**User Story:** Als Sänger möchte ich einen Cursor sehen, der sich synchron zur Musik durch die Pitch-Balken bewegt, damit ich weiß, wo ich mich im Song befinde.

#### Akzeptanzkriterien

1. WHILE Audio abgespielt wird, THE Wiedergabe_Cursor SHALL sich horizontal proportional zur aktuellen Wiedergabeposition (`currentTimeMs`) durch die Pitch_Balken bewegen
2. THE Wiedergabe_Cursor SHALL als vertikale Linie über die gesamte Höhe des Pitch_Display gerendert werden
3. WHEN die Audio-Wiedergabe pausiert wird, THE Wiedergabe_Cursor SHALL an der aktuellen Position stehen bleiben
4. WHEN die Audio-Wiedergabe fortgesetzt wird, THE Wiedergabe_Cursor SHALL die Bewegung an der aktuellen Position fortsetzen
5. THE Wiedergabe_Cursor SHALL visuell deutlich von den Pitch_Balken unterscheidbar sein (z.B. durch Farbe und Deckkraft)

### Requirement 4: Sichtfenster mit automatischem Scrollen

**User Story:** Als Sänger möchte ich, dass die Pitch-Visualisierung automatisch zum aktuellen Abschnitt scrollt, damit ich immer den relevanten Bereich sehe.

#### Akzeptanzkriterien

1. THE Pitch_Display SHALL ein Sichtfenster von konfigurierbar 10–30 Sekunden Dauer darstellen
2. WHILE Audio abgespielt wird, THE Pitch_Display SHALL das Sichtfenster so verschieben, dass der Wiedergabe_Cursor im linken Drittel des sichtbaren Bereichs positioniert ist
3. WHEN der Song länger als das Sichtfenster ist, THE Pitch_Display SHALL nur die Pitch_Balken innerhalb des aktuellen Sichtfensters rendern
4. THE Pitch_Display SHALL das Sichtfenster flüssig (ohne sichtbare Sprünge) verschieben

### Requirement 5: Integration in den Vocal Trainer

**User Story:** Als Sänger möchte ich die Pitch-Visualisierung während der Aufnahme im Vocal Trainer sehen, damit ich meine Intonation in Echtzeit verfolgen kann.

#### Akzeptanzkriterien

1. WHILE der Vocal_Trainer_View im Zustand „AUFNAHME" ist, THE Pitch_Display SHALL oberhalb der TextAnzeige angezeigt werden
2. THE Vocal_Trainer_View SHALL die vorhandenen ReferenzDaten an die Pitch_Display-Komponente übergeben
3. WHILE der Vocal_Trainer_View im Zustand „BEREIT" oder „ERGEBNIS" ist, THE Pitch_Display SHALL nicht sichtbar sein
4. THE Pitch_Display SHALL das bestehende Timecode_Highlighting nicht beeinträchtigen — die aktive Textzeile wird weiterhin über das Timecode-System gesteuert

### Requirement 6: Integration in die Karaoke-Ansicht

**User Story:** Als Sänger möchte ich die Pitch-Visualisierung auch in der Karaoke-Ansicht nutzen können, damit ich beim Üben die Melodie visuell verfolgen kann.

#### Akzeptanzkriterien

1. WHEN ReferenzDaten für den aktuellen Song vorhanden sind und Audio abgespielt wird, THE Karaoke_View SHALL die Pitch_Display-Komponente oberhalb der TextAnzeige anzeigen
2. WHEN keine ReferenzDaten vorhanden sind, THE Karaoke_View SHALL die Pitch_Display-Komponente nicht rendern
3. THE Karaoke_View SHALL einen Toggle-Button bereitstellen, mit dem der Nutzer die Pitch_Display ein- und ausschalten kann
4. THE Pitch_Display SHALL die Audio-Zeitposition aus dem bestehenden `onAudioTimeUpdate`-Callback der Karaoke_View nutzen

### Requirement 7: Visuelle Gestaltung der Pitch-Balken

**User Story:** Als Sänger möchte ich die Pitch-Balken klar und gut lesbar sehen, damit ich die Tonhöhen schnell erfassen kann.

#### Akzeptanzkriterien

1. THE Pitch_Display SHALL Pitch_Balken mit abgerundeten Ecken (border-radius) rendern
2. THE Pitch_Display SHALL Pitch_Balken mit einer Mindesthöhe von 4px und einer Standardhöhe von 6px rendern
3. THE Pitch_Display SHALL eine halbtransparente Farbe für die Pitch_Balken verwenden, die zum dunklen Hintergrund des Vocal Trainers und der Karaoke-Ansicht passt (z.B. `rgba(139, 92, 246, 0.7)` — Violett)
4. THE Pitch_Display SHALL eine vertikale Skala anzeigen, die die Notennamen (z.B. C3, D3, E3) an der linken Seite des Displays darstellt
5. THE Pitch_Display SHALL horizontale Hilfslinien für die Noten-Positionen rendern, um die Orientierung zu erleichtern

### Requirement 8: Pitch-Balken-Aggregation serialisieren und deserialisieren

**User Story:** Als Entwickler möchte ich die aggregierten Pitch-Balken-Daten serialisieren und deserialisieren können, damit sie gecacht und effizient geladen werden können.

#### Akzeptanzkriterien

1. THE Pitch_Display SHALL eine Funktion `aggregiereFramesZuBalken(frames: ReferenzFrame[]): PitchBalken[]` bereitstellen, die ReferenzFrames zu Pitch_Balken aggregiert
2. THE Pitch_Display SHALL eine Funktion `serializePitchBalken(balken: PitchBalken[]): string` bereitstellen
3. THE Pitch_Display SHALL eine Funktion `deserializePitchBalken(json: string): PitchBalken[]` bereitstellen
4. FOR ALL gültigen PitchBalken-Arrays gilt: `deserializePitchBalken(serializePitchBalken(balken))` SHALL ein äquivalentes Array erzeugen (Round-Trip-Eigenschaft)
5. WHEN ungültiges JSON übergeben wird, THE `deserializePitchBalken`-Funktion SHALL einen beschreibenden Fehler werfen

### Requirement 9: Barrierefreiheit

**User Story:** Als Nutzer mit Screenreader möchte ich eine textuelle Beschreibung der Pitch-Visualisierung erhalten, damit ich die Informationen ebenfalls nutzen kann.

#### Akzeptanzkriterien

1. THE Pitch_Display SHALL ein `role="img"` Attribut und ein beschreibendes `aria-label` tragen, das die Anzahl der Pitch_Balken und den Tonhöhenbereich zusammenfasst
2. THE Wiedergabe_Cursor SHALL über eine `aria-live="polite"` Region den aktuellen Zeitpunkt im Song ansagen, wenn sich die Position signifikant ändert (z.B. alle 5 Sekunden)
3. THE Pitch_Display SHALL per Tastatur fokussierbar sein und auf Pfeiltasten reagieren, um das Sichtfenster manuell zu verschieben

### Requirement 10: Performance

**User Story:** Als Sänger möchte ich eine flüssige Darstellung ohne Ruckeln, damit die Visualisierung mich beim Singen nicht ablenkt.

#### Akzeptanzkriterien

1. THE Pitch_Display SHALL bei Songs mit bis zu 10.000 ReferenzFrames mit mindestens 30 FPS rendern
2. THE Pitch_Display SHALL nur die Pitch_Balken innerhalb des aktuellen Sichtfensters rendern (Virtualisierung)
3. WHEN das Sichtfenster sich verschiebt, THE Pitch_Display SHALL die Neuberechnung der sichtbaren Balken in weniger als 16ms durchführen
4. THE Pitch_Display SHALL `requestAnimationFrame` oder eine vergleichbare Technik für die Cursor-Animation verwenden
