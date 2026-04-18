# Karaoke Pitch Display — Feature-Dokumentation

## Überblick

Die Pitch-Anzeige visualisiert die Melodie eines Songs als horizontale Balken oberhalb des Songtexts. Jeder Balken repräsentiert eine stimmaktive Phase: die vertikale Position zeigt die Tonhöhe (MIDI-Wert), die horizontale Ausdehnung die Dauer. Ein Wiedergabe-Cursor bewegt sich synchron zur Audio-Wiedergabe durch die Balken, sodass der Sänger jederzeit sieht, wo er sich im Song befindet.

Das Feature ist in zwei Ansichten integriert:

- **Vocal Trainer** — die Pitch-Anzeige erscheint automatisch während der Aufnahme
- **Karaoke-Ansicht** — die Pitch-Anzeige kann per Toggle-Button ein- und ausgeschaltet werden

Das bestehende Timecode-basierte Zeilen-Highlighting bleibt in beiden Ansichten unverändert.

---

## Architektur

```
src/
├── lib/pitch-display/
│   ├── pitch-balken.ts          # Datentyp + Aggregation + Serialisierung
│   └── pitch-coordinates.ts     # Viewport- und Koordinaten-Berechnung
├── components/pitch-display/
│   └── pitch-display.tsx        # SVG-Rendering-Komponente
├── components/vocal-trainer/
│   └── vocal-trainer-view.tsx   # Integration Vocal Trainer
└── components/karaoke/
    └── karaoke-view.tsx         # Integration Karaoke-Ansicht
```

Die Architektur folgt einer klaren Trennung:

1. **Datentransformation** (`pitch-balken.ts`) — reine Funktionen, unabhängig von React
2. **Koordinaten-Mathematik** (`pitch-coordinates.ts`) — reine Funktionen für Viewport und SVG-Mapping
3. **Rendering** (`pitch-display.tsx`) — React-Komponente mit SVG
4. **Integration** — Einbindung in bestehende Views

---

## Datenmodell

### PitchBalken

```typescript
interface PitchBalken {
  startMs: number;    // Startzeitpunkt in Millisekunden
  endMs: number;      // Endzeitpunkt in Millisekunden
  midiValue: number;  // Tonhöhe als MIDI-Wert (Durchschnitt der Frames)
  durationMs: number; // Dauer in Millisekunden (endMs - startMs)
}
```

Ein `PitchBalken` entsteht durch Aggregation zusammenhängender stimmaktiver `ReferenzFrame`s. Stimmlose Frames (`isVoiced === false`) erzeugen keine Balken.

### Viewport

```typescript
interface Viewport {
  startMs: number;  // Beginn des sichtbaren Zeitfensters
  endMs: number;    // Ende des sichtbaren Zeitfensters
}
```

---

## API-Referenz

### Aggregation

```typescript
import { aggregiereFramesZuBalken } from '@/lib/pitch-display/pitch-balken';

const balken = aggregiereFramesZuBalken(referenzDaten.frames);
```

Gruppiert aufeinanderfolgende stimmaktive Frames zu Pitch-Balken. Der MIDI-Wert jedes Balkens ist der Durchschnitt aller Frames im Segment.

**Verhalten:**
- Leeres Array → leeres Ergebnis
- Nur stimmlose Frames → leeres Ergebnis
- Zusammenhängende stimmaktive Frames → ein Balken pro Segment
- Ergebnis ist nach `startMs` sortiert

### Serialisierung

```typescript
import { serializePitchBalken, deserializePitchBalken } from '@/lib/pitch-display/pitch-balken';

const json = serializePitchBalken(balken);       // → JSON-String
const restored = deserializePitchBalken(json);    // → PitchBalken[]
```

Für Caching und effizientes Laden. `deserializePitchBalken` validiert die Struktur und wirft einen beschreibenden Fehler bei ungültigem Input.

### Koordinaten-Berechnung

```typescript
import {
  berechneViewport,
  filterSichtbareBalken,
  berechneSvgX,
  berechneSvgY,
  berechneMidiBereich,
} from '@/lib/pitch-display/pitch-coordinates';
```

| Funktion | Beschreibung |
|---|---|
| `berechneViewport(currentTimeMs, windowDurationMs)` | Berechnet das Sichtfenster so, dass der Cursor im linken Drittel liegt |
| `filterSichtbareBalken(balken, viewport)` | Gibt nur Balken zurück, die das Viewport-Zeitfenster überlappen |
| `berechneSvgX(timeMs, viewport, svgWidth)` | Bildet einen Zeitpunkt auf eine SVG-X-Koordinate ab |
| `berechneSvgY(midiValue, midiMin, midiMax, svgHeight, padding)` | Bildet einen MIDI-Wert auf eine SVG-Y-Koordinate ab (invertiert: höher = oben) |
| `berechneMidiBereich(balken)` | Berechnet den MIDI-Bereich (min/max) über alle Balken |

---

## PitchDisplay-Komponente

```tsx
import { PitchDisplay } from '@/components/pitch-display/pitch-display';

<PitchDisplay
  balken={pitchBalken}
  currentTimeMs={currentTimeMs}
  isPlaying={true}
  height={120}
  windowDurationMs={15000}
/>
```

### Props

| Prop | Typ | Default | Beschreibung |
|---|---|---|---|
| `balken` | `PitchBalken[]` | — | Aggregierte Pitch-Balken (Pflicht) |
| `currentTimeMs` | `number` | — | Aktuelle Wiedergabeposition in ms (Pflicht) |
| `isPlaying` | `boolean` | — | Ob Audio gerade abgespielt wird (Pflicht) |
| `height` | `number` | `120` | Höhe in Pixeln (wird auf 80–200 begrenzt) |
| `windowDurationMs` | `number` | `15000` | Sichtfenster-Dauer in ms (wird auf 10.000–30.000 begrenzt) |

### Visuelle Elemente

- **Pitch-Balken** — halbtransparente violette Rechtecke (`rgba(139, 92, 246, 0.7)`) mit abgerundeten Ecken, 6px Höhe
- **Wiedergabe-Cursor** — weiße vertikale Linie über die gesamte Höhe, positioniert im linken Drittel des Sichtfensters
- **Hilfslinien** — horizontale Linien an natürlichen Noten-Positionen (C, D, E, F, G, A, B)
- **Noten-Skala** — Notennamen (z.B. C3, D3, E3) am linken Rand

### Tastatur-Navigation

Die Komponente ist per Tab fokussierbar. Im Fokus:

| Taste | Aktion |
|---|---|
| `←` Pfeil links | Sichtfenster 2 Sekunden zurück verschieben |
| `→` Pfeil rechts | Sichtfenster 2 Sekunden vorwärts verschieben |

Der manuelle Offset wird beim Start der Wiedergabe automatisch zurückgesetzt.

### Barrierefreiheit

- `role="img"` mit beschreibendem `aria-label` (Anzahl Balken + Tonhöhenbereich)
- `aria-live="polite"` Region, die alle ~5 Sekunden die aktuelle Position ansagt
- Fokussierbar per Tastatur (`tabIndex={0}`)
- Fokus-Ring bei Tastatur-Navigation

---

## Integration

### Vocal Trainer

Die Pitch-Anzeige erscheint **automatisch während der Aufnahme** (Zustand `AUFNAHME`) oberhalb des Songtexts.

```
┌─────────────────────────────┐
│  Zurück        Strophe 1    │
│                             │
│  ┌─── Pitch-Anzeige ─────┐ │
│  │ ▬▬▬  ▬▬▬▬  ▬▬  ▬▬▬▬▬ │ │
│  │    |                   │ │
│  └────────────────────────┘ │
│                             │
│     Hello world             │
│     Second line             │
│                             │
│  [Strophe] [Einzelzeile]    │
│       ● Aufnahme stoppen    │
└─────────────────────────────┘
```

**Verhalten nach Zustand:**

| Zustand | Pitch-Anzeige |
|---|---|
| `BEREIT` | Nicht sichtbar |
| `AUFNAHME` | Sichtbar oberhalb des Textes |
| `ANALYSE` | Nicht sichtbar |
| `ERGEBNIS` | Nicht sichtbar |

Im Modus `keinText` nutzt die Pitch-Anzeige den gesamten verfügbaren Bereich (200px Höhe).

Die Zeitsynchronisation nutzt das bestehende `setInterval` im Vocal Trainer, das `audioRef.current.currentTime * 1000` alle 100ms abfragt.

### Karaoke-Ansicht

Die Pitch-Anzeige ist **optional** und wird nur angezeigt, wenn:

1. `referenzDaten` für den Song vorhanden sind
2. Audio gerade abgespielt wird
3. Der Pitch-Toggle aktiviert ist

```
┌─────────────────────────────┐
│  Zurück        Strophe 1    │
│                             │
│  ┌─── Pitch-Anzeige ─────┐ │
│  │ ▬▬▬  ▬▬▬▬  ▬▬  ▬▬▬▬▬ │ │
│  └────────────────────────┘ │
│                             │
│     Hello world             │
│                             │
│  [Strophe] [Einzelzeile] [📊]│
│     ▶  ⏯  ◀ ▶              │
└─────────────────────────────┘
```

Der Toggle-Button (📊-Icon) erscheint neben dem Modus-Umschalter, nur wenn `referenzDaten` vorhanden sind. Standardmäßig ist er aktiviert.

Die Zeitsynchronisation nutzt den bestehenden `onAudioTimeUpdate`-Callback des `AudioPlayButton`.

#### Neue Props für KaraokeView

```typescript
interface KaraokeViewProps {
  // ... bestehende Props ...
  referenzDaten?: ReferenzDaten;       // Optional: Referenzdaten für Pitch-Anzeige
  pitchDisplayEnabled?: boolean;       // Optional: initiale Aktivierung
}
```

---

## Performance

Die Komponente ist für Songs mit bis zu 10.000 Frames (ca. 100 Sekunden bei 10ms Frame-Abstand) optimiert:

- **Virtualisierung** — nur Balken innerhalb des aktuellen Sichtfensters werden gerendert (`filterSichtbareBalken`)
- **Memoization** — alle abgeleiteten Daten (Viewport, sichtbare Balken, SVG-Koordinaten, Hilfslinien) sind mit `useMemo` gecacht
- **requestAnimationFrame** — der Cursor wird über eine rAF-Schleife animiert, nicht über React-Re-Renders
- **Snap-Korrektur** — bei Drift > 500ms zwischen interpoliertem und tatsächlichem Zeitwert wird auf den Prop-Wert zurückgesetzt

Benchmark-Ergebnisse (10.000 Frames):
- Viewport-Neuberechnung: < 1ms (p95), weit unter dem 16ms-Budget für 60 FPS
- Effektiver Durchsatz: > 30 FPS bei kontinuierlicher Wiedergabe

---

## Tests

96 Tests in 10 Dateien, aufgeteilt in:

### Property-Based Tests (fast-check)

| Test | Eigenschaft |
|---|---|
| `aggregation-invariant.property.test.ts` | Anzahl PitchBalken ≤ Anzahl stimmaktiver Segmente |
| `serialization-roundtrip.property.test.ts` | `deserialize(serialize(x)) === x` für alle gültigen Eingaben |
| `viewport-positioning.property.test.ts` | Cursor-X liegt immer im linken Drittel der SVG-Breite |

### Unit Tests

| Test | Abdeckung |
|---|---|
| `aggregiere-frames.test.ts` | Aggregation: leere Eingabe, stimmlos, einzeln, mehrere Segmente, alternierend |
| `serialization.test.ts` | Serialisierung: leeres Array, ungültiges JSON, fehlerhafte Struktur |
| `pitch-coordinates.test.ts` | Koordinaten: Viewport, Filter, SVG-X/Y-Mapping, MIDI-Bereich |
| `pitch-display.test.tsx` | Komponente: SVG-Attribute, Balken-Rendering, Cursor, Tastatur, Aria |

### Integrationstests

| Test | Abdeckung |
|---|---|
| `vocal-trainer-integration.test.tsx` | PitchDisplay nur im AUFNAHME-Zustand, TextAnzeige unberührt |
| `karaoke-integration.test.tsx` | Bedingte Anzeige, Toggle-Button, Zeitsynchronisation |

### Performance-Tests

| Test | Abdeckung |
|---|---|
| `viewport-performance.test.ts` | < 16ms Neuberechnung, Virtualisierung, 30+ FPS Durchsatz |

---

## Dateiübersicht

| Datei | Zweck |
|---|---|
| `src/lib/pitch-display/pitch-balken.ts` | `PitchBalken`-Interface, Aggregation, Serialisierung |
| `src/lib/pitch-display/pitch-coordinates.ts` | Viewport, Filter, SVG-Koordinaten, MIDI-Bereich |
| `src/components/pitch-display/pitch-display.tsx` | SVG-Rendering-Komponente |
| `src/components/vocal-trainer/vocal-trainer-view.tsx` | Integration (AUFNAHME-Zustand) |
| `src/components/karaoke/karaoke-view.tsx` | Integration (optional, mit Toggle) |
