# Technisches Design: Audio-Wiedergabe & Timecodes

## Übersicht

Dieses Feature erweitert die bestehende Song-Verwaltung um die Möglichkeit, mehrere Audio-Quellen (MP3, Spotify, YouTube) pro Song zu verwalten und über Timecode-Markups pro Strophe eine Navigation im Audio-Player zu ermöglichen. Die Architektur folgt den bestehenden Mustern des Projekts: Prisma-Modell → Service-Layer → Next.js API-Route → React-Komponente.

### Kernfunktionen

- Neues `AudioQuelle`-Modell mit 1:n-Beziehung zu `Song`
- CRUD-API unter `/api/songs/[id]/audio-quellen`
- Audio-Player-Komponente mit Quellen-Umschalter (HTML5 Audio für MP3, Embeds für Spotify/YouTube)
- Timecode-Parser/Formatter-Utilities (`[mm:ss]` ↔ Millisekunden)
- Timecode-Navigation: Klick auf Strophe → Seek im Player (nur MP3)
- Timecode-Eingabe im Songtext-Editor

## Architektur

```mermaid
graph TD
    subgraph Frontend
        SDP[Song-Detailseite]
        AQM[AudioQuellenManager]
        AP[AudioPlayer]
        QU[QuellenUmschalter]
        SE[StropheEditor + Timecode]
        TC[TimecodeEingabe]
    end

    subgraph API
        AQR[/api/songs/:id/audio-quellen]
        AQR_ID[/api/songs/:id/audio-quellen/:quelleId]
        MR[/api/markups - bestehend]
    end

    subgraph Services
        AQS[audio-quelle-service.ts]
        MS[markup-service.ts - bestehend]
    end

    subgraph Datenbank
        AQ[(AudioQuelle)]
        S[(Song)]
        M[(Markup - TIMECODE)]
    end

    SDP --> AQM
    SDP --> AP
    SDP --> SE
    AP --> QU
    SE --> TC

    AQM --> AQR
    AQM --> AQR_ID
    TC --> MR

    AQR --> AQS
    AQR_ID --> AQS
    MR --> MS

    AQS --> AQ
    AQ --> S
    MS --> M
```

### Designentscheidungen

1. **Eigenes Modell statt JSON-Feld**: `AudioQuelle` als eigenes Prisma-Modell statt JSON-Array im Song, weil:
   - Typsicherheit durch Prisma-Schema
   - Individuelle CRUD-Operationen ohne Song-Update
   - Konsistenz mit bestehendem Muster (Strophe, Zeile, Markup)

2. **Embed-Player für Streaming**: Spotify und YouTube werden über ihre offiziellen Embed-APIs eingebunden. Seek-Funktionalität ist nur für MP3 verfügbar, da Embed-Player keine zuverlässige programmatische Seek-API bieten.

3. **Bestehende Markup-Infrastruktur nutzen**: Timecodes werden als `Markup` mit `typ=TIMECODE` und `ziel=STROPHE` gespeichert. Das Modell und die API existieren bereits – es wird nur die UI-Integration ergänzt.

4. **Timecode-Format `[mm:ss]`**: Einfaches, lesbares Format. Intern als Millisekunden gespeichert für präzise Seek-Operationen.

## Komponenten und Schnittstellen

### Neue Dateien

| Datei | Beschreibung |
|-------|-------------|
| `prisma/schema.prisma` | Erweiterung: `AudioTyp` Enum + `AudioQuelle` Modell |
| `src/lib/services/audio-quelle-service.ts` | CRUD-Service für Audio-Quellen |
| `src/lib/audio/timecode.ts` | Parser/Formatter: `[mm:ss]` ↔ ms |
| `src/app/api/songs/[id]/audio-quellen/route.ts` | GET (Liste) + POST (Erstellen) |
| `src/app/api/songs/[id]/audio-quellen/[quelleId]/route.ts` | PUT + DELETE |
| `src/components/songs/audio-player.tsx` | Audio-Player mit Quellen-Umschalter |
| `src/components/songs/audio-quellen-manager.tsx` | CRUD-UI für Audio-Quellen |
| `src/components/songs/timecode-eingabe.tsx` | `[mm:ss]`-Eingabefeld pro Strophe |
| `src/types/audio.ts` | TypeScript-Typen für Audio-Quellen |

### Bestehende Dateien (Änderungen)

| Datei | Änderung |
|-------|----------|
| `prisma/schema.prisma` | `AudioTyp` Enum, `AudioQuelle` Modell, Relation zu `Song` |
| `src/components/songs/strophe-editor.tsx` | Timecode-Eingabefeld pro Strophe integrieren |
| `src/components/songs/strophe-card.tsx` | Klick-Handler für Timecode-Navigation |
| `src/types/song.ts` | `AudioQuelleResponse` zu `SongDetail` hinzufügen |

### API-Schnittstellen

#### GET `/api/songs/[id]/audio-quellen`

**Response:**
```json
{
  "audioQuellen": [
    {
      "id": "cuid",
      "url": "https://example.com/song.mp3",
      "typ": "MP3",
      "label": "Instrumental",
      "orderIndex": 0
    }
  ]
}
```

#### POST `/api/songs/[id]/audio-quellen`

**Request Body:**
```json
{
  "url": "https://open.spotify.com/track/...",
  "typ": "SPOTIFY",
  "label": "Original"
}
```

**Response:** `201` mit erstellter `AudioQuelle`

#### PUT `/api/songs/[id]/audio-quellen/[quelleId]`

**Request Body:** Partielle Felder (`url`, `typ`, `label`)

**Response:** Aktualisierte `AudioQuelle`

#### DELETE `/api/songs/[id]/audio-quellen/[quelleId]`

**Response:** `{ "success": true }`

### Komponenten-Schnittstellen

```typescript
// AudioPlayer Props
interface AudioPlayerProps {
  audioQuellen: AudioQuelleResponse[];
  onTimeUpdate?: (currentTimeMs: number) => void;
}

// AudioQuellenManager Props
interface AudioQuellenManagerProps {
  songId: string;
  audioQuellen: AudioQuelleResponse[];
  onQuellenChanged: () => void;
}

// TimecodeEingabe Props
interface TimecodeEingabeProps {
  stropheId: string;
  initialTimecodeMs: number | null;
  onTimecodeChanged: (timecodeMs: number | null) => void;
}
```

### Timecode-Utility-Funktionen

```typescript
// src/lib/audio/timecode.ts

/** Konvertiert "[mm:ss]" → Millisekunden. Gibt null zurück bei ungültigem Format. */
function parseTimecode(input: string): number | null;

/** Konvertiert Millisekunden → "[mm:ss]" */
function formatTimecode(ms: number): string;

/** Validiert ob ein String ein gültiger Timecode ist */
function isValidTimecode(input: string): boolean;
```

## Datenmodelle

### Neues Prisma-Schema

```prisma
enum AudioTyp {
  MP3
  SPOTIFY
  YOUTUBE
}

model AudioQuelle {
  id         String   @id @default(cuid())
  songId     String
  url        String
  typ        AudioTyp
  label      String
  orderIndex Int
  createdAt  DateTime @default(now())

  song Song @relation(fields: [songId], references: [id], onDelete: Cascade)

  @@map("audio_quellen")
}
```

### Erweiterung Song-Modell

```prisma
model Song {
  // ... bestehende Felder
  audioQuellen AudioQuelle[]
}
```

### TypeScript-Typen

```typescript
// src/types/audio.ts
import { AudioTyp } from "@/generated/prisma/client";

export interface AudioQuelleResponse {
  id: string;
  url: string;
  typ: AudioTyp;
  label: string;
  orderIndex: number;
}

export interface CreateAudioQuelleInput {
  url: string;
  typ: AudioTyp;
  label: string;
}

export interface UpdateAudioQuelleInput {
  url?: string;
  typ?: AudioTyp;
  label?: string;
}
```

### Bestehendes Markup-Modell (wird genutzt, nicht geändert)

Timecodes nutzen das bestehende `Markup`-Modell:
- `typ`: `TIMECODE`
- `ziel`: `STROPHE`
- `timecodeMs`: Wert in Millisekunden
- `stropheId`: Referenz zur Strophe

## Korrektheitseigenschaften

*Eine Korrektheitseigenschaft ist ein Merkmal oder Verhalten, das für alle gültigen Ausführungen eines Systems gelten sollte – im Wesentlichen eine formale Aussage darüber, was das System tun soll. Eigenschaften bilden die Brücke zwischen menschenlesbaren Spezifikationen und maschinenverifizierbaren Korrektheitsgarantien.*

### Property 1: Audio-Quelle Erstellungs-Roundtrip

*Für jede* gültige Kombination aus URL, AudioTyp und Label: Wenn eine Audio-Quelle erstellt und anschließend abgerufen wird, sollen alle Felder (url, typ, label) mit den Eingabewerten übereinstimmen.

**Validates: Requirements 1.1, 7.2**

### Property 2: Update bewahrt unveränderte Felder

*Für jede* existierende Audio-Quelle und jede Teilmenge von Update-Feldern: Nach einem Update sollen die nicht im Update enthaltenen Felder unverändert bleiben, und die aktualisierten Felder sollen die neuen Werte enthalten.

**Validates: Requirements 1.2, 7.3**

### Property 3: Löschen entfernt und reindiziert

*Für jede* Liste von Audio-Quellen eines Songs: Wenn eine Quelle an beliebiger Position gelöscht wird, sollen die verbleibenden Quellen lückenlose, aufsteigende orderIndex-Werte (0, 1, 2, ...) haben und die gelöschte Quelle nicht mehr enthalten sein.

**Validates: Requirements 1.3, 7.4**

### Property 4: Timecode Parse/Format Roundtrip

*Für jeden* gültigen Timecode-Wert in Millisekunden (0 ≤ ms < 6000000): `parseTimecode(formatTimecode(ms))` soll den ursprünglichen Millisekundenwert (gerundet auf ganze Sekunden) zurückgeben. Umgekehrt: *Für jeden* gültigen Timecode-String im Format `[mm:ss]` (0 ≤ mm ≤ 99, 0 ≤ ss ≤ 59): `formatTimecode(parseTimecode(str))` soll den ursprünglichen String zurückgeben.

**Validates: Requirements 3.1, 3.2**

### Property 5: Ungültige Timecodes werden abgelehnt

*Für jeden* String, der nicht dem Muster `[mm:ss]` mit mm ∈ [0,99] und ss ∈ [0,59] entspricht: `parseTimecode` soll `null` zurückgeben und `isValidTimecode` soll `false` zurückgeben.

**Validates: Requirements 3.3**

### Property 6: Ungültige URLs werden abgelehnt

*Für jeden* String, der keine gültige URL ist (kein http/https-Protokoll, leerer String, nur Whitespace): Das Erstellen einer Audio-Quelle soll fehlschlagen und einen Validierungsfehler zurückgeben.

**Validates: Requirements 1.5**

### Property 7: Seek nur bei MP3

*Für jeden* AudioTyp ungleich MP3 (SPOTIFY, YOUTUBE): Die Seek-Funktion soll deaktiviert sein bzw. `false` zurückgeben, wenn versucht wird, zu einem Timecode zu navigieren.

**Validates: Requirements 4.3**

### Property 8: Eigentümer-Autorisierung

*Für jeden* Nutzer und jeden Song, der einem anderen Nutzer gehört: Alle CRUD-Operationen auf Audio-Quellen dieses Songs sollen mit einem Autorisierungsfehler (403) abgelehnt werden.

**Validates: Requirements 5.3, 7.6**

### Property 9: Authentifizierung erforderlich

*Für jeden* API-Request ohne gültige Session: Alle Endpunkte unter `/api/songs/[id]/audio-quellen` sollen mit Status 401 antworten.

**Validates: Requirements 7.5**

### Property 10: Audio-Quellen sortiert nach orderIndex

*Für jede* Menge von Audio-Quellen eines Songs: Die GET-Antwort soll die Quellen aufsteigend nach orderIndex sortiert zurückgeben, und nach jeder Neuordnung sollen die orderIndex-Werte die neue Reihenfolge widerspiegeln.

**Validates: Requirements 1.4, 7.1**

### Property 11: Timecode-Upsert erstellt oder aktualisiert Markup

*Für jede* Strophe und jeden gültigen Timecode-Wert: Wenn kein TIMECODE-Markup existiert, soll ein neues erstellt werden. Wenn bereits eines existiert, soll der timecodeMs-Wert aktualisiert werden. In beiden Fällen soll genau ein TIMECODE-Markup pro Strophe existieren.

**Validates: Requirements 6.2**

## Fehlerbehandlung

| Szenario | HTTP-Status | Fehlermeldung |
|----------|-------------|---------------|
| Nicht authentifiziert | 401 | "Nicht authentifiziert" |
| Zugriff auf fremden Song | 403 | "Zugriff verweigert" |
| Song nicht gefunden | 404 | "Song nicht gefunden" |
| Audio-Quelle nicht gefunden | 404 | "Audio-Quelle nicht gefunden" |
| Ungültige URL | 400 | "Ungültige URL" |
| Ungültiger AudioTyp | 400 | "Ungültiger Audio-Typ" |
| Fehlendes Label | 400 | "Label ist erforderlich" |
| Ungültiger Timecode | 400 | "Ungültiges Timecode-Format" |
| Interner Fehler | 500 | "Interner Serverfehler" |

### Fehlerbehandlungsmuster

Die Fehlerbehandlung folgt dem bestehenden Muster im Projekt:
- Service-Layer wirft spezifische `Error`-Instanzen mit deutschen Fehlermeldungen
- API-Route fängt Fehler ab und mappt sie auf HTTP-Statuscodes
- Frontend zeigt Fehlermeldungen in der UI an

```typescript
// Service-Layer Pattern
if (!audioQuelle) {
  throw new Error("Audio-Quelle nicht gefunden");
}
if (song.userId !== userId) {
  throw new Error("Zugriff verweigert");
}

// API-Route Pattern
catch (error) {
  if (error instanceof Error) {
    if (error.message === "Audio-Quelle nicht gefunden") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    // ...
  }
}
```

## Teststrategie

### Dualer Testansatz

Dieses Feature wird mit zwei komplementären Testansätzen getestet:

1. **Unit-Tests**: Spezifische Beispiele, Edge-Cases und Integrationspunkte
2. **Property-Based Tests**: Universelle Eigenschaften über alle gültigen Eingaben

### Property-Based Testing

- **Bibliothek**: `fast-check` (bereits im Projekt als devDependency vorhanden)
- **Mindestiterationen**: 100 pro Property-Test
- **Tagging-Format**: `Feature: audio-playback-timecodes, Property {nummer}: {titel}`
- **Jede Korrektheitseigenschaft wird durch genau einen Property-Based Test implementiert**

### Testdateien

| Datei | Typ | Beschreibung |
|-------|-----|-------------|
| `__tests__/audio/timecode-roundtrip.property.test.ts` | Property | Property 4: Parse/Format Roundtrip |
| `__tests__/audio/timecode-validation.property.test.ts` | Property | Property 5: Ungültige Timecodes |
| `__tests__/audio/url-validation.property.test.ts` | Property | Property 6: Ungültige URLs |
| `__tests__/audio/seek-mp3-only.property.test.ts` | Property | Property 7: Seek nur bei MP3 |
| `__tests__/audio/audio-quelle-crud.property.test.ts` | Property | Properties 1, 2, 3, 10: CRUD + Sortierung |
| `__tests__/audio/audio-quelle-auth.property.test.ts` | Property | Properties 8, 9: Auth + Ownership |
| `__tests__/audio/timecode-upsert.property.test.ts` | Property | Property 11: Timecode-Upsert |
| `__tests__/audio/audio-player.test.ts` | Unit | Player-Rendering, Quellen-Umschalter |
| `__tests__/audio/audio-quellen-manager.test.ts` | Unit | CRUD-UI-Interaktionen |
| `__tests__/audio/audio-quelle-api.test.ts` | Unit | API-Route-Integration |

### Generatoren für Property-Tests

```typescript
// fast-check Arbitraries
const audioTypArb = fc.constantFrom("MP3", "SPOTIFY", "YOUTUBE");
const labelArb = fc.string({ minLength: 1, maxLength: 50 });
const validUrlArb = fc.oneof(
  fc.webUrl(),
  fc.constant("https://open.spotify.com/track/abc123"),
  fc.constant("https://www.youtube.com/watch?v=abc123")
);
const validTimecodeMs = fc.integer({ min: 0, max: 5999000 });
const validTimecodeStr = fc.tuple(
  fc.integer({ min: 0, max: 99 }),
  fc.integer({ min: 0, max: 59 })
).map(([mm, ss]) => `[${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}]`);
```
