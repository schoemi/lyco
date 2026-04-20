# Implementierungsplan: Takt-Erkennung (Beat Detection)

## Übersicht

Die Takt-Erkennung erweitert den Song Text Trainer um BPM-Erkennung und Beat-Visualisierung. Die Implementierung umfasst: Datenmodell-Erweiterung (Prisma), TypeScript-Typen, reine Algorithmus-Funktionen (Spectral Flux, Peak-Detection, BPM-Berechnung), einen Web Worker für die Analyse, einen Service-Layer mit API-Route (GET/PUT), UI-Komponenten für Einstellungen und Visualisierung, sowie die Integration in die bestehende Song-Detail-Seite und den AudioPlayer.

## Tasks

- [x] 1. Datenmodell und Typen definieren
  - [x] 1.1 Prisma-Schema erweitern
    - Neues Enum `BeatMethode` mit Werten `AUTOMATISCH` und `MANUELL` hinzufügen
    - Neues Modell `BeatErgebnis` mit Feldern `id`, `songId` (unique), `bpm`, `methode`, `konfidenz`, `beatPositionenMs`, `frequenzUntergrenze`, `frequenzObergrenze`, `createdAt`, `updatedAt` anlegen
    - 1:1-Relation zu `Song` mit `onDelete: Cascade` einrichten
    - `@@map("beat_ergebnisse")` für den Tabellennamen
    - `Song`-Modell um optionale Relation `beatErgebnis BeatErgebnis?` erweitern
    - Prisma-Migration ausführen
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 1.2 TypeScript-Typen erstellen unter `src/types/beat-detection.ts`
    - `BeatMethode` Type (`'AUTOMATISCH' | 'MANUELL'`)
    - `BeatDetektorRequest` und `BeatDetektorResponse` Interfaces für Worker-Messages
    - `BeatErgebnisLokal` Interface (lokales Ergebnis aus dem Worker)
    - `BeatErgebnisResponse` und `BeatErgebnisSpeichernInput` Interfaces für die API
    - `BeatEinstellungenProps` und `BeatMarkerOverlayProps` Interfaces für Komponenten
    - _Requirements: 7.4_

  - [x] 1.3 `SongDetail`-Typ in `src/types/song.ts` um optionales `beatErgebnis: BeatErgebnisResponse | null` erweitern
    - _Requirements: 7.4_

- [x] 2. Beat-Algorithmus-Funktionen implementieren
  - [x] 2.1 Reine Funktionen in `src/lib/beat-detection/beat-algorithmus.ts` erstellen
    - `berechneSpectralFlux(frames: Float32Array[]): number[]` — Positive Differenz der Magnitude-Spektren aufeinanderfolgender Frames
    - `findePeaks(flux: number[], schwellenwertFaktor: number): number[]` — Lokale Maxima mit adaptivem Schwellenwert (gleitender Mittelwert + Faktor)
    - `berechneBpm(beatPositionenMs: number[]): number` — Median der Inter-Beat-Intervalle in BPM umrechnen, Bereich [40, 240]
    - `berechneKonfidenz(beatPositionenMs: number[]): number` — `max(0, 100 - (stddev / medianIBI) * 200)`, Bereich [0, 100]
    - `berechneAbweichungProzent(manuellBpm: number, detektiertBpm: number): number` — `|manuell - detektiert| / detektiert * 100`
    - _Requirements: 2.1, 2.6, 5.2_

  - [x] 2.2 Property-Test: BPM-Erkennung liefert Werte im gültigen Bereich
    - **Property 2: BPM-Erkennung liefert Werte im gültigen Bereich**
    - **Validates: Requirements 2.6**
    - Test-Datei: `__tests__/beat-detection/bpm-bereich.property.test.ts`

  - [x] 2.3 Property-Test: BPM-Abweichungsberechnung
    - **Property 5: BPM-Abweichungsberechnung**
    - **Validates: Requirements 5.2, 5.3**
    - Test-Datei: `__tests__/beat-detection/bpm-abweichung.property.test.ts`

  - [x] 2.4 BPM-Validierungsmodul in `src/lib/beat-detection/bpm-validierung.ts` erstellen
    - `validiereManuellenBpm(manuellBpm: number, detektiertBpm: number): { uebereinstimmung: boolean; abweichungProzent: number }` — Abweichung < 5% = übereinstimmend
    - `istGueltigerBpm(wert: unknown): boolean` — Ganzzahl im Bereich [20, 300]
    - _Requirements: 4.2, 4.3, 4.4, 5.2, 5.3_

  - [x] 2.5 Property-Test: BPM-Eingabe-Validierung
    - **Property 4: BPM-Eingabe-Validierung**
    - **Validates: Requirements 4.2, 4.3, 4.4**
    - Test-Datei: `__tests__/beat-detection/bpm-validierung.property.test.ts`

- [x] 3. Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Web Worker und Service-Layer implementieren
  - [x] 4.1 Beat-Detektor-Worker in `src/lib/beat-detection/beat-detektor-worker.ts` erstellen
    - Worker empfängt `BeatDetektorRequest` mit `audioBuffer`, `sampleRate`, `frequenzUntergrenze`, `frequenzObergrenze`
    - Bandpass-Filter mit `OfflineAudioContext` und `BiquadFilterNode` anwenden
    - FFT-Frames berechnen (Hop-Size: 512 Samples)
    - Spectral Flux, Peak-Detection, BPM-Berechnung und Konfidenz über die Funktionen aus `beat-algorithmus.ts` ausführen
    - Fortschritts-Updates senden (10%, 30%, 60%, 90%)
    - Ergebnis als `BeatDetektorResponse` mit `type: 'ERGEBNIS'` senden
    - Fehlerbehandlung: `type: 'FEHLER'` bei Lade-, Dekodierungs- oder unerwarteten Fehlern
    - Muster aus `src/lib/vocal-trainer/analyse-worker.ts` folgen
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7_

  - [x] 4.2 Service-Layer in `src/lib/services/beat-ergebnis-service.ts` erstellen
    - `getBeatErgebnis(songId: string): Promise<BeatErgebnisResponse | null>` — BeatErgebnis für einen Song laden
    - `upsertBeatErgebnis(songId: string, input: BeatErgebnisSpeichernInput): Promise<BeatErgebnisResponse>` — Upsert mit `prisma.beatErgebnis.upsert()`
    - Eingabevalidierung: BPM [20, 300], Methode AUTOMATISCH/MANUELL, Konfidenz [0, 100], Frequenzen [20, 20000], Untergrenze < Obergrenze
    - _Requirements: 6.1, 6.3, 6.4, 6.5_

  - [x] 4.3 API-Route in `src/app/api/songs/[id]/beat-ergebnis/route.ts` erstellen
    - `GET` — Authentifizierung prüfen, Song-Ownership verifizieren, BeatErgebnis laden
    - `PUT` — Authentifizierung prüfen, Song-Ownership verifizieren, Request-Body validieren, BeatErgebnis upserten
    - HTTP-Status: 200 (Erfolg), 400 (ungültige Eingabe), 401 (nicht authentifiziert), 403 (fremder Song), 404 (Song nicht gefunden)
    - Bestehende Auth-Patterns aus `src/app/api/songs/[id]/audio-quellen/route.ts` folgen
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 4.4 Property-Test: BeatErgebnis Round-Trip
    - **Property 6: BeatErgebnis Round-Trip (Speichern und Laden)**
    - **Validates: Requirements 6.1**
    - Test-Datei: `__tests__/beat-detection/beat-ergebnis-roundtrip.property.test.ts`

  - [x] 4.5 Property-Test: Upsert überschreibt bestehendes Ergebnis
    - **Property 7: Upsert überschreibt bestehendes Ergebnis**
    - **Validates: Requirements 6.3, 7.2, 10.3**
    - Test-Datei: `__tests__/beat-detection/beat-ergebnis-upsert.property.test.ts`

  - [x] 4.6 Property-Test: API-Zugriffskontrolle
    - **Property 8: API-Zugriffskontrolle**
    - **Validates: Requirements 6.6, 6.7**
    - Test-Datei: `__tests__/beat-detection/api-zugriffskontrolle.property.test.ts`

  - [x] 4.7 Unit-Tests für API und Service
    - API-Endpunkte: GET, PUT, Validierung, Fehlerbehandlung
    - Service: getBeatErgebnis, upsertBeatErgebnis
    - Test-Datei: `__tests__/beat-detection/beat-ergebnis-api.test.ts`
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 5. Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. UI-Komponenten für Beat-Einstellungen implementieren
  - [x] 6.1 Hilfsfunktion für Instrumental-Auswahl erstellen
    - In `src/lib/beat-detection/beat-utils.ts`: `findeInstrumentalQuelle(audioQuellen: AudioQuelleResponse[]): AudioQuelleResponse | null` — Gibt die INSTRUMENTAL-Quelle mit dem niedrigsten `orderIndex` zurück
    - `berechneStandardModus(audioQuellen: AudioQuelleResponse[]): BeatMethode` — AUTOMATISCH wenn Instrumental vorhanden, sonst MANUELL
    - `erzwingeFrequenzConstraints(untergrenze: number, obergrenze: number): { untergrenze: number; obergrenze: number }` — Constraint-Logik für Frequenzbereich
    - _Requirements: 1.2, 1.3, 9.1, 9.3, 3.4, 3.5_

  - [x] 6.2 Property-Test: Standard-Modus basiert auf Instrumental-Verfügbarkeit
    - **Property 1: Standard-Modus basiert auf Instrumental-Verfügbarkeit**
    - **Validates: Requirements 1.2, 1.3**
    - Test-Datei: `__tests__/beat-detection/standard-modus.property.test.ts`

  - [x] 6.3 Property-Test: Frequenzbereich-Constraint-Durchsetzung
    - **Property 3: Frequenzbereich-Constraint-Durchsetzung**
    - **Validates: Requirements 3.2, 3.4, 3.5**
    - Test-Datei: `__tests__/beat-detection/frequenzbereich-constraint.property.test.ts`

  - [x] 6.4 Property-Test: Instrumental-Quellen-Auswahl
    - **Property 11: Instrumental-Quellen-Auswahl**
    - **Validates: Requirements 9.1, 9.3**
    - Test-Datei: `__tests__/beat-detection/instrumental-auswahl.property.test.ts`

  - [x] 6.5 Modus-Auswahl-Komponente in `src/components/songs/beat-modus-auswahl.tsx` erstellen
    - Zwei auswählbare Optionen: „Automatisch erkennen" und „Manuell eingeben"
    - Automatisch-Modus deaktivieren wenn keine Instrumental-Spur vorhanden, mit Hinweistext
    - _Requirements: 1.1, 1.4, 1.5_

  - [x] 6.6 Frequenzbereich-Regler-Komponente in `src/components/songs/frequenzbereich-regler.tsx` erstellen
    - Zwei Slider für Untergrenze und Obergrenze (Bereich 20–20.000 Hz)
    - Initialwerte: 60 Hz (Untergrenze), 200 Hz (Obergrenze)
    - Constraint-Logik: Untergrenze < Obergrenze erzwingen
    - Numerische Anzeige der aktuellen Werte neben den Slidern
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 6.7 BPM-Eingabe-Komponente in `src/components/songs/bpm-eingabe.tsx` erstellen
    - Numerisches Eingabefeld für BPM-Wert
    - Validierung: Ganzzahl im Bereich [20, 300]
    - Fehlermeldung bei ungültigen Werten
    - Bestätigungs-Button
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.8 BPM-Validierungs-Komponente in `src/components/songs/bpm-validierung.tsx` erstellen
    - Bestätigung anzeigen wenn Abweichung < 5%
    - Warnung mit detektiertem BPM-Wert als Alternative wenn Abweichung ≥ 5%
    - Button zum Übernehmen des detektierten Werts
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.9 Beat-Anzeige-Komponente in `src/components/songs/beat-anzeige.tsx` erstellen
    - BPM-Wert prominent anzeigen
    - Konfidenz als Prozentwert (nur bei AUTOMATISCH)
    - Warnung bei Konfidenz < 50%
    - Erkennungsmethode als Label
    - _Requirements: 8.1, 8.2, 8.5, 2.4, 2.5_

  - [x] 6.10 Hauptkomponente `BeatEinstellungen` in `src/components/songs/beat-einstellungen.tsx` erstellen
    - Aufklappbarer Bereich unterhalb des AudioPlayers
    - Integration von ModusAuswahl, FrequenzbereichRegler, BpmEingabe, BpmValidierung, BeatAnzeige
    - Worker-Instanziierung und -Kommunikation für automatische Erkennung
    - Fortschrittsindikator während der Analyse
    - „Erneut erkennen"-Button wenn bereits ein Ergebnis vorhanden
    - API-Aufrufe zum Speichern und Laden des BeatErgebnis
    - Fehlerbehandlung: Toast bei API-Fehlern, Fehlermeldungen bei Worker-Fehlern
    - Gespeichertes Ergebnis beim Öffnen laden und anzeigen
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.3, 2.4, 2.5, 2.7, 3.7, 5.1, 5.5, 6.1, 6.2, 6.3, 9.1, 9.2, 10.1, 10.2, 10.3, 10.4_

  - [x] 6.11 Unit-Tests für Beat-Einstellungen-Komponenten
    - Modi-Anzeige, Controls-Wechsel, Hinweise, Fortschrittsindikator
    - Test-Datei: `__tests__/beat-detection/beat-einstellungen.test.ts`
    - _Requirements: 1.1, 1.4, 1.5, 2.3, 2.5_

  - [x] 6.12 Unit-Tests für BPM-Eingabe und Frequenzbereich-Regler
    - Eingabefeld-Verhalten, Fehlermeldungen, Slider-Rendering, Initialwerte
    - Test-Dateien: `__tests__/beat-detection/bpm-eingabe.test.ts`, `__tests__/beat-detection/frequenzbereich-regler.test.ts`
    - _Requirements: 3.1, 3.3, 3.6, 4.1, 4.2, 4.3_

- [x] 7. Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Beat-Marker-Overlay und Integration in AudioPlayer
  - [x] 8.1 Beat-Marker-Overlay-Komponente in `src/components/songs/beat-marker-overlay.tsx` erstellen
    - Beat-Positionen als visuelle Marker auf dem Fortschrittsbalken darstellen
    - Position: `(beatMs / durationMs) * 100` Prozent
    - Aktuellen Beat hervorheben wenn Wiedergabeposition innerhalb ±50ms eines Beats liegt
    - Nächsten Beat ohne Hervorhebung anzeigen wenn kein Beat im Toleranzfenster
    - _Requirements: 8.3, 8.4_

  - [x] 8.2 Property-Test: Beat-Marker-Positionierung
    - **Property 9: Beat-Marker-Positionierung**
    - **Validates: Requirements 8.3**
    - Test-Datei: `__tests__/beat-detection/beat-marker-position.property.test.ts`

  - [x] 8.3 Property-Test: Beat-Hervorhebung bei Wiedergabe
    - **Property 10: Beat-Hervorhebung bei Wiedergabe**
    - **Validates: Requirements 8.4**
    - Test-Datei: `__tests__/beat-detection/beat-hervorhebung.property.test.ts`

  - [x] 8.4 AudioPlayer in `src/components/songs/audio-player.tsx` erweitern
    - Optionales `BeatMarkerOverlay` als Overlay auf dem Fortschrittsbalken rendern
    - Props: `beatPositionenMs`, `durationMs`, `currentTimeMs` aus `useSharedAudio` durchreichen
    - _Requirements: 8.3, 8.4_

  - [x] 8.5 StickyPlayerBar in `src/components/songs/sticky-player-bar.tsx` erweitern
    - Optionales `BeatMarkerOverlay` analog zum AudioPlayer integrieren
    - _Requirements: 8.3, 8.4_

  - [x] 8.6 Unit-Tests für Beat-Marker-Overlay
    - Marker-Rendering, Hervorhebung, Edge Cases (leeres Array, Position außerhalb)
    - Test-Datei: `__tests__/beat-detection/beat-anzeige.test.ts`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9. Song-Detail-Seite integrieren und alles verdrahten
  - [x] 9.1 Song-Detail-Seite in `src/app/(main)/songs/[id]/page.tsx` erweitern
    - BeatErgebnis beim Laden des Songs mit abrufen (include in Prisma-Query oder separater API-Call)
    - `BeatEinstellungen`-Komponente unterhalb des AudioPlayers einbinden
    - `BeatMarkerOverlay` an AudioPlayer und StickyPlayerBar übergeben wenn BeatErgebnis vorhanden
    - _Requirements: 1.1, 6.2, 8.3_

  - [x] 9.2 Unit-Tests für Worker-Message-Handling
    - Worker-Instanziierung, Fortschritts-Updates, Fehlerbehandlung
    - Test-Datei: `__tests__/beat-detection/beat-detektor-worker.test.ts`
    - _Requirements: 2.2, 2.3, 2.7_

- [x] 10. Abschluss-Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Tasks mit `*` markiert sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für die Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften aus dem Design-Dokument
- Unit-Tests validieren spezifische Beispiele und Randfälle
- Deutsche Namenskonventionen werden für Komponenten- und Variablennamen verwendet, passend zur bestehenden Codebasis
- Der Web Worker folgt dem bestehenden Muster aus `src/lib/vocal-trainer/analyse-worker.ts`
- Die API-Route folgt dem bestehenden Muster aus `src/app/api/songs/[id]/audio-quellen/route.ts`
- Das Projekt verwendet `fast-check` (v4.6.0) mit `vitest` (v4.1.0) für Property-Based Tests
