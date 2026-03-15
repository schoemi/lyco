# Implementierungsplan: Song-Datenverwaltung

## Übersicht

Schrittweise Implementierung der Song-Datenverwaltung für die Songtext-Lern-Webanwendung "Lyco". Der Plan beginnt mit der Prisma-Schema-Erweiterung und TypeScript-Typen, baut darauf die Service-Schicht (Set, Song, Session, Fortschritt, Notizen, Markup) auf, erstellt die API-Routen und schließt mit den Frontend-Komponenten (Dashboard, Song-Detail, Song-Import) ab. Jeder Schritt baut auf dem vorherigen auf und endet mit einer funktionierenden Integration.

Tech-Stack: Next.js (App Router), TypeScript, Prisma ORM, PostgreSQL, NextAuth.js v5, Tailwind CSS, Vitest + fast-check (numRuns: 20).

Referenz: [Planungsdokument](../../.planning/key_features.md), [Anforderungen](requirements.md), [Design](design.md)

## Tasks

- [x] 1. Prisma-Schema erweitern und TypeScript-Typen erstellen
  - [x] 1.1 Prisma-Schema um neue Modelle und Enums erweitern
    - `prisma/schema.prisma` erweitern: Enums `Lernmethode`, `MarkupTyp`, `MarkupZiel` hinzufügen
    - Modelle `Set`, `SetSong`, `Song`, `Strophe`, `Zeile`, `Markup`, `Session`, `Fortschritt`, `Notiz` erstellen (siehe Design)
    - Many-to-Many zwischen Set und Song über `SetSong` mit `@@unique([setId, songId])`
    - Cascade-Delete auf allen Relationen konfigurieren (Song → Strophen → Zeilen → Markups, Song → Sessions, Strophe → Fortschritte/Notizen)
    - `User`-Modell um Relationen zu `Set`, `Song`, `Session`, `Fortschritt`, `Notiz` erweitern
    - `@@unique([userId, stropheId])` auf `Fortschritt` und `Notiz`
    - Migration ausführen (`npx prisma migrate dev`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13_

  - [x] 1.2 TypeScript-Typen für Song-Datenverwaltung erstellen
    - `types/song.ts` erstellen mit allen Eingabe- und Ausgabe-Typen aus dem Design
    - Eingabe-Typen: `CreateSetInput`, `CreateSongInput`, `UpdateSongInput`, `ImportSongInput`, `ImportStropheInput`, `ImportZeileInput`, `ImportMarkupInput`, `CreateMarkupInput`, `UpdateMarkupInput`
    - Ausgabe-Typen: `SetWithSongCount`, `SongWithProgress`, `SongDetail`, `StropheDetail`, `ZeileDetail`, `MarkupResponse`, `StropheProgress`, `DashboardData`, `DashboardSet`
    - _Requirements: 1.3, 1.4, 1.5, 1.11, 5.1, 10.1_

- [x] 2. Kern-Services implementieren (Set, Song)
  - [x] 2.1 SetService implementieren
    - `lib/services/set-service.ts` erstellen
    - `listSets(userId)`: Alle Sets des Benutzers mit Song-Anzahl und letzter Aktivität zurückgeben
    - `createSet(userId, name)`: Set erstellen mit Ownership, Pflichtfeld-Validierung (Name nicht leer)
    - `updateSet(userId, setId, name)`: Set umbenennen mit Ownership-Prüfung
    - `deleteSet(userId, setId)`: Set löschen mit Ownership-Prüfung, Songs bleiben erhalten
    - `addSongToSet(userId, setId, songId)`: Song zu Set hinzufügen mit Duplikat-Check (409)
    - `removeSongFromSet(userId, setId, songId)`: Song aus Set entfernen, Song bleibt bestehen
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 2.2 SongService implementieren
    - `lib/services/song-service.ts` erstellen
    - `listSongs(userId)`: Alle Songs des Benutzers mit Fortschritt und Session-Anzahl zurückgeben
    - `createSong(userId, data)`: Song erstellen mit Pflichtfeld-Validierung (Titel nicht leer)
    - `importSong(userId, data)`: Song mit Strophen, Zeilen und Markups in einer Transaktion anlegen; orderIndex automatisch aus Position vergeben; Validierung (mind. 1 Strophe, jede Strophe mind. 1 Zeile)
    - `getSongDetail(userId, songId)`: Song-Detail mit Strophen (sortiert nach orderIndex), Zeilen (sortiert nach orderIndex), Markups, Fortschritt je Strophe, Gesamtfortschritt und Session-Anzahl
    - `updateSong(userId, songId, data)`: Song-Metadaten aktualisieren mit Ownership-Prüfung
    - `deleteSong(userId, songId)`: Song löschen mit Cascade (Strophen, Zeilen, Markups, Sessions, Fortschritte, Notizen)
    - Song-Status-Ableitung: 0 → "neu", 1–99 → "aktiv", 100 → "gelernt"
    - _Requirements: 1.3, 1.4, 1.5, 1.9, 1.13, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.4, 5.5, 10.4_

- [x] 3. Property-Tests für Kern-Services
  - [x] 3.1 Property-Test: Song-Import Round-Trip
    - **Property 1: Song-Import Round-Trip**
    - Für jeden gültigen Import-Payload: Nach `importSong` muss `getSongDetail` alle Strophen in korrekter Reihenfolge, alle Zeilen mit Texten und Übersetzungen, und alle Markups zurückgeben
    - Test-Datei: `__tests__/songs/song-import.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.9**

  - [x] 3.2 Property-Test: Song-CRUD Round-Trip
    - **Property 2: Song-CRUD Round-Trip**
    - Für jede gültige Kombination aus Titel, Künstler, Sprache, Emotions_Tags: Erstellen und Abrufen liefert identische Metadaten; Aktualisieren ändert nur betroffene Felder
    - Test-Datei: `__tests__/songs/song-crud.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 3.1, 3.3, 3.7**

  - [x] 3.3 Property-Test: Song Cascade Delete
    - **Property 3: Song Cascade Delete**
    - Für jeden importierten Song mit Strophen, Zeilen, Markups, Sessions, Fortschritten und Notizen: Nach `deleteSong` existieren keine zugehörigen Datensätze mehr
    - Test-Datei: `__tests__/songs/song-cascade-delete.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 1.9, 1.13, 3.4**

  - [x] 3.4 Property-Test: Set-CRUD Round-Trip
    - **Property 4: Set-CRUD Round-Trip**
    - Für jeden gültigen Set-Namen: Erstellen und Abrufen liefert korrekten Namen; Umbenennen aktualisiert den Namen
    - Test-Datei: `__tests__/songs/set-crud.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 2.1, 2.3**

  - [x] 3.5 Property-Test: Set-Song-Zuordnung Round-Trip
    - **Property 5: Set-Song-Zuordnung Round-Trip**
    - Für jeden Song und jedes Set: Nach Hinzufügen erscheint Song im Set; nach Entfernen nicht mehr im Set, aber weiterhin als eigenständiger Song vorhanden
    - Test-Datei: `__tests__/songs/set-song-association.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 1.2, 2.7, 2.8**

  - [x] 3.6 Property-Test: Set löschen erhält Songs
    - **Property 6: Set löschen erhält Songs**
    - Für jedes Set mit zugeordneten Songs: Nach Löschen des Sets sind alle Songs weiterhin über `listSongs` abrufbar
    - Test-Datei: `__tests__/songs/set-delete-preserves-songs.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 2.4**

  - [x] 3.7 Property-Test: Ownership-Prüfung
    - **Property 7: Ownership-Prüfung**
    - Für jede Ressource und jeden Nicht-Eigentümer: Lesen, Bearbeiten und Löschen wird mit Fehler abgelehnt
    - Test-Datei: `__tests__/songs/ownership.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 2.5, 3.5, 5.4, 6.5, 8.4, 9.2, 9.3, 12.8**

  - [x] 3.8 Property-Test: Pflichtfeld-Validierung
    - **Property 8: Pflichtfeld-Validierung**
    - Für jeden leeren oder Whitespace-String als Set-Name oder Song-Titel: Erstellung wird abgelehnt, Datenbank bleibt unverändert
    - Test-Datei: `__tests__/songs/required-fields.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 2.6, 3.6**

- [x] 4. Checkpoint – Kern-Services validieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

- [x] 5. Zusätzliche Services implementieren (Session, Fortschritt, Notiz, Markup)
  - [x] 5.1 SessionService implementieren
    - `lib/services/session-service.ts` erstellen
    - `createSession(userId, songId, lernmethode)`: Session anlegen mit Ownership-Prüfung auf Song, Lernmethode als Enum validieren
    - `getSessionCount(userId, songId)`: Session-Anzahl für einen Song zurückgeben
    - `getTotalSessionCount(userId)`: Gesamtanzahl aller Sessions des Benutzers
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 5.2 ProgressService implementieren
    - `lib/services/progress-service.ts` erstellen
    - `updateProgress(userId, stropheId, prozent)`: Fortschritt aktualisieren mit Ownership-Prüfung, Wert auf [0, 100] begrenzen (Clamping)
    - `getSongProgress(userId, songId)`: Fortschritt je Strophe für einen Song
    - `getOverallSongProgress(userId, songId)`: Arithmetisches Mittel aller Strophen-Fortschritte (gerundet)
    - `getAverageProgress(userId)`: Arithmetisches Mittel aller Song-Fortschritte
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 5.3 NoteService implementieren
    - `lib/services/note-service.ts` erstellen
    - `upsertNote(userId, stropheId, text)`: Notiz erstellen oder aktualisieren (Upsert auf @@unique([userId, stropheId])), Ownership-Prüfung, leerer Text wird abgelehnt
    - `deleteNote(userId, noteId)`: Notiz löschen mit Ownership-Prüfung
    - `getNotesForSong(userId, songId)`: Alle Notizen für einen Song
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.4 MarkupService implementieren
    - `lib/services/markup-service.ts` erstellen
    - `createMarkup(userId, data)`: Markup erstellen mit Ziel-Referenz-Validierung (STROPHE → stropheId, ZEILE → zeileId, WORT → zeileId + wortIndex), Ownership-Prüfung über Song
    - `updateMarkup(userId, markupId, data)`: Markup bearbeiten mit Ownership-Prüfung
    - `deleteMarkup(userId, markupId)`: Markup löschen mit Ownership-Prüfung
    - `getMarkupsForSong(userId, songId)`: Alle Markups gruppiert nach Strophe und Zeile
    - Wort-Index-Validierung: wortIndex muss im Bereich [0, Anzahl Wörter - 1] der Zeile liegen
    - _Requirements: 1.11, 1.12, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.10_

- [x] 6. Property-Tests für zusätzliche Services
  - [x] 6.1 Property-Test: Song-Detail Vollständigkeit und Sortierung
    - **Property 9: Song-Detail Vollständigkeit und Sortierung**
    - Für jeden importierten Song: `getSongDetail` liefert Strophen sortiert nach orderIndex, Zeilen sortiert nach orderIndex, Gesamtfortschritt, Fortschritt je Strophe, Session-Anzahl und alle Markups
    - Test-Datei: `__tests__/songs/song-detail.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 5.1, 5.2, 5.3, 12.9**

  - [x] 6.2 Property-Test: Notiz Upsert Round-Trip
    - **Property 10: Notiz Upsert Round-Trip**
    - Für jeden Benutzer und jede Strophe: Erstellen und Abrufen liefert gleichen Text; erneuter Upsert aktualisiert (nicht dupliziert), maximal eine Notiz pro Benutzer und Strophe
    - Test-Datei: `__tests__/songs/note-upsert.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

  - [x] 6.3 Property-Test: Session Round-Trip
    - **Property 11: Session Round-Trip**
    - Für jede gültige Lernmethode und jeden eigenen Song: Nach N Sessions liefert `getSessionCount` den Wert N
    - Test-Datei: `__tests__/songs/session-tracking.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [x] 6.4 Property-Test: Fortschritt Round-Trip mit Begrenzung
    - **Property 12: Fortschritt Round-Trip mit Begrenzung**
    - Für jeden ganzzahligen Wert: Gespeicherter Fortschritt ist auf [0, 100] begrenzt (Clamping); Abrufen liefert den begrenzten Wert
    - Test-Datei: `__tests__/songs/progress-clamping.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 8.1, 8.3**

  - [x] 6.5 Property-Test: Fortschritts-Berechnung
    - **Property 13: Fortschritts-Berechnung**
    - Für jeden Song mit N Strophen und zufälligen Fortschrittswerten: `getOverallSongProgress` liefert arithmetisches Mittel (gerundet); `getAverageProgress` liefert Mittel aller Song-Fortschritte
    - Test-Datei: `__tests__/songs/progress-calculation.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 8.2, 8.5**

  - [x] 6.6 Property-Test: Markup Round-Trip
    - **Property 19: Markup Round-Trip**
    - Für jeden gültigen Markup_Typ und jedes Markup_Ziel: Erstellen und Abrufen liefert identische Daten; Aktualisieren ändert nur betroffene Felder; Löschen entfernt das Markup
    - Test-Datei: `__tests__/songs/markup-crud.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6**

  - [x] 6.7 Property-Test: Markup-Gruppierung
    - **Property 20: Markup-Gruppierung**
    - Für jeden Song mit Markups auf verschiedenen Ebenen: `getMarkupsForSong` liefert alle Markups gruppiert nach Strophe und Zeile
    - Test-Datei: `__tests__/songs/markup-grouping.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 12.7**

  - [x] 6.8 Property-Test: Markup-Validierung
    - **Property 21: Markup-Validierung**
    - Für jedes Markup: Ziel STROPHE erfordert stropheId, Ziel ZEILE erfordert zeileId, Ziel WORT erfordert zeileId + wortIndex im gültigen Bereich; ungültige Kombinationen werden abgelehnt
    - Test-Datei: `__tests__/songs/markup-validation.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 1.12, 12.10**

- [x] 7. Checkpoint – Alle Services validieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

- [x] 8. API-Routen implementieren
  - [x] 8.1 Set-API-Routen erstellen
    - `src/app/api/sets/route.ts` erstellen (GET: alle Sets, POST: Set erstellen)
    - `src/app/api/sets/[id]/route.ts` erstellen (PUT: umbenennen, DELETE: löschen)
    - `src/app/api/sets/[id]/songs/route.ts` erstellen (POST: Song hinzufügen)
    - `src/app/api/sets/[id]/songs/[songId]/route.ts` erstellen (DELETE: Song entfernen)
    - Session-Prüfung via `auth()`, Delegation an SetService, Fehlerbehandlung (400, 401, 403, 404, 409, 500)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 9.1, 9.4_

  - [x] 8.2 Song-API-Routen erstellen
    - `src/app/api/songs/route.ts` erstellen (GET: alle Songs, POST: Song erstellen)
    - `src/app/api/songs/import/route.ts` erstellen (POST: Song importieren)
    - `src/app/api/songs/[id]/route.ts` erstellen (GET: Song-Detail, PUT: aktualisieren, DELETE: löschen)
    - Session-Prüfung via `auth()`, Delegation an SongService, Fehlerbehandlung (400, 401, 403, 404, 500)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.6, 4.7, 4.8, 5.1, 5.2, 5.3, 5.4, 5.5, 9.1, 9.4_

  - [x] 8.3 Session-API-Route erstellen
    - `src/app/api/sessions/route.ts` erstellen (POST: Session anlegen, GET: Session-Anzahl mit `?songId=X`)
    - Session-Prüfung via `auth()`, Delegation an SessionService, Fehlerbehandlung
    - _Requirements: 7.1, 7.2, 7.3, 9.1, 9.4_

  - [x] 8.4 Progress-API-Route erstellen
    - `src/app/api/progress/route.ts` erstellen (PUT: Fortschritt aktualisieren, GET: Fortschritt abrufen mit `?songId=X`)
    - Session-Prüfung via `auth()`, Delegation an ProgressService, Fehlerbehandlung
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.4_

  - [x] 8.5 Notes-API-Routen erstellen
    - `src/app/api/notes/route.ts` erstellen (POST: Notiz erstellen/aktualisieren via Upsert)
    - `src/app/api/notes/[id]/route.ts` erstellen (DELETE: Notiz löschen)
    - Session-Prüfung via `auth()`, Delegation an NoteService, Fehlerbehandlung
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 9.1, 9.4_

  - [x] 8.6 Markup-API-Routen erstellen
    - `src/app/api/markups/route.ts` erstellen (POST: Markup erstellen)
    - `src/app/api/markups/[id]/route.ts` erstellen (PUT: aktualisieren, DELETE: löschen)
    - Session-Prüfung via `auth()`, Delegation an MarkupService, Fehlerbehandlung (400, 401, 403, 404, 500)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.8, 12.10, 9.1, 9.4_

  - [x] 8.7 Dashboard-API-Route erstellen
    - `src/app/api/dashboard/route.ts` erstellen (GET: Dashboard-Aggregation)
    - Sets mit Songs, Fortschritt je Song, Session-Anzahl je Song, Aggregatwerte (totalSongs, totalSessions, averageProgress)
    - Session-Prüfung via `auth()`, Delegation an SetService, SongService, ProgressService, SessionService
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 9.1_

- [x] 9. Property-Tests für API-Schicht
  - [x] 9.1 Property-Test: Authentifizierung erforderlich
    - **Property 14: Authentifizierung erforderlich**
    - Für jede Song-bezogene API-Route: Request ohne gültige Session wird mit HTTP 401 abgelehnt
    - Test-Datei: `__tests__/songs/auth-required.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 9.1**

  - [x] 9.2 Property-Test: Eingabevalidierung
    - **Property 15: Eingabevalidierung**
    - Für jeden ungültigen Eingabe-Payload (fehlende Pflichtfelder, falsche Typen, ungültige Enum-Werte): Antwort ist HTTP 400 mit beschreibender Fehlermeldung
    - Test-Datei: `__tests__/songs/input-validation.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 9.4**

  - [x] 9.3 Property-Test: Dashboard-Aggregation
    - **Property 16: Dashboard-Aggregation**
    - Für jeden Benutzer mit Sets, Songs, Sessions und Fortschritten: Dashboard liefert alle Sets mit Songs, Fortschritt und Session-Anzahl; Aggregatwerte sind konsistent mit Einzelwerten
    - Test-Datei: `__tests__/songs/dashboard.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 10.1, 10.2**

  - [x] 9.4 Property-Test: Song-Status-Ableitung
    - **Property 17: Song-Status-Ableitung**
    - Für jeden Fortschrittswert [0, 100]: Status ist deterministisch: 0 → "neu", 1–99 → "aktiv", 100 → "gelernt"
    - Test-Datei: `__tests__/songs/song-status.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 10.4**

- [x] 10. Checkpoint – API-Schicht validieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

- [x] 11. Frontend-Komponenten implementieren
  - [x] 11.1 MainLayout erstellen
    - `src/app/(main)/layout.tsx` erstellen: Layout für authentifizierte Hauptseiten
    - Navigation mit Links zu Dashboard und Song-Import
    - Logout-Button (NextAuth `signOut()`)
    - Responsive Layout (320px–1440px), einspaltiges Layout unter 768px
    - _Requirements: 11.1, 11.2_

  - [x] 11.2 Dashboard-Seite implementieren
    - `src/app/(main)/dashboard/page.tsx` erstellen
    - Daten von `/api/dashboard` laden
    - Aggregatwerte anzeigen (totalSongs, totalSessions, averageProgress)
    - Sets als aufklappbare Karten mit Song-Zeilen darstellen
    - Fortschrittsbalken und Status-Punkt je Song
    - _Requirements: 10.1, 10.2, 10.4, 11.1, 11.2_

  - [x] 11.3 SetCard-Komponente implementieren
    - `src/components/songs/set-card.tsx` erstellen
    - Auf-/zuklappbare Karte mit Set-Name und Song-Anzahl
    - Enthält SongRow-Komponenten für jeden Song im Set
    - _Requirements: 10.1, 11.1_

  - [x] 11.4 SongRow-Komponente implementieren
    - `src/components/songs/song-row.tsx` erstellen
    - Song-Zeile mit Titel, Künstler, Fortschrittsbalken und Status-Punkt
    - Link zur Song-Detailansicht
    - _Requirements: 10.1, 10.4, 11.3_

  - [x] 11.5 ProgressBar-Komponente implementieren
    - `src/components/songs/progress-bar.tsx` erstellen
    - Fortschrittsbalken (4px Höhe, grün), Wert 0–100
    - ARIA-Attribute (`role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`)
    - _Requirements: 10.1, 11.5_

  - [x] 11.6 Song-Detailseite implementieren
    - `src/app/(main)/songs/[id]/page.tsx` erstellen
    - Daten von `/api/songs/[id]` laden
    - Song-Metadaten (Titel, Künstler, Sprache, Emotions_Tags) anzeigen
    - Strophen als StropheCard-Komponenten darstellen
    - Gesamtfortschritt und Session-Anzahl anzeigen
    - Responsive Layout (320px–1440px), einspaltiges Layout unter 768px
    - Mindestgröße 44x44px für Touch-Elemente, Farbkontrast 4.5:1
    - _Requirements: 5.1, 5.2, 5.3, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 11.7 StropheCard-Komponente implementieren
    - `src/components/songs/strophe-card.tsx` erstellen
    - Strophen-Karte mit Name, Zeilen, Markups, Fortschritt und Notiz
    - Zeilen mit Originaltext und optionaler Übersetzung
    - Markups visuell darstellen (Typ-Icons oder Labels)
    - Notiz-Bereich mit Upsert-Funktionalität (POST `/api/notes`)
    - _Requirements: 5.1, 6.1, 6.2, 11.5, 12.9_

  - [x] 11.8 Song-Import-Seite implementieren
    - `src/app/(main)/songs/import/page.tsx` erstellen
    - Formular für Song-Import (Titel, Künstler, Sprache, Emotions_Tags, Strophen mit Zeilen und optionalen Markups)
    - Dynamisches Hinzufügen/Entfernen von Strophen und Zeilen
    - Validierung (Titel Pflicht, mind. 1 Strophe, jede Strophe mind. 1 Zeile)
    - POST an `/api/songs/import`, nach Erfolg Redirect zur Song-Detailseite
    - ARIA-Labels auf allen Formularfeldern und interaktiven Elementen
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 11.5, 11.6_

- [x] 12. Property-Test für UI-Komponenten
  - [x] 12.1 Property-Test: ARIA-Labels auf Song-Komponenten
    - **Property 18: ARIA-Labels auf Song-Komponenten**
    - Für jedes interaktive Element in der Song-Detail-Ansicht (Buttons, Formularfelder, Links): `aria-label` oder `aria-labelledby` vorhanden
    - Test-Datei: `__tests__/ui/song-accessibility.property.test.ts`
    - numRuns: 20
    - **Validates: Requirements 11.5**

- [x] 13. Abschluss-Checkpoint – Gesamtsystem validieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften (21 Properties aus dem Design)
- Unit Tests validieren spezifische Beispiele und Edge Cases
- Die Implementierungssprache ist TypeScript durchgängig
- Tech-Stack: Next.js (App Router), Prisma ORM, PostgreSQL, NextAuth.js v5, Tailwind CSS, Vitest + fast-check (numRuns: 20)
