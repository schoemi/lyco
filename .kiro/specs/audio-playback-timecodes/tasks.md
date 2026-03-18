# Implementierungsplan: Audio-Wiedergabe & Timecodes

## Übersicht

Schrittweise Implementierung der Audio-Quellen-Verwaltung und Timecode-Navigation: Prisma-Schema, TypeScript-Typen, Timecode-Utilities, Service-Layer, API-Routen, UI-Komponenten (Audio-Player, Quellen-Manager, Timecode-Eingabe) und Integration in bestehende Song-Detailseite. Jeder Schritt baut auf dem vorherigen auf.

## Tasks

- [x] 1. Datenbank-Schema und TypeScript-Typen vorbereiten
  - [x] 1.1 Prisma-Schema um AudioTyp-Enum und AudioQuelle-Modell erweitern
    - `AudioTyp`-Enum mit Werten `MP3`, `SPOTIFY`, `YOUTUBE` in `prisma/schema.prisma` hinzufügen
    - `AudioQuelle`-Modell mit Feldern `id`, `songId`, `url`, `typ`, `label`, `orderIndex`, `createdAt` erstellen
    - Relation zu `Song` mit `onDelete: Cascade` und `@@map("audio_quellen")` konfigurieren
    - `audioQuellen AudioQuelle[]` Relation im bestehenden `Song`-Modell hinzufügen
    - Prisma-Migration ausführen (`npx prisma migrate dev --name add-audio-quellen`)
    - Prisma-Client neu generieren
    - _Anforderungen: 1.1, 1.4_

  - [x] 1.2 TypeScript-Typen für Audio-Feature erstellen
    - Datei `src/types/audio.ts` anlegen mit `AudioQuelleResponse`, `CreateAudioQuelleInput`, `UpdateAudioQuelleInput`
    - `AudioTyp` aus `@/generated/prisma/client` importieren
    - `SongDetail` in `src/types/song.ts` um `audioQuellen: AudioQuelleResponse[]` erweitern
    - _Anforderungen: 1.1, 7.1, 7.2_

- [x] 2. Timecode-Utilities implementieren
  - [x] 2.1 Timecode-Parser und -Formatter erstellen
    - Datei `src/lib/audio/timecode.ts` anlegen
    - `parseTimecode(input: string): number | null` implementieren – konvertiert `[mm:ss]` → Millisekunden
    - `formatTimecode(ms: number): string` implementieren – konvertiert Millisekunden → `[mm:ss]`
    - `isValidTimecode(input: string): boolean` implementieren – validiert Format `[mm:ss]` mit mm ∈ [0,99], ss ∈ [0,59]
    - _Anforderungen: 3.1, 3.2, 3.3_

  - [x] 2.2 Property-Test: Timecode Parse/Format Roundtrip
    - **Property 4: Timecode Parse/Format Roundtrip**
    - Datei `__tests__/audio/timecode-roundtrip.property.test.ts`
    - Für jeden gültigen ms-Wert (0 ≤ ms < 6000000): `parseTimecode(formatTimecode(ms))` ergibt den auf ganze Sekunden gerundeten Wert
    - Für jeden gültigen Timecode-String `[mm:ss]`: `formatTimecode(parseTimecode(str))` ergibt den ursprünglichen String
    - **Validiert: Anforderungen 3.1, 3.2**

  - [x] 2.3 Property-Test: Ungültige Timecodes werden abgelehnt
    - **Property 5: Ungültige Timecodes werden abgelehnt**
    - Datei `__tests__/audio/timecode-validation.property.test.ts`
    - Für jeden String, der nicht `[mm:ss]` mit mm ∈ [0,99] und ss ∈ [0,59] entspricht: `parseTimecode` gibt `null` zurück, `isValidTimecode` gibt `false` zurück
    - **Validiert: Anforderungen 3.3**

- [x] 3. Audio-Quelle-Service implementieren
  - [x] 3.1 CRUD-Service für Audio-Quellen erstellen
    - Datei `src/lib/services/audio-quelle-service.ts` anlegen
    - `getAudioQuellen(songId: string): Promise<AudioQuelle[]>` – sortiert nach `orderIndex` aufsteigend
    - `createAudioQuelle(songId: string, input: CreateAudioQuelleInput): Promise<AudioQuelle>` – setzt `orderIndex` automatisch
    - `updateAudioQuelle(quelleId: string, input: UpdateAudioQuelleInput): Promise<AudioQuelle>` – partielle Updates
    - `deleteAudioQuelle(quelleId: string): Promise<void>` – löscht und reindiziert verbleibende orderIndex-Werte
    - URL-Validierung (http/https-Protokoll, nicht leer) im Service
    - Eigentümer-Prüfung: Song muss dem anfragenden Nutzer gehören (403 bei Fremd-Song)
    - _Anforderungen: 1.1, 1.2, 1.3, 1.4, 1.5, 5.3_

- [x] 4. Checkpoint – Basis-Module prüfen
  - Sicherstellen, dass alle Tests bestehen, den Nutzer bei Fragen ansprechen.

- [x] 5. API-Routen für Audio-Quellen implementieren
  - [x] 5.1 GET- und POST-Endpunkt erstellen
    - Datei `src/app/api/songs/[id]/audio-quellen/route.ts` anlegen
    - `GET`-Handler: Auth-Check → Song-Eigentümer-Prüfung → `getAudioQuellen()` → sortierte Liste zurückgeben
    - `POST`-Handler: Auth-Check → Song-Eigentümer-Prüfung → Validierung (url, typ, label) → `createAudioQuelle()` → 201 mit erstellter Quelle
    - HTTP 401 bei fehlender Authentifizierung, HTTP 403 bei fremdem Song, HTTP 400 bei ungültiger Eingabe
    - _Anforderungen: 7.1, 7.2, 7.5, 7.6_

  - [x] 5.2 PUT- und DELETE-Endpunkt erstellen
    - Datei `src/app/api/songs/[id]/audio-quellen/[quelleId]/route.ts` anlegen
    - `PUT`-Handler: Auth-Check → Song-Eigentümer-Prüfung → `updateAudioQuelle()` → aktualisierte Quelle zurückgeben
    - `DELETE`-Handler: Auth-Check → Song-Eigentümer-Prüfung → `deleteAudioQuelle()` → `{ success: true }`
    - HTTP 404 bei nicht gefundener Audio-Quelle
    - _Anforderungen: 7.3, 7.4, 7.5, 7.6_

  - [x] 5.3 Property-Tests: CRUD-Operationen und Sortierung
    - **Property 1: Audio-Quelle Erstellungs-Roundtrip**
    - **Property 2: Update bewahrt unveränderte Felder**
    - **Property 3: Löschen entfernt und reindiziert**
    - **Property 10: Audio-Quellen sortiert nach orderIndex**
    - Datei `__tests__/audio/audio-quelle-crud.property.test.ts`
    - **Validiert: Anforderungen 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3, 7.4**

  - [x] 5.4 Property-Test: URL-Validierung
    - **Property 6: Ungültige URLs werden abgelehnt**
    - Datei `__tests__/audio/url-validation.property.test.ts`
    - Für jeden String ohne gültiges http/https-Protokoll, leeren String, nur Whitespace: Erstellen schlägt mit Validierungsfehler fehl
    - **Validiert: Anforderungen 1.5**

  - [x] 5.5 Property-Tests: Authentifizierung und Autorisierung
    - **Property 8: Eigentümer-Autorisierung**
    - **Property 9: Authentifizierung erforderlich**
    - Datei `__tests__/audio/audio-quelle-auth.property.test.ts`
    - Für jeden nicht-authentifizierten Request: HTTP 401; für jeden Zugriff auf fremden Song: HTTP 403
    - **Validiert: Anforderungen 5.3, 7.5, 7.6**

  - [x] 5.6 Unit-Tests für API-Routen
    - Datei `__tests__/audio/audio-quelle-api.test.ts`
    - Testen: Auth-Fehler, Eigentümer-Prüfung, erfolgreiche CRUD-Operationen, Validierungsfehler, 404 bei nicht gefundener Quelle
    - _Anforderungen: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 6. Checkpoint – API-Routen prüfen
  - Sicherstellen, dass alle Tests bestehen, den Nutzer bei Fragen ansprechen.

- [x] 7. Audio-Player-Komponente implementieren
  - [x] 7.1 Audio-Player mit Quellen-Umschalter erstellen
    - Datei `src/components/songs/audio-player.tsx` anlegen
    - HTML5 `<audio>`-Element für MP3-Quellen mit Play/Pause, Fortschrittsbalken, Zeitanzeige
    - Spotify-Embed (`<iframe>`) für SPOTIFY-Quellen
    - YouTube-Embed (`<iframe>`) für YOUTUBE-Quellen
    - Quellen-Umschalter (Dropdown/Tabs) wenn mehrere Quellen vorhanden
    - `onTimeUpdate`-Callback für aktuelle Wiedergabeposition (nur MP3)
    - Seek-Funktion (`seekTo(ms)`) exponieren – nur für MP3 aktiv
    - _Anforderungen: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3_

  - [x] 7.2 Property-Test: Seek nur bei MP3
    - **Property 7: Seek nur bei MP3**
    - Datei `__tests__/audio/seek-mp3-only.property.test.ts`
    - Für jeden AudioTyp ungleich MP3: Seek-Funktion ist deaktiviert bzw. gibt `false` zurück
    - **Validiert: Anforderungen 4.3**

  - [x] 7.3 Unit-Tests für Audio-Player
    - Datei `__tests__/audio/audio-player.test.ts`
    - Testen: MP3-Rendering mit `<audio>`, Spotify/YouTube-Embed-Rendering, Quellen-Umschalter, Seek-Verhalten
    - _Anforderungen: 2.1, 2.2, 2.3, 4.1, 4.3_

- [x] 8. Audio-Quellen-Manager-Komponente implementieren
  - [x] 8.1 CRUD-UI für Audio-Quellen erstellen
    - Datei `src/components/songs/audio-quellen-manager.tsx` anlegen
    - Formular zum Hinzufügen: URL-Eingabe, Typ-Auswahl (MP3/Spotify/YouTube), Label-Eingabe
    - Liste bestehender Quellen mit Bearbeiten- und Löschen-Buttons
    - Inline-Bearbeitung von URL, Typ und Label
    - Lösch-Bestätigung vor dem Entfernen
    - `onQuellenChanged`-Callback nach jeder Mutation aufrufen
    - Fehlermeldungen bei Validierungsfehlern anzeigen
    - _Anforderungen: 1.1, 1.2, 1.3, 5.1, 5.2_

  - [x] 8.2 Unit-Tests für Audio-Quellen-Manager
    - Datei `__tests__/audio/audio-quellen-manager.test.ts`
    - Testen: Formular-Rendering, Hinzufügen, Bearbeiten, Löschen, Validierungsfehler, Ladezustände
    - _Anforderungen: 1.1, 1.2, 1.3, 5.1, 5.2_

- [x] 9. Timecode-Eingabe und Navigation implementieren
  - [x] 9.1 Timecode-Eingabe-Komponente erstellen
    - Datei `src/components/songs/timecode-eingabe.tsx` anlegen
    - Eingabefeld im Format `[mm:ss]` mit Validierung
    - Speichern als TIMECODE-Markup über bestehende Markup-API (`/api/markups`)
    - Upsert-Logik: erstellt neues Markup oder aktualisiert bestehendes
    - `onTimecodeChanged`-Callback bei Änderung
    - _Anforderungen: 3.1, 3.2, 3.3, 6.1, 6.2_

  - [x] 9.2 Property-Test: Timecode-Upsert erstellt oder aktualisiert Markup
    - **Property 11: Timecode-Upsert erstellt oder aktualisiert Markup**
    - Datei `__tests__/audio/timecode-upsert.property.test.ts`
    - Für jede Strophe und jeden gültigen Timecode: genau ein TIMECODE-Markup pro Strophe nach Upsert
    - **Validiert: Anforderungen 6.2**

- [x] 10. Integration in bestehende Song-Detailseite
  - [x] 10.1 Strophe-Editor um Timecode-Eingabe erweitern
    - `src/components/songs/strophe-editor.tsx` anpassen: `TimecodeEingabe`-Komponente pro Strophe integrieren
    - Bestehenden TIMECODE-Markup-Wert als `initialTimecodeMs` übergeben
    - _Anforderungen: 6.1, 6.2_

  - [x] 10.2 Strophe-Card um Timecode-Navigation erweitern
    - `src/components/songs/strophe-card.tsx` anpassen: Klick-Handler für Timecode-Navigation hinzufügen
    - Timecode als klickbares `[mm:ss]`-Badge anzeigen wenn vorhanden
    - Klick ruft `seekTo(timecodeMs)` im Audio-Player auf (nur bei aktiver MP3-Quelle)
    - _Anforderungen: 4.1, 4.2, 4.3_

  - [x] 10.3 Audio-Player und Quellen-Manager in Song-Detailseite einbinden
    - Song-Detailseite anpassen: `AudioPlayer` und `AudioQuellenManager` rendern
    - Audio-Quellen beim Laden der Song-Daten mit abrufen (Relation in Prisma-Query einschließen)
    - Kommunikation zwischen Player und Strophe-Cards für Seek-Navigation verdrahten
    - _Anforderungen: 2.1, 2.2, 2.3, 5.1_

- [x] 11. Abschluss-Checkpoint – Alle Tests bestehen
  - Sicherstellen, dass alle Tests bestehen, den Nutzer bei Fragen ansprechen.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften
- Unit-Tests validieren spezifische Beispiele und Edge-Cases
