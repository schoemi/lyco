# Design Document: Set Playlist Player

## Overview

Der Set Playlist Player ermöglicht es, alle Songs eines Sets nacheinander abzuspielen. Er baut auf dem bestehenden Audio-Stack (`SharedAudioProvider`, `StickyPlayerBar`) auf und erweitert diesen um Playlist-Navigation und song-übergreifendes State-Management.

Die zentrale Herausforderung: Der bestehende `SharedAudioProvider` ist song-scoped (bekommt `audioQuellen` eines einzelnen Songs). Für die Playlist wird ein neuer `SetPlaylistProvider` eingeführt, der die Playlist verwaltet und die `audioQuellen` des jeweils aktiven Songs an einen intern genutzten Audio-Core weitergibt.

---

## Architecture

### Component Tree (Set-Detailseite)

```
SetDetailPage
  └── SetPlaylistProvider          (neuer globaler Playlist-State)
        ├── SetSongList             (bestehend, erhält activePlaylistSongId zur Hervorhebung)
        ├── SetPlaylistBar          (neue fixierte Bottom-Bar, analog zu StickyPlayerBar)
        │     ├── PlaylistControls  (Prev/Play/Pause/Next + Modusauswahl)
        │     ├── SongInfo          (Titel, Künstler, Position "2 von 5")
        │     └── ProgressBar       (bestehende Komponente)
        └── [audio element]         (intern in SetPlaylistProvider)
```

### Datenfluss

```
SetDetailPage
  │  lädt: GET /api/sets/:id/playlist
  │  (Songs mit audioQuellen, nach orderIndex sortiert)
  │
  └──► SetPlaylistProvider
         │  State: playlistSongs[], activeSongIndex, audioRolle, isPlaying, ...
         │
         ├── leitet audioQuellen[activeSong] an Audio-Core weiter
         │
         └──► SetPlaylistBar / SetSongList (via Context)
```

---

## Components

### 1. `SetPlaylistProvider`

Neuer React Context Provider. Verwaltet den kompletten Playlist-State und das `<audio>`-Element.

**Datei:** `src/components/songs/set-playlist-provider.tsx`

```ts
// Context-State
interface SetPlaylistState {
  // Playlist-Daten
  playlistSongs: PlaylistSong[];       // Nur Songs mit mindestens einer MP3-Quelle
  totalSongs: number;                  // Gesamtanzahl Songs im Set (inkl. nicht-spielbare)
  activeSongIndex: number;             // Index in playlistSongs[]
  activeSong: PlaylistSong | null;

  // Wiedergabe-State
  isPlaying: boolean;
  currentTimeMs: number;
  durationMs: number;
  volume: number;                      // 0–1 (sessionStorage-persistiert, Key: "audio-player-volume")

  // Modus (Audio-Rolle)
  audioRolle: AudioRolle;              // "STANDARD" | "INSTRUMENTAL" | "REFERENZ_VOKAL"

  // Status
  isPlaylistEnded: boolean;            // true wenn letzter Song beendet
  isLoading: boolean;                  // Initiales Laden der Playlist-Daten

  // Aktionen
  startPlaylist: () => void;
  stopPlaylist: () => void;
  togglePlay: () => void;
  skipToNext: () => void;
  skipToPrevious: () => void;
  skipToSong: (index: number) => void;
  setAudioRolle: (rolle: AudioRolle) => void;
  setVolume: (volume: number) => void;
  handleProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

// Props
interface SetPlaylistProviderProps {
  setId: string;
  children: ReactNode;
}
```

**Wichtige interne Logik:**

- `playlistSongs` = Songs aus der API-Antwort, gefiltert auf `hasMp3: true`, sortiert nach `orderIndex` (aufsteigend), Tiebreaker: `titel` alphabetisch
- Beim Start (`startPlaylist`) wird `activeSongIndex = 0` gesetzt und Wiedergabe gestartet
- `onEnded`-Handler: ruft intern `_advanceToNext()` auf → wechselt zum nächsten Song, startet Wiedergabe
- `_advanceToNext()` überspringt Songs bei Ladefehler (Req. 2.3) und setzt `isPlaylistEnded = true` wenn kein nächster Song verfügbar
- Audio-Element bekommt `key={activeSong.id + activeRolleQuelle.id}` → React erzwingt Re-Mount bei Song- oder Quellenwechsel (bewährtes Muster aus `SharedAudioProvider`)
- Modewechsel während Wiedergabe: `currentTime` des alten Elements wird gesichert, neues Audio-Element mit `pendingSeekRef` gestartet (analog zu `switchSource` in `SharedAudioProvider`)
- Volume-Persistenz: `sessionStorage`, gleicher Key `"audio-player-volume"` wie bestehender Player

**Audio-Quellen-Auswahl je Song (Modus-Logik):**

```ts
function resolveAudioQuelle(song: PlaylistSong, rolle: AudioRolle): AudioQuelleResponse | null {
  const mp3Quellen = song.audioQuellen.filter(q => q.typ === "MP3");
  return (
    mp3Quellen.find(q => q.rolle === rolle) ??
    mp3Quellen.find(q => q.rolle === "STANDARD") ??
    null  // Song wird übersprungen (Req. 5.4)
  );
}
```

---

### 2. `SetPlaylistBar`

Fixierte Bottom-Bar, erscheint sobald der Playlist-Modus aktiv ist. Analog zu `StickyPlayerBar`, aber mit Playlist-spezifischen Controls.

**Datei:** `src/components/songs/set-playlist-bar.tsx`

```ts
// Keine Props — liest alles aus SetPlaylistContext
export default function SetPlaylistBar(): JSX.Element | null
```

**Layout (ausgeklappt):**

```
┌──────────────────────────────────────────────────────────────┐
│  [▲ einklappen]                                              │
├──────────────────────────────────────────────────────────────┤
│  [|◄]  [►/||]  [►|]          Song 2 von 5                   │
│                               Bohemian Rhapsody              │
│                               Queen                          │
│  [Original] [Instrumental] [Vokal]     🔈 ───────────       │
├──────────────────────────────────────────────────────────────┤
│  ████████████░░░░░░░░░░░░░░░  02:34 / 05:55                 │
└──────────────────────────────────────────────────────────────┘
```

**Layout (eingeklappt — nur Handle sichtbar):**

```
      ┌──────────────────────────────────┐
      │  ► Bohemian Rhapsody  [►/||]  [▼]│
      └──────────────────────────────────┘
```

**Interne States:**
- `collapsed: boolean` — Toggle per Handle-Button (Wiedergabe unberührt, Req. 7.4)

**Accessibility:**
- `role="complementary"`, `aria-label="Set-Playlist-Player"`
- `aria-label` auf allen Buttons (Prev, Play/Pause, Next)
- Deaktivierte Buttons: `disabled` Attribut + `aria-disabled`
- Progress-Bar: `role="progressbar"`, `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100`

---

### 3. `PlaylistAudioRolleSelector`

Wiederverwendbare Modusauswahl-Komponente, zeigt nur verfügbare Rollen des aktiven Songs.

**Datei:** `src/components/songs/playlist-audio-rolle-selector.tsx`

```ts
interface PlaylistAudioRolleSelectorProps {
  availableRollen: AudioRolle[];   // Nur Rollen mit vorhandener MP3-Quelle
  selectedRolle: AudioRolle;
  onChange: (rolle: AudioRolle) => void;
}
```

**Label-Mapping:**
```ts
const ROLLE_LABELS: Record<AudioRolle, string> = {
  STANDARD: "Original",
  INSTRUMENTAL: "Instrumental",
  REFERENZ_VOKAL: "Vokal",
};
```

Rollen ohne verfügbare Quelle beim aktiven Song werden ausgegraut dargestellt (nicht entfernt), damit der Nutzer versteht dass der Modus existiert.

---

### 4. `SetPlaylistStartButton`

Einfacher Button auf der Set-Detailseite zum Starten der Playlist.

**Datei:** `src/components/songs/set-playlist-start-button.tsx`

```ts
interface SetPlaylistStartButtonProps {
  hasPlayableSongs: boolean;   // false → Button disabled + Tooltip
  onStart: () => void;
}
```

Zeigt eine Inline-Hinweismeldung (kein Toast) wenn das Set keine spielbaren Songs hat, die der Nutzer aktiv schließen muss (Req. 1.3, 1.6).

---

### 5. Anpassung `SetSongList`

Die bestehende Komponente wird um optionale Hervorhebung des aktiven Songs erweitert:

```ts
interface SetSongListProps {
  songs: SetSongWithProgress[];
  setId: string;
  onSongRemoved: () => void;
  onReordered: () => void;
  activeSongId?: string | null;    // NEU: optional, für Playlist-Hervorhebung
  onSongClick?: (songId: string) => void; // NEU: override für Playlist-Navigation
}
```

Wenn `activeSongId` gesetzt ist, erhält der entsprechende Listeneintrag einen visuell eindeutigen Stil (z. B. linke Akzentlinie + Hintergrundfarbe, analog zu bestehenden Status-Dots aber deutlicher).

---

## Data Model

### Neuer API-Endpunkt: `GET /api/sets/:id/playlist`

Ein dedizierter Endpunkt, der die Playlist-Daten (Songs + audioQuellen) in einem Request liefert, ohne `getSetDetail` zu brechen.

**Response:**

```ts
interface SetPlaylistResponse {
  setId: string;
  setName: string;
  songs: PlaylistSong[];       // nur Songs mit >= 1 MP3-Quelle, sortiert nach orderIndex
  skippedSongCount: number;    // Anzahl übersprungener Songs (kein MP3)
}

interface PlaylistSong {
  id: string;
  titel: string;
  kuenstler: string | null;
  orderIndex: number;
  audioQuellen: AudioQuelleResponse[];   // nur MP3-Quellen (typ === "MP3")
  hasMp3: true;                          // immer true da gefiltert
}
```

**Service-Funktion:** `getSetPlaylist(userId, setId)` in `set-service.ts`

Prisma-Query erweitert `getSetDetail` um `audioQuellen: { where: { typ: "MP3" } }` und filtert Songs ohne MP3-Quellen heraus.

### Neue TypeScript-Typen

**Datei:** `src/types/playlist.ts` (neue Datei)

```ts
import type { AudioRolle } from "@/generated/prisma/client";
import type { AudioQuelleResponse } from "@/types/audio";

export interface PlaylistSong {
  id: string;
  titel: string;
  kuenstler: string | null;
  orderIndex: number;
  audioQuellen: AudioQuelleResponse[];
}

export interface SetPlaylistResponse {
  setId: string;
  setName: string;
  songs: PlaylistSong[];
  skippedSongCount: number;
}

export type { AudioRolle };
```

---

## Components and Interfaces

### `SetPlaylistProvider` (Context Provider)

**Datei:** `src/components/songs/set-playlist-provider.tsx`

```ts
export interface SetPlaylistState {
  playlistSongs: PlaylistSong[];
  totalSongs: number;
  activeSongIndex: number;
  activeSong: PlaylistSong | null;
  isPlaying: boolean;
  currentTimeMs: number;
  durationMs: number;
  volume: number;
  audioRolle: AudioRolle;
  isPlaylistActive: boolean;
  isPlaylistEnded: boolean;
  isLoading: boolean;
  startPlaylist: () => void;
  stopPlaylist: () => void;
  togglePlay: () => void;
  skipToNext: () => void;
  skipToPrevious: () => void;
  skipToSong: (index: number) => void;
  setAudioRolle: (rolle: AudioRolle) => void;
  setVolume: (volume: number) => void;
  handleProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export interface SetPlaylistProviderProps {
  setId: string;
  children: ReactNode;
}

export function SetPlaylistProvider(props: SetPlaylistProviderProps): JSX.Element
export function useSetPlaylist(): SetPlaylistState  // throws wenn außerhalb Provider
```

### `SetPlaylistBar`

**Datei:** `src/components/songs/set-playlist-bar.tsx`

```ts
// Keine Props — liest via useSetPlaylist()
export default function SetPlaylistBar(): JSX.Element | null
// Gibt null zurück wenn !isPlaylistActive
```

### `PlaylistAudioRolleSelector`

**Datei:** `src/components/songs/playlist-audio-rolle-selector.tsx`

```ts
export interface PlaylistAudioRolleSelectorProps {
  availableRollen: AudioRolle[];
  selectedRolle: AudioRolle;
  onChange: (rolle: AudioRolle) => void;
}

export default function PlaylistAudioRolleSelector(
  props: PlaylistAudioRolleSelectorProps
): JSX.Element
```

### `SetPlaylistStartButton`

**Datei:** `src/components/songs/set-playlist-start-button.tsx`

```ts
export interface SetPlaylistStartButtonProps {
  hasPlayableSongs: boolean;
  onStart: () => void;
}

export default function SetPlaylistStartButton(
  props: SetPlaylistStartButtonProps
): JSX.Element
```

### `SetSongList` (erweitert)

**Datei:** `src/components/songs/set-song-list.tsx` (bestehend, Erweiterung)

```ts
// Neue optionale Props (bestehende Props bleiben unverändert):
activeSongId?: string | null;
onSongClick?: (songId: string, index: number) => void;
```

---

## Data Models

### API-Response-Typen

**Datei:** `src/types/playlist.ts` (neue Datei)

```ts
import type { AudioRolle } from "@/generated/prisma/client";
import type { AudioQuelleResponse } from "@/types/audio";

export interface PlaylistSong {
  id: string;
  titel: string;
  kuenstler: string | null;
  orderIndex: number;
  audioQuellen: AudioQuelleResponse[];  // nur MP3-Quellen
}

export interface SetPlaylistResponse {
  setId: string;
  setName: string;
  songs: PlaylistSong[];        // gefiltert und sortiert
  skippedSongCount: number;     // Songs ohne MP3-Quelle
}
```

### API-Endpunkt

**Route:** `src/app/api/sets/[id]/playlist/route.ts`

```ts
// GET /api/sets/:id/playlist
// Response: SetPlaylistResponse
// Errors: 401, 403, 404, 500
```

**Service-Erweiterung:** `getSetPlaylist(userId: string, setId: string): Promise<SetPlaylistResponse>` in `src/lib/services/set-service.ts`

---

## Error Handling

| Fehlerfall | Verhalten |
|---|---|
| Set leer (0 Songs) | Hinweismeldung, Playlist startet nicht (Req. 1.6) |
| Keine Songs mit MP3 | Hinweismeldung, Playlist startet nicht (Req. 1.3) |
| Teils keine MP3s | Playlist startet, nicht-spielbare Songs werden übersprungen, `skippedSongCount` angezeigt (Req. 1.4) |
| Audio-Quelle lädt nicht | Song wird übersprungen, nächster Song wird gestartet (Req. 2.3) |
| Kein Fallback für gewählte Rolle | Song übersprungen, nächster gestartet (Req. 5.4) |
| Letzter Song endet | `isPlaylistEnded = true`, Steuerelemente deaktiviert, End-Indikator angezeigt (Req. 2.2) |
| API-Fehler beim Laden der Playlist | `isLoading = false`, Fehlermeldung in UI, Playlist-Button erneut anklickbar |
| Dauer unbekannt (kein `loadedmetadata`) | Kein Fortschrittsbalken, nur abgelaufene Zeit MM:SS (Req. 4.5) |

---

## Correctness Properties

### Property 1: Moduserhalt bei Songwechsel

`audioRolle` bleibt über manuelle Navigation und automatischen Übergang erhalten — nie implizit auf `STANDARD` zurückgesetzt. Für alle Songwechsel-Events (skipToNext, skipToPrevious, onEnded) gilt: `audioRolle` nach dem Wechsel === `audioRolle` vor dem Wechsel.

**Validates: Requirements 5.2**

### Property 2: Lautstärkeerhalt

`volume` ändert sich nicht beim Song-Wechsel; wird nur durch explizite Nutzeraktion (`setVolume`) geändert. Für alle Song-Wechsel gilt: `volume` nach dem Wechsel === `volume` vor dem Wechsel.

**Validates: Requirements 6.5**

### Property 3: Pause-bei-Navigation

Wechsel im Pause-Modus startet neuen Song nicht automatisch. Wenn `isPlaying === false` vor `skipToNext()` oder `skipToPrevious()`, dann `isPlaying === false` nach dem Wechsel.

**Validates: Requirements 6.6**

### Property 4: Reihenfolge-Invariante

`playlistSongs` wird exakt einmal beim Laden sortiert (orderIndex ASC, Tiebreaker titel ASC). Für alle i < j gilt: `playlistSongs[i].orderIndex <= playlistSongs[j].orderIndex`, und bei Gleichheit `playlistSongs[i].titel <= playlistSongs[j].titel`.

**Validates: Requirements 1.5**

### Property 5: Kein paralleles Audio

Zu jedem Zeitpunkt existiert maximal ein `<audio>`-Element (erzwungen durch React `key`-Mechanismus auf Basis von `activeSong.id + activeRolleQuelle.id`).

**Validates: Requirements 2.1, 2.3**

---

## Testing Strategy

**Unit-Tests** (`__tests__/playlist/`):
- `set-playlist-provider.test.ts`: Audio-Rollen-Auflösung (`resolveAudioQuelle`), State-Transitionen (PLAYING → PAUSED → PLAYING, PLAYING → ENDED), Sortierlogik
- `playlist-audio-rolle-selector.test.ts`: Rendering verfügbarer/nicht-verfügbarer Rollen

**Property-Based Tests** (`__tests__/playlist/`):
- `set-playlist.property.test.ts`: Für beliebige Song-Listen mit gemischten Rollen gilt: Alle zurückgegebenen `playlistSongs` haben mindestens eine MP3-Quelle; `resolveAudioQuelle` gibt nie eine Nicht-MP3-Quelle zurück

**API-Tests** (`__tests__/playlist/`):
- `playlist-api.test.ts`: `GET /api/sets/:id/playlist` gibt korrekt gefilterte und sortierte Songs zurück; 403 bei fremdem Set; 404 bei nicht-existentem Set

**Integrationstests** (Storybook):
- `SetPlaylistBar.stories.tsx`: Alle visuellen Zustände (Playing, Paused, Ended, Collapsed, Expanded)

---

## Integration in Set-Detailseite

Die `SetDetailPage` wird um den `SetPlaylistProvider` und `SetPlaylistBar` erweitert:

```tsx
// src/app/(main)/sets/[id]/page.tsx (vereinfacht)
export default function SetDetailPage() {
  // ... bestehender Code ...

  return (
    <SetPlaylistProvider setId={id}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Bestehender Header */}
        <SetHeader set={set} ... />

        {/* NEU: Playlist-Start-Button neben "Song hinzufügen" */}
        <div className="mb-4 flex justify-between">
          <SetPlaylistStartButton ... />
          <AddSongButton ... />
        </div>

        {/* SetSongList mit activeSongId */}
        <SetSongListWithPlaylist songs={set.songs} setId={id} ... />
      </div>

      {/* Fixierter Player — gerendert außerhalb des scrollbaren Containers */}
      <SetPlaylistBar />
    </SetPlaylistProvider>
  );
}
```

`SetPlaylistBar` wird direkt als Kind von `SetPlaylistProvider` gerendert, außerhalb des `max-w-3xl`-Containers, damit er als `fixed bottom-0 inset-x-0` korrekt positioniert wird.

---

## State Machine

```
IDLE
  │  startPlaylist()
  ▼
LOADING_PLAYLIST
  │  API-Antwort erhalten
  │  [keine spielbaren Songs] → IDLE + Fehlermeldung
  ▼
PLAYING (activeSongIndex = 0)
  │  togglePlay()          → PAUSED
  │  skipToNext()          → PLAYING (activeSongIndex + 1)
  │  skipToPrevious()      → PLAYING (activeSongIndex - 1)
  │  setAudioRolle()       → PLAYING (gleicher Song, neue Quelle, Position erhalten)
  │  onEnded               → PLAYING (activeSongIndex + 1) oder ENDED
  │  stopPlaylist()        → IDLE
  ▼
PAUSED
  │  togglePlay()          → PLAYING
  │  skipToNext()          → PAUSED (neuer Song, Position 0) [Req. 6.6]
  │  skipToPrevious()      → PAUSED (neuer Song, Position 0) [Req. 6.6]
  │  stopPlaylist()        → IDLE
  ▼
ENDED
  │  (Steuerelemente deaktiviert, End-of-Playlist-Indikator angezeigt)
  │  stopPlaylist() / neuer Start → IDLE
```

---

## Key Design Decisions

### Warum neuer Provider statt Erweiterung von `SharedAudioProvider`?

`SharedAudioProvider` ist für den Einzel-Song-Player ausgelegt und wird auf der Song-Detailseite für Beat-Features (BeatCounter, BeatMarkerOverlay) und Seek-Funktionen verwendet. Die Playlist-Logik (Song-Wechsel, Modus-Fallbacks, Skip-on-Error) passt nicht in diesen scope. Ein separater `SetPlaylistProvider` hält die Concerns getrennt und bricht keine bestehenden Features.

### Warum neuer API-Endpunkt statt Erweiterung von `getSetDetail`?

`SetSongWithProgress` (für die Song-Liste) und `PlaylistSong` (für den Player) haben unterschiedliche Daten-Anforderungen. `getSetDetail` würde durch `audioQuellen` deutlich schwerer, auch wenn der Nutzer die Playlist gar nicht nutzt. Der dedizierte `/playlist`-Endpunkt lädt nur bei Bedarf.

### Modewechsel ohne Neustart (Req. 5.5)

Beim Moduswechsel während der Wiedergabe wird der `currentTime` des laufenden Audio-Elements gesichert. Das neue Audio-Element (andere `AudioQuelle`) erhält über `pendingSeekRef` die Zielposition und startet automatisch ab dieser Position — das bewährte Muster aus `switchSource` in `SharedAudioProvider`.

### Volume-Sharing mit bestehendem Player

Beide Player (`SharedAudioProvider` und `SetPlaylistProvider`) nutzen denselben `sessionStorage`-Key `"audio-player-volume"`, sodass die Lautstärkeeinstellung zwischen Song-Detailseite und Set-Playlist nahtlos persistiert.

---

## Dashboard Set-Footer Widget

> Diese Sektion ergänzt das bestehende Design um Requirement 8 (Set-Footer-Widget im Dashboard). Der übrige Inhalt dieses Dokuments bleibt unverändert.

### Überblick

Das Set-Footer-Widget erweitert die bestehende `SetCard`-Komponente auf dem Dashboard um eine dreigeteilte Fußzeile (`SetCardFooter`), die Set-Statistiken, Rollen-Verfügbarkeit und eine Schnellstart-Schaltfläche anzeigt. Die Dashboard-API wird um ein `stats`-Feld je Set erweitert, das die nötigen Kennzahlen ohne zusätzliche API-Aufrufe bereitstellt. Auf der Set-Detailseite wird ein `?autoplay=true`-URL-Parameter ausgewertet, um den Playlist-Modus automatisch zu starten.

---

### Neue Komponente: `SetCardFooter`

**Datei:** `src/components/songs/set-card-footer.tsx`

```ts
interface SetCardFooterProps {
  setId: string;
  stats: DashboardSetStats;
}

export function SetCardFooter({ setId, stats }: SetCardFooterProps): JSX.Element
```

**Layout (3-Spalten-Grid):**

```
┌──────────────────────┬──────────────────────┬──────────────────────┐
│  12 Titel            │  Original    10/12   │                      │
│  5 Interpreten       │  Instrumental  8/12  │  ▶  Set abspielen    │
│  45:32               │  Vocals         6/12 │                      │
└──────────────────────┴──────────────────────┴──────────────────────┘
```

**Linkes Drittel:**
- `{stats.playableSongCount} Titel` (Gesamtanzahl der Songs)
- `{stats.distinctArtistCount} Interpreten` (eindeutige nicht-leere `kuenstler`-Werte)
- Gesamtdauer: `stats.totalDurationMs !== null` → formatiert als `MM:SS`; andernfalls Text `„Dauer nicht verfügbar"`

**Mittleres Drittel:**
- `Original {stats.rolleStats.standard}/{stats.rolleStats.total}`
- `Instrumental {stats.rolleStats.instrumental}/{stats.rolleStats.total}`
- `Vocals {stats.rolleStats.referenzVokal}/{stats.rolleStats.total}`

**Rechtes Drittel:**
- `<Link href={`/sets/${setId}?autoplay=true`}>` — Play-Button
- `disabled` + `aria-disabled="true"` wenn `stats.rolleStats.total === 0`

**Hilfsfunktion** (reine Funktion, exportiert für Tests):

```ts
export function formatDuration(totalMs: number): string
// Gibt MM:SS zurück, z.B. 2730000ms → "45:30"
```

---

### Erweiterung: `SetCard`

Die bestehende Komponente `src/components/songs/set-card.tsx` erhält `stats` als optionalen Prop und rendert `SetCardFooter` unterhalb der `SongCardGrid`:

```ts
// Bestehende Props bleiben unverändert:
interface SetCardProps {
  set: DashboardSet;        // DashboardSet wird um stats erweitert (siehe Data Models)
}

// SetCardFooter wird gerendert wenn set.stats vorhanden:
{set.stats && (
  <SetCardFooter setId={set.id} stats={set.stats} />
)}
```

Der Footer erscheint unabhängig vom `expanded`-Zustand der Song-Cards — er ist immer sichtbar, solange `set.stats` vorhanden ist.

---

### Neue TypeScript-Typen in `src/types/song.ts`

Die folgenden Typen werden an das Ende des bestehenden `// --- Dashboard ---`-Abschnitts in `src/types/song.ts` angefügt:

```ts
// --- Dashboard Set-Footer Stats ---

export interface DashboardSetRolleStats {
  standard: number;        // Anzahl Spielbarer_Songs mit STANDARD-MP3
  instrumental: number;    // Anzahl Spielbarer_Songs mit INSTRUMENTAL-MP3
  referenzVokal: number;   // Anzahl Spielbarer_Songs mit REFERENZ_VOKAL-MP3
  total: number;           // Gesamtanzahl Spielbarer_Songs (>= 1 MP3-Quelle beliebiger Rolle)
}

export interface DashboardSetStats {
  playableSongCount: number;              // Anzahl Songs mit >= 1 MP3-Quelle
  rolleStats: DashboardSetRolleStats;
  totalDurationMs: number | null;         // null im MVP (kein Dauer-Feld in DB)
  distinctArtistCount: number;            // eindeutige nicht-leere kuenstler-Werte
}
```

Außerdem wird `DashboardSet` um das `stats`-Feld erweitert:

```ts
// Bestehend:
export interface DashboardSet {
  id: string;
  name: string;
  description: string | null;
  songs: SongWithProgress[];
  stats: DashboardSetStats;   // NEU — immer vorhanden (berechnet in Dashboard-Service)
}
```

---

### Dashboard-API-Erweiterung (`GET /api/dashboard`)

**Service-Erweiterung:** `src/lib/services/dashboard-service.ts` (oder äquivalente Datei)

Die bestehende Funktion, die `DashboardSet`-Objekte aufbaut, wird um die `stats`-Berechnung erweitert:

```ts
// Prisma-Query-Erweiterung: audioQuellen je Song laden
const sets = await prisma.set.findMany({
  where: { userId },
  include: {
    songs: {
      include: {
        song: {
          include: {
            audioQuellen: {
              where: { typ: "MP3" },
              select: { rolle: true },
            },
          },
        },
      },
    },
  },
});

// Berechnung je Set:
function computeSetStats(songs: SongWithMp3Quellen[]): DashboardSetStats {
  const playableSongs = songs.filter(s => s.audioQuellen.length > 0);
  const rolleStats: DashboardSetRolleStats = {
    standard:     playableSongs.filter(s => s.audioQuellen.some(q => q.rolle === "STANDARD")).length,
    instrumental: playableSongs.filter(s => s.audioQuellen.some(q => q.rolle === "INSTRUMENTAL")).length,
    referenzVokal:playableSongs.filter(s => s.audioQuellen.some(q => q.rolle === "REFERENZ_VOKAL")).length,
    total:        playableSongs.length,
  };
  const distinctArtistCount = new Set(
    songs.map(s => s.song.kuenstler).filter((k): k is string => !!k)
  ).size;
  return {
    playableSongCount: playableSongs.length,
    rolleStats,
    totalDurationMs: null,   // MVP: Dauer-Feld noch nicht in DB gespeichert
    distinctArtistCount,
  };
}
```

**`totalDurationMs: null` im MVP** — Das Feld wird in einem späteren Feature befüllt, sobald die Dauer der Audio-Quellen in der Datenbank gespeichert wird. Der `SetCardFooter` zeigt in diesem Fall `„Dauer nicht verfügbar"`.

---

### Autoplay-Mechanismus in der Set-Detailseite

**Datei:** `src/app/(main)/sets/[id]/page.tsx`

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useSetPlaylist } from "@/components/songs/set-playlist-provider";

// Innerhalb der Komponente (oder einem dedizierten Hook):
const searchParams = useSearchParams();
const autoplay = searchParams.get("autoplay") === "true";
const { startPlaylist, playlistSongs, isLoading } = useSetPlaylist();
const autoplayTriggeredRef = useRef(false);   // Idempotenz-Guard

useEffect(() => {
  if (
    autoplay &&
    !isLoading &&
    playlistSongs.length > 0 &&
    !autoplayTriggeredRef.current
  ) {
    autoplayTriggeredRef.current = true;
    startPlaylist();
  }
}, [autoplay, isLoading, playlistSongs.length, startPlaylist]);
```

**Idempotenz-Guard:** `autoplayTriggeredRef` stellt sicher, dass `startPlaylist()` bei mehrfachem Rendern oder StrictMode-Doppelaufruf nur einmal ausgelöst wird. Sobald `autoplayTriggeredRef.current === true`, hat der URL-Parameter keinen weiteren Effekt.

**Fehlerpfad (Req. 8.9):** Wenn `autoplay=true` aber `playlistSongs.length === 0` (nach Abschluss des Ladens), greift die bestehende Fehlerbehandlung des `SetPlaylistProvider` — die Hinweismeldung aus Req. 1.3 / 1.6 wird angezeigt.

---

### Neue Correctness Properties (Requirement 8)

---

### Property 6: Autoplay-Idempotenz

*For any* Set-Detailseite, die mit `?autoplay=true` geladen wird und spielbare Songs enthält: `startPlaylist()` wird genau einmal aufgerufen, unabhängig davon, wie oft die Komponente rendert oder der `autoplay`-Parameter erneut ausgewertet wird. Nach dem ersten Aufruf hat der URL-Parameter keinen weiteren Effekt auf den Playlist-State.

**Validates: Requirements 8.8**

---

### Property 7: Stats-Berechnung — Spielbare Songs und Rollen

*For any* Set mit beliebig vielen Songs und beliebigen `audioQuellen`-Konfigurationen: `computeSetStats(songs).rolleStats.total` entspricht exakt der Anzahl der Songs, die mindestens eine MP3-Quelle besitzen; und für jede Rolle R gilt: `rolleStats[R]` entspricht exakt der Anzahl der Songs, die mindestens eine MP3-Quelle mit der Rolle R besitzen.

**Validates: Requirements 8.3, 8.7**

---

### Property 8: Distinct-Artist-Zählung

*For any* Liste von Songs mit beliebigen `kuenstler`-Werten (inkl. `null`, leer, Duplikate): `distinctArtistCount` entspricht exakt der Anzahl eindeutiger, nicht-leerer `kuenstler`-Zeichenketten in der Liste.

**Validates: Requirements 8.2**

---

### Property 9: Dauer-Formatierung

*For any* `totalDurationMs`-Wert: wenn `null`, gibt `formatDuration` bzw. die Rendering-Logik den Text `„Dauer nicht verfügbar"` zurück; wenn eine nicht-negative ganze Zahl, gibt die Funktion einen String im Format `MM:SS` zurück (d. h. der String matcht `/^\d+:\d{2}$/`).

**Validates: Requirements 8.2**

---

### Ergänzungen zur Testing Strategy (Requirement 8)

**Neue Unit- und Property-Tests** (`__tests__/playlist/` oder `__tests__/dashboard/`):

| Datei | Inhalt |
|---|---|
| `set-card-footer.test.ts` | Rendering-Tests: linkes/mittleres/rechtes Drittel korrekt befüllt; Button disabled wenn total=0 |
| `dashboard-stats.property.test.ts` | Property 7 (rolleStats), Property 8 (distinctArtistCount), Property 9 (formatDuration) |
| `autoplay.property.test.ts` | Property 6 (Autoplay-Idempotenz): `startPlaylist` wird bei mehrfachem Render nur einmal aufgerufen |

**Storybook:**
- `SetCardFooter.stories.tsx`: Alle Zustände — mit Dauer, ohne Dauer, keine spielbaren Songs (Button disabled), vollständige Rollen, gemischte Rollen

**Eigenschaft der Tests:**
- Property-Tests nutzen `fast-check` (bereits im Projekt für andere Properties verwendet)
- Minimum 100 Iterationen je Property
- Tag-Format: `Feature: set-playlist-player, Property {N}: {Beschreibung}`
