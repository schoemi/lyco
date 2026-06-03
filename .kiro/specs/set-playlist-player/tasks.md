# Implementation Plan: Set Playlist Player

## Overview

Implementierung des Set-Playlist-Players in TypeScript/React (Next.js). Der Plan folgt dem Design und baut den neuen `SetPlaylistProvider`, die API-Route, den `SetPlaylistBar` und alle UI-Komponenten schrittweise auf — von den Typen über die Service-Schicht bis zur vollständigen Integration in die Set-Detailseite.

## Tasks

- [x] 1. TypeScript-Typen und API-Typen anlegen
  - [x] 1.1 `src/types/playlist.ts` erstellen
    - `PlaylistSong`-Interface mit `id`, `titel`, `kuenstler`, `orderIndex`, `audioQuellen`
    - `SetPlaylistResponse`-Interface mit `setId`, `setName`, `songs`, `skippedSongCount`
    - Re-Export von `AudioRolle` aus `@/generated/prisma/client`
    - _Requirements: 1.1, 1.2, 1.5, 5.1_

- [x] 2. Service-Schicht: `getSetPlaylist`
  - [x] 2.1 `getSetPlaylist(userId, setId)` in `src/lib/services/set-service.ts` implementieren
    - Prisma-Query: Songs mit `audioQuellen: { where: { typ: "MP3" } }` laden
    - Songs ohne MP3-Quellen herausfiltern, `skippedSongCount` berechnen
    - Sortierung: `orderIndex` ASC, Tiebreaker `titel` ASC
    - Fehlerbehandlung: 403 bei fremdem Set, 404 bei nicht-existentem Set
    - Rückgabe als `SetPlaylistResponse`
    - _Requirements: 1.2, 1.4, 1.5, 1.6_
  - [x] 2.2 Unit-Tests für `getSetPlaylist` in `__tests__/playlist/playlist-service.test.ts` schreiben
    - Filterlogik für Songs ohne MP3-Quellen
    - Sortierreihenfolge (orderIndex + Tiebreaker)
    - _Requirements: 1.2, 1.4, 1.5_

- [x] 3. API-Endpunkt: `GET /api/sets/:id/playlist`
  - [x] 3.1 `src/app/api/sets/[id]/playlist/route.ts` erstellen
    - Session-Prüfung (401 wenn nicht eingeloggt)
    - `getSetPlaylist(userId, setId)` aufrufen
    - Fehler als 403/404/500 zurückgeben
    - Erfolg als `SetPlaylistResponse` JSON
    - _Requirements: 1.1, 1.2, 1.3, 1.6_
  - [x] 3.2 API-Tests in `__tests__/playlist/playlist-api.test.ts` schreiben
    - 200 mit korrekt gefilterter und sortierter Song-Liste
    - 403 bei fremdem Set
    - 404 bei nicht-existentem Set
    - 401 bei fehlendem Session-Token
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 4. Checkpoint — Daten-Schicht validieren
  - Sicherstellen, dass API-Tests für 3.2 und Unit-Tests für 2.2 grün sind.
  - Fragen, falls Unklarheiten bei Prisma-Schema oder Auth-Middleware bestehen.

- [x] 5. `resolveAudioQuelle` und Kern-Logik des Providers
  - [x] 5.1 `resolveAudioQuelle(song, rolle)` in `src/components/songs/set-playlist-provider.tsx` implementieren
    - MP3-Quellen filtern, gewünschte Rolle suchen, Fallback auf `STANDARD`, `null` wenn kein Fallback
    - Hilfsfunktion `sortPlaylistSongs(songs)` für orderIndex-Sortierung mit Tiebreaker
    - _Requirements: 1.5, 5.3, 5.4_
  - [x] 5.2 Property-Test: Korrektheit von `resolveAudioQuelle` und Sortierung
    - **Property 4: Reihenfolge-Invariante** — für beliebige Song-Listen gilt `playlistSongs[i].orderIndex <= playlistSongs[j].orderIndex` für alle i < j; bei Gleichheit `titel` ASC
    - **Validates: Requirements 1.5**
    - In `__tests__/playlist/set-playlist.property.test.ts`
  - [x] 5.3 Property-Test: `resolveAudioQuelle` gibt nie Nicht-MP3-Quelle zurück
    - Für beliebige `PlaylistSong`-Instanzen mit gemischten Quellen-Typen gibt `resolveAudioQuelle` immer `null` oder eine MP3-Quelle zurück
    - **Validates: Requirements 1.2, 5.3, 5.4**
    - In `__tests__/playlist/set-playlist.property.test.ts`

- [x] 6. `SetPlaylistProvider` implementieren
  - [x] 6.1 Context-Interface `SetPlaylistState` und `SetPlaylistProviderProps` definieren
    - Alle State-Felder: `playlistSongs`, `activeSongIndex`, `activeSong`, `isPlaying`, `currentTimeMs`, `durationMs`, `volume`, `audioRolle`, `isPlaylistActive`, `isPlaylistEnded`, `isLoading`
    - Alle Actions: `startPlaylist`, `stopPlaylist`, `togglePlay`, `skipToNext`, `skipToPrevious`, `skipToSong`, `setAudioRolle`, `setVolume`, `handleProgressClick`
    - `useSetPlaylist()`-Hook mit Guard (throw außerhalb Provider)
    - _Requirements: 1.1, 6.1, 6.4_
  - [x] 6.2 Audio-Element-Management und Playlist-Navigation implementieren
    - `startPlaylist()`: API-Call, Filterung, Sortierung, `activeSongIndex = 0`, Wiedergabe starten
    - `<audio key={...}>` mit `activeSong.id + activeRolleQuelle.id` für Re-Mount bei Song-/Quellenwechsel
    - `onEnded`-Handler → `_advanceToNext()`: nächsten Song starten, `isPlaylistEnded = true` am Ende
    - `_advanceToNext()`: fehlerhafte Quellen überspringen (Req. 2.3), max 2 Sekunden Verzögerung (Req. 2.1)
    - `skipToNext()` / `skipToPrevious()` / `skipToSong(index)`: `isPlaying`-Zustand erhalten (Req. 6.6)
    - _Requirements: 1.1, 1.3, 1.6, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 6.6_
  - [x] 6.3 Modewechsel und Volume-Persistenz implementieren
    - `setAudioRolle()`: `currentTime` sichern, `pendingSeekRef` setzen, neues Audio-Element triggern
    - Volume aus `sessionStorage` lesen (Key `"audio-player-volume"`), Änderungen persistieren
    - `isPlaying`-Status bei Moduswechsel erhalten
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 6.4, 6.5_
  - [x] 6.4 Unit-Tests für State-Transitionen in `__tests__/playlist/set-playlist-provider.test.ts`
    - PLAYING → PAUSED → PLAYING über `togglePlay()`
    - PLAYING → ENDED nach `onEnded` des letzten Songs
    - `resolveAudioQuelle`-Aufrufe mit verschiedenen Rollen und Fallbacks
    - _Requirements: 6.1, 6.2, 6.3, 5.3, 5.4_
  - [x] 6.5 Property-Tests: Invarianten bei Songwechsel
    - **Property 1: Moduserhalt bei Songwechsel** — `audioRolle` bleibt identisch nach `skipToNext`, `skipToPrevious`, `onEnded`
    - **Validates: Requirements 5.2**
    - **Property 2: Lautstärkeerhalt** — `volume` ändert sich nicht durch Songwechsel
    - **Validates: Requirements 6.5**
    - **Property 3: Pause-bei-Navigation** — `isPlaying === false` vor und nach `skipToNext`/`skipToPrevious` wenn pausiert
    - **Validates: Requirements 6.6**
    - In `__tests__/playlist/set-playlist.property.test.ts`
  - [x] 6.6 Property-Test: Kein paralleles Audio
    - **Property 5: Kein paralleles Audio** — zu jedem Zeitpunkt maximal ein Audio-Element aktiv (React-Key-Invariante)
    - **Validates: Requirements 2.1, 2.3**
    - In `__tests__/playlist/set-playlist.property.test.ts`

- [x] 7. Checkpoint — Provider und Logik validieren
  - Sicherstellen, dass alle Tests in 6.4–6.6 grün sind.
  - Fragen, falls Unklarheiten beim Audio-Re-Mount-Verhalten bestehen.

- [x] 8. `PlaylistAudioRolleSelector` implementieren
  - [x] 8.1 `src/components/songs/playlist-audio-rolle-selector.tsx` erstellen
    - Props: `availableRollen`, `selectedRolle`, `onChange`
    - Label-Mapping: `STANDARD → "Original"`, `INSTRUMENTAL → "Instrumental"`, `REFERENZ_VOKAL → "Vokal"`
    - Nicht verfügbare Rollen ausgegraut rendern (nicht entfernen)
    - Accessibility: `aria-pressed` oder `aria-selected` auf Buttons, `aria-disabled` für ausgegraut
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 9. `SetPlaylistStartButton` implementieren
  - [x] 9.1 `src/components/songs/set-playlist-start-button.tsx` erstellen
    - Props: `hasPlayableSongs`, `onStart`
    - Button deaktiviert wenn `!hasPlayableSongs`
    - Inline-Hinweismeldung (kein Toast) mit explizitem Schließen-Button wenn keine spielbaren Songs
    - _Requirements: 1.3, 1.6_

- [x] 10. `SetPlaylistBar` implementieren
  - [x] 10.1 `src/components/songs/set-playlist-bar.tsx` erstellen — Grundstruktur
    - `null` zurückgeben wenn `!isPlaylistActive`
    - `fixed bottom-0 inset-x-0` Positionierung
    - Collapsed/Expanded-Toggle (`collapsed: boolean` State) ohne Wiedergabe-Unterbrechung
    - `role="complementary"`, `aria-label="Set-Playlist-Player"`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 10.2 Player-Controls in `SetPlaylistBar` implementieren
    - Prev- / Play-Pause- / Next-Buttons mit `aria-label` und `disabled`/`aria-disabled`
    - SongInfo: Titel, Künstler (wenn vorhanden), Position „Song X von Y"
    - Fortschrittsbalken: `role="progressbar"`, `aria-valuenow/min/max`, `onClick → handleProgressClick`
    - Zeit-Anzeige: MM:SS/MM:SS wenn Dauer bekannt, nur MM:SS wenn unbekannt (Req. 4.5)
    - Lautstärkeregler: range 0–100 (interne Skalierung auf 0–1)
    - End-of-Playlist-Indikator wenn `isPlaylistEnded`
    - `PlaylistAudioRolleSelector` integrieren
    - _Requirements: 2.2, 3.1, 3.2, 4.1, 4.2, 4.4, 4.5, 5.1, 6.1, 6.4_

- [x] 11. `SetSongList` erweitern
  - [x] 11.1 Optionale Props `activeSongId` und `onSongClick` in `src/components/songs/set-song-list.tsx` hinzufügen
    - `activeSongId?: string | null` — visuell hervorheben (linke Akzentlinie + Hintergrundfarbe)
    - `onSongClick?: (songId: string, index: number) => void` — überschreibt Standard-Klick für Playlist-Navigation
    - Bestehende Props und Verhalten unverändert lassen
    - _Requirements: 4.3_

- [x] 12. Integration in Set-Detailseite
  - [x] 12.1 `SetPlaylistProvider` und `SetPlaylistBar` in `src/app/(main)/sets/[id]/page.tsx` integrieren
    - `SetPlaylistProvider` als äußerstes Wrapper-Element mit `setId`
    - `SetPlaylistBar` als direktes Kind des Providers, außerhalb des `max-w-3xl`-Containers
    - `SetPlaylistStartButton` neben dem „Song hinzufügen"-Button rendern
    - `SetSongList` mit `activeSongId` und `onSongClick` aus Context verbinden
    - Hinweismeldung für `skippedSongCount > 0` anzeigen
    - _Requirements: 1.1, 1.3, 1.4, 1.6, 4.3, 7.1, 7.2_

- [x] 13. Finaler Checkpoint — Vollständige Integration validieren
  - Sicherstellen, dass alle Tests grün sind.
  - Visuelle Prüfung: SetPlaylistBar positioniert sich korrekt als `fixed bottom-0`, Songliste hebt aktiven Song hervor.
  - Fragen, falls Unklarheiten bei der Integration bestehen.

- [x] 14. TypeScript-Typen für Dashboard-Set-Stats erweitern
  - [x] 14.1 Neue Interfaces `DashboardSetRolleStats` und `DashboardSetStats` in `src/types/song.ts` hinzufügen
    - `DashboardSetRolleStats` mit Feldern `standard`, `instrumental`, `referenzVokal`, `total` (alle `number`)
    - `DashboardSetStats` mit Feldern `playableSongCount`, `rolleStats`, `totalDurationMs: number | null`, `distinctArtistCount`
    - Am Ende des bestehenden `// --- Dashboard ---`-Abschnitts einfügen
    - _Requirements: 8.2, 8.3, 8.7_
  - [x] 14.2 `DashboardSet`-Interface um `stats: DashboardSetStats` erweitern
    - Bestehendes `DashboardSet`-Interface in `src/types/song.ts` anpassen
    - Feld `stats` ist immer vorhanden (nicht optional), da der Dashboard-Service es stets berechnet
    - _Requirements: 8.1, 8.7_

- [x] 15. Dashboard-Service um `computeSetStats` erweitern
  - [x] 15.1 Prisma-Query in `src/lib/services/dashboard-service.ts` um `audioQuellen` je Song erweitern
    - `audioQuellen: { where: { typ: "MP3" }, select: { rolle: true } }` in die `songs`-Include-Kette einfügen
    - Sicherstellen, dass die Erweiterung keine bestehende Abfrage-Logik bricht
    - _Requirements: 8.7_
  - [x] 15.2 `computeSetStats(songs)`-Funktion implementieren
    - `playableSongs` = Songs mit `audioQuellen.length > 0`
    - `rolleStats`: je Rolle zählen wie viele `playableSongs` mindestens eine Quelle der jeweiligen Rolle haben
    - `distinctArtistCount`: `new Set(songs.map(s => s.kuenstler).filter(k => !!k)).size`
    - `totalDurationMs: null` (MVP — Dauer-Feld noch nicht in DB)
    - Funktion im Service aufrufen und das `stats`-Feld im zurückgegebenen `DashboardSet` befüllen
    - _Requirements: 8.2, 8.3, 8.7_
  - [x]* 15.3 Property-Test: `rolleStats`-Berechnung für beliebige Song-Listen
    - **Property 7: Stats-Berechnung — Spielbare Songs und Rollen**
    - `computeSetStats(songs).rolleStats.total` entspricht exakt der Anzahl Songs mit mind. 1 MP3-Quelle
    - Für jede Rolle R: `rolleStats[R]` entspricht exakt der Anzahl Songs mit mind. 1 MP3-Quelle der Rolle R
    - **Validates: Requirements 8.3, 8.7**
    - In `__tests__/dashboard/dashboard-stats.property.test.ts`
  - [x]* 15.4 Property-Test: `distinctArtistCount` für beliebige kuenstler-Werte
    - **Property 8: Distinct-Artist-Zählung**
    - Für beliebige Song-Listen mit `null`, leeren Strings und Duplikaten zählt `distinctArtistCount` nur eindeutige nicht-leere Werte
    - **Validates: Requirements 8.2**
    - In `__tests__/dashboard/dashboard-stats.property.test.ts`

- [x] 16. `SetCardFooter`-Komponente erstellen
  - [x] 16.1 `src/components/songs/set-card-footer.tsx` mit 3-Spalten-Grid-Layout erstellen
    - Props: `setId: string`, `stats: DashboardSetStats`
    - Linkes Drittel: `{stats.playableSongCount} Titel`, `{stats.distinctArtistCount} Interpreten`, Dauer (`formatDuration` wenn `totalDurationMs !== null`, sonst „Dauer nicht verfügbar")
    - Mittleres Drittel: Original `{stats.rolleStats.standard}/{stats.rolleStats.total}`, Instrumental `{stats.rolleStats.instrumental}/{stats.rolleStats.total}`, Vocals `{stats.rolleStats.referenzVokal}/{stats.rolleStats.total}`
    - Rechtes Drittel: `<Link href={/sets/${setId}?autoplay=true}>` — Play-Button; `disabled` + `aria-disabled="true"` wenn `stats.rolleStats.total === 0`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - [x] 16.2 Hilfsfunktion `formatDuration(totalMs: number): string` exportieren
    - Gibt MM:SS-Format zurück (z. B. 2730000ms → „45:30")
    - Reine Funktion ohne Side-Effects — gut für Property-Based Testing geeignet
    - _Requirements: 8.2_
  - [x]* 16.3 Property-Test: `formatDuration`-Korrektheit
    - **Property 9: Dauer-Formatierung**
    - Für `null` → Text „Dauer nicht verfügbar" (Rendering-Logik in Komponente)
    - Für beliebige nicht-negative ganze Zahlen → String matcht `/^\d+:\d{2}$/`
    - **Validates: Requirements 8.2**
    - In `__tests__/dashboard/dashboard-stats.property.test.ts`

- [x] 17. `SetCard`-Komponente um `SetCardFooter` erweitern
  - [x] 17.1 `SetCardFooter` in `src/components/songs/set-card.tsx` integrieren
    - `SetCardFooter` unterhalb der `SongCardGrid` rendern, wenn `set.stats` vorhanden ist
    - Footer immer sichtbar (unabhängig vom `expanded`-Zustand der Song-Cards)
    - Import von `SetCardFooter` und `DashboardSetStats` hinzufügen
    - _Requirements: 8.1, 8.4, 8.5, 8.6_

- [x] 18. Autoplay-Mechanismus in der Set-Detailseite implementieren
  - [x] 18.1 `useSearchParams()`-Auswertung und `useRef`-Idempotenz-Guard in `src/app/(main)/sets/[id]/page.tsx` implementieren
    - `useSearchParams()` für `?autoplay=true` auslesen
    - `autoplayTriggeredRef = useRef(false)` als Idempotenz-Guard anlegen
    - `useEffect` der `startPlaylist()` aufruft, wenn `autoplay && !isLoading && playlistSongs.length > 0 && !autoplayTriggeredRef.current`
    - Nach erstem Aufruf `autoplayTriggeredRef.current = true` setzen
    - Fehlerpfad: wenn `autoplay=true` aber keine spielbaren Songs, greift bestehende Fehlerbehandlung des Providers (Hinweismeldung aus Req. 1.3/1.6)
    - _Requirements: 8.5, 8.8, 8.9_
  - [x]* 18.2 Property-Test: Autoplay-Idempotenz
    - **Property 6: Autoplay-Idempotenz**
    - `startPlaylist()` wird bei mehrfachem Render oder StrictMode-Doppelaufruf genau einmal aufgerufen
    - Nach erstem Aufruf hat der `autoplay`-Parameter keinen weiteren Effekt auf den Playlist-State
    - **Validates: Requirements 8.8**
    - In `__tests__/playlist/autoplay.property.test.ts`

- [-] 19. Finaler Checkpoint — Requirement 8 vollständig validieren
  - Sicherstellen, dass alle neuen Tests (15.3, 15.4, 16.3, 18.2) grün sind.
  - Visuelle Prüfung: `SetCardFooter` erscheint auf dem Dashboard unterhalb jeder Set-Karte.
  - Prüfen, dass „Set abspielen"-Button auf der Set-Detailseite den Playlist-Modus automatisch startet.
  - Fragen, falls Unklarheiten bei der Integration bestehen.

## Notes

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Rückverfolgbarkeit
- Property-Tests validieren universelle Korrektheitseigenschaften (Properties 1–5 aus dem Design)
- Unit-Tests validieren spezifische Beispiele und Edge Cases
- Checkpoints stellen inkrementelle Validierung sicher
- Der `resolveAudioQuelle`-Algorithmus ist reiner Code ohne Side-Effects — besonders gut für Property-Based Testing geeignet
- Volume-Persistenz über `sessionStorage` Key `"audio-player-volume"` ist absichtlich mit `SharedAudioProvider` geteilt

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3"] },
    { "id": 6, "tasks": ["6.4", "6.5", "6.6", "8.1", "9.1"] },
    { "id": 7, "tasks": ["10.1", "11.1"] },
    { "id": 8, "tasks": ["10.2"] },
    { "id": 9, "tasks": ["12.1"] },
    { "id": 10, "tasks": ["14.1", "14.2"] },
    { "id": 11, "tasks": ["15.1", "16.2"] },
    { "id": 12, "tasks": ["15.2"] },
    { "id": 13, "tasks": ["15.3", "15.4", "16.1", "18.1"] },
    { "id": 14, "tasks": ["16.3", "17.1", "18.2"] }
  ]
}
```
