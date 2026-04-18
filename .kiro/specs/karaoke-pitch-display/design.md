# Design-Dokument: Karaoke Pitch Display

## Übersicht

Dieses Design beschreibt die Erweiterung des bestehenden Vocal Trainers und der Karaoke-Ansicht um eine Pitch-Visualisierung. Die vorhandenen `ReferenzDaten` (mit `ReferenzFrame[]`) werden genutzt, um horizontale Pitch-Balken oberhalb des Songtexts darzustellen. Ein Wiedergabe-Cursor bewegt sich synchron zur Audio-Wiedergabe durch die Balken.

### Zentrale Design-Entscheidungen

1. **SVG-basiertes Rendering**: Wie der bestehende `VergleichsGraph` wird die Pitch-Visualisierung als SVG gerendert. SVG bietet deklaratives Rendering, gute Accessibility-Unterstützung (`role="img"`, `aria-label`) und ist im Projekt bereits etabliert.

2. **Reine Datentransformations-Schicht**: Die Aggregation von `ReferenzFrame[]` zu `PitchBalken[]` und alle Koordinaten-Berechnungen werden als reine Funktionen implementiert — unabhängig von React-Komponenten. Das ermöglicht einfaches Testen und Caching.

3. **Sichtfenster-Virtualisierung**: Nur Balken innerhalb des aktuellen Zeitfensters werden gerendert. Bei Songs mit bis zu 10.000 Frames ist das entscheidend für die Performance.

4. **Wiederverwendung bestehender Infrastruktur**: Die Audio-Zeitsynchronisation nutzt die vorhandenen Mechanismen (`onAudioTimeUpdate` in der Karaoke-Ansicht, `audioRef.current.currentTime` im Vocal Trainer). Das Timecode-basierte Zeilen-Highlighting bleibt unverändert.

### Forschungsergebnisse

**Bestehende Architektur-Analyse:**
- `VergleichsGraph` (SVG, `useMemo` für Skalierung, `role="img"` + `aria-label`) dient als Referenzmuster
- `TextAnzeige` rendert in drei Modi (einzelzeile, strophe, song) + `keinText` — die Pitch-Anzeige wird *oberhalb* davon positioniert
- `useTimecodeScroll` synchronisiert Zeilen-Highlighting über `currentTimeMs` → `getLineIndexForTime()` — dieses System bleibt unberührt
- `AudioPlayButton` liefert `onTimeUpdate(currentTimeMs)` als Callback — die Pitch-Anzeige nutzt denselben Zeitwert
- Im Vocal Trainer läuft die Zeitsynchronisation über `setInterval` mit `audioRef.current.currentTime * 1000`
- Styling: Tailwind-Klassen + inline `style` für Gradienten, dunkler Hintergrund (`bg-gradient-to-b from-neutral-900`)
- Testing: Vitest + fast-check (Property-Based Testing), `@testing-library/react` für Render-Tests

## Architektur

### Komponentenhierarchie

```mermaid
graph TD
    subgraph "Karaoke-Ansicht"
        KP[KaraokePage] --> KV[KaraokeView]
        KV --> PD1[PitchDisplay]
        KV --> TA1[TextAnzeige]
        KV --> APB[AudioPlayButton]
    end

    subgraph "Vocal Trainer"
        VTP[VocalTrainerPage] --> VTV[VocalTrainerView]
        VTV --> PD2[PitchDisplay]
        VTV --> TA2[TextAnzeige]
    end

    subgraph "Datenfluss"
        RD[ReferenzDaten] --> AGG[aggregiereFramesZuBalken]
        AGG --> PB[PitchBalken Array]
        PB --> PD1
        PB --> PD2
        TIME[currentTimeMs] --> PD1
        TIME --> PD2
    end
