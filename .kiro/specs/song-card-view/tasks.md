# Implementierungsplan: Song-Kartenansicht (Card View)

## Übersicht

Schrittweise Implementierung der Song-Kartenansicht: Prisma-Schema-Erweiterung (`coverUrl`), TypeScript-Typ-Anpassungen, Song-Service-Erweiterungen, Cover-Upload-API, Cover-Auslieferungs-Route, Genius-Import-Erweiterung, SongCard- und SongCardGrid-Komponenten sowie Dashboard-Integration. Jeder Schritt baut auf dem vorherigen auf.

## Tasks

- [x] 1. Datenmodell und Typen erweitern
  - [x] 1.1 Prisma-Schema um `coverUrl` erweitern
    - Optionales Feld `coverUrl String?` im `Song`-Modell in `prisma/schema.prisma` hinzufügen
    - Prisma-Migration ausführen (`npx prisma migrate dev --name add-cover-url`)
    - Prisma-Client neu generieren
    - _Anforderungen: 1.1_

  - [x] 1.2 TypeScript-Typen anpassen
    - `SongWithProgress` in `src/types/song.ts` um `coverUrl: string | null` erweitern
    - `SongDetail` in `src/types/song.ts` um `coverUrl: string | null` erweitern
    - `ImportSongInput` in `src/types/song.ts` um optionales `coverUrl?: string` erweitern
    - `GeniusImportRequest` in `src/types/genius.ts` um optionales `albumArt?: string` erweitern
    - _Anforderungen: 7.1, 3.1_

- [x] 2. Song-Service-Anpassungen
  - [x] 2.1 `listSongs()` um `coverUrl` erweitern
    - In `src/lib/services/song-service.ts` die Funktion `listSongs()` anpassen, sodass `coverUrl` im Rückgabeobjekt enthalten ist
    - _Anforderungen: 7.2_

  - [x] 2.2 `getSongDetail()` um `coverUrl` erweitern
    - In `src/lib/services/song-service.ts` die Funktion `getSongDetail()` anpassen, sodass `coverUrl` im Rückgabeobjekt enthalten ist
    - _Anforderungen: 7.3_

  - [x] 2.3 `importSong()` um `coverUrl` erweitern
    - In `src/lib/services/song-service.ts` die Funktion `importSong()` anpassen, sodass `data.coverUrl` beim `song.create` übergeben wird
    - _Anforderungen: 3.1_

- [x] 3. Checkpoint – Datenmodell und Service prüfen
  - Sicherstellen, dass alle Tests bestehen, den Nutzer bei Fragen ansprechen.

- [x] 4. Cover-Upload-API implementieren
  - [x] 4.1 Cover-Upload-Endpunkt erstellen
    - Datei `src/app/api/songs/[id]/cover/upload/route.ts` anlegen
    - `POST`-Handler: Auth-Check → Song-Ownership prüfen → Datei validieren (JPEG/PNG/WebP, max 5 MB) → Datei in `data/uploads/covers/{uuid}.{ext}` speichern → `coverUrl` am Song aktualisieren
    - HTTP 401 bei fehlender Authentifizierung
    - HTTP 404 bei unbekanntem Song
    - HTTP 403 bei fremdem Song
    - HTTP 400 mit Meldung "Nur JPEG, PNG und WebP Dateien sind erlaubt" bei ungültigem Format
    - HTTP 400 mit Meldung "Die Datei darf maximal 5 MB groß sein" bei Überschreitung
    - Response: `{ coverUrl: "/api/uploads/covers/{filename}" }`
    - _Anforderungen: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 4.2 Property-Test: Cover-Upload-Validierung
    - **Property 1: Nur gültige Bildformate werden akzeptiert**
    - Datei `__tests__/songs/cover-upload-validation.property.test.ts`
    - Für jede Datei mit ungültigem MIME-Type: HTTP 400 mit korrekter Fehlermeldung
    - Für jede Datei > 5 MB: HTTP 400 mit Größen-Fehlermeldung
    - **Validiert: Anforderungen 2.2, 2.3, 2.4, 2.5**

  - [x] 4.3 Unit-Tests für Cover-Upload-Endpunkt
    - Datei `__tests__/songs/cover-upload-api.test.ts`
    - Testen: Auth-Fehler, Song nicht gefunden, fremder Song, ungültiges Format, zu große Datei, erfolgreicher Upload
    - _Anforderungen: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 5. Cover-Auslieferungs-Route implementieren
  - [x] 5.1 Cover-Auslieferungs-Endpunkt erstellen
    - Datei `src/app/api/uploads/covers/[...path]/route.ts` anlegen
    - `GET`-Handler: Datei aus `data/uploads/covers/` lesen → mit korrektem `Content-Type` ausliefern
    - HTTP 404 bei nicht existierender Datei
    - _Anforderungen: 1.3_

- [x] 6. Genius-Import um Cover-URL erweitern
  - [x] 6.1 Genius-Import-Route anpassen
    - In `src/app/api/songs/genius/import/route.ts` das Feld `albumArt` aus dem Request-Body lesen
    - `albumArt` als `coverUrl` an `importSong()` übergeben
    - _Anforderungen: 3.1, 3.2_

  - [x] 6.2 Property-Test: Genius-Import speichert Cover-URL
    - **Property 2: Album-Art-URL wird als coverUrl persistiert**
    - Datei `__tests__/songs/genius-cover-import.property.test.ts`
    - Für jeden Import mit `albumArt`-URL: Song hat `coverUrl` gesetzt
    - Für jeden Import ohne `albumArt`: Song hat `coverUrl === null`
    - **Validiert: Anforderungen 3.1, 3.2**

- [x] 7. Checkpoint – API-Routen prüfen
  - Sicherstellen, dass alle Tests bestehen, den Nutzer bei Fragen ansprechen.

- [x] 8. SongCard-Komponente implementieren
  - [x] 8.1 SongCard-Komponente erstellen
    - Datei `src/components/songs/song-card.tsx` anlegen
    - Cover-Bild als Hintergrundbild der Karte (oder Gradient-Platzhalter bei fehlendem Cover)
    - Halbtransparentes Overlay für Textlesbarkeit
    - Song-Titel und Künstler im unteren Bereich
    - `StatusPunkt` oben rechts positionieren
    - `ProgressBar` am unteren Rand bündig ohne Abstand
    - Klick navigiert zu `/songs/{id}` (als `Link`-Wrapper)
    - `aria-label` mit Titel, Künstler und Fortschrittsstatus
    - _Anforderungen: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 1.2, 1.3_

  - [x] 8.2 Property-Test: SongCard aria-label enthält Pflichtinformationen
    - **Property 3: aria-label enthält Titel, Künstler und Fortschritt**
    - Datei `__tests__/songs/song-card-aria.property.test.ts`
    - Für jeden Song: `aria-label` enthält den Titel, den Künstler (falls vorhanden) und den Fortschrittsstatus
    - **Validiert: Anforderungen 4.7**

  - [x] 8.3 Property-Test: SongCard zeigt Platzhalter bei fehlendem Cover
    - **Property 4: Platzhalter-Hintergrund bei fehlendem Cover**
    - Datei `__tests__/songs/song-card-placeholder.property.test.ts`
    - Für jeden Song ohne `coverUrl`: Karte rendert einen Gradient-Platzhalter statt eines Bildes
    - Für jeden Song mit `coverUrl`: Karte rendert das Cover-Bild als Hintergrund
    - **Validiert: Anforderungen 1.2, 1.3**

  - [x] 8.4 Unit-Tests für SongCard-Komponente
    - Datei `__tests__/songs/song-card.test.ts`
    - Testen: Titel-Anzeige, Künstler-Anzeige, StatusPunkt-Position, ProgressBar-Anzeige, Navigation bei Klick, Cover-Bild vs. Platzhalter
    - _Anforderungen: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8_

- [x] 9. SongCardGrid-Komponente implementieren
  - [x] 9.1 SongCardGrid-Komponente erstellen
    - Datei `src/components/songs/song-card-grid.tsx` anlegen
    - Responsives CSS-Grid mit Tailwind: `grid-cols-1`, `sm:grid-cols-2`, `md:grid-cols-3`, `lg:grid-cols-4`
    - Gleichmäßiger `gap-4` zwischen Karten
    - Rendert `SongCard` für jeden Song
    - _Anforderungen: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 9.2 Property-Test: Grid-Spaltenanzahl je Breakpoint
    - **Property 5: Responsive Grid-Spalten**
    - Datei `__tests__/songs/song-card-grid-responsive.property.test.ts`
    - Grid-Container hat die korrekten Tailwind-Klassen für 1/2/3/4 Spalten
    - **Validiert: Anforderungen 5.1, 5.2, 5.3, 5.4**

- [x] 10. Dashboard-Integration
  - [x] 10.1 Dashboard-Seite auf Kartenansicht umstellen
    - In `src/app/(main)/dashboard/page.tsx` den Bereich "Alle Songs" von `SongRow`-Liste auf `SongCardGrid` umstellen
    - `SongCardGrid` importieren und anstelle der bisherigen `SongRow`-Schleife verwenden
    - Bestehenden Platzhalter-Bereich bei leerer Song-Liste beibehalten
    - _Anforderungen: 6.1, 6.2, 6.3_

- [x] 11. Abschluss-Checkpoint – Alle Tests bestehen
  - Sicherstellen, dass alle Tests bestehen, den Nutzer bei Fragen ansprechen.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften
- Unit-Tests validieren spezifische Beispiele und Edge-Cases
