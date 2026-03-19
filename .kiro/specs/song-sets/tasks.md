# Implementierungsplan: Song-Sets

## Übersicht

Schrittweise Erweiterung der bestehenden Set-Verwaltung um: Prisma-Schema-Erweiterung (`description`, `orderIndex`), erweiterte Service-Funktionen, neue API-Endpunkte (Set-Detail, Reorder), neue Typen, Set-Detailseite mit Song-Liste und Drag-and-Drop, Dialoge (Erstellen/Bearbeiten, Löschen, Songs hinzufügen) und Dashboard-Integration mit „+ Neues Set"-Button. Jeder Schritt baut auf dem vorherigen auf.

## Tasks

- [ ] 1. Prisma-Schema erweitern und Datenbank migrieren
  - [x] 1.1 `Set`-Modell um `description`-Feld erweitern
    - `description String? @db.VarChar(500)` in `prisma/schema.prisma` hinzufügen
    - `name`-Feld auf `@db.VarChar(100)` einschränken
    - _Anforderungen: 1.3, 8.1_
  - [x] 1.2 `SetSong`-Modell um `orderIndex`-Feld erweitern
    - `orderIndex Int @default(0)` in `prisma/schema.prisma` hinzufügen
    - _Anforderungen: 6.1_
  - [x] 1.3 Prisma-Migration erzeugen und anwenden
    - `npx prisma migrate dev --name add-set-description-and-order-index`
    - Prisma-Client neu generieren
    - _Anforderungen: 1.3, 6.1, 8.1_

- [ ] 2. Typen erweitern (`src/types/song.ts`)
  - [x] 2.1 Neue und erweiterte Interfaces definieren
    - `CreateSetInput` um `description?: string` erweitern
    - `UpdateSetInput` Interface hinzufügen mit `name: string` und `description?: string`
    - `ReorderSetSongItem` Interface hinzufügen mit `songId: string` und `orderIndex: number`
    - `SetDetail` Interface hinzufügen (id, name, description, songCount, songs)
    - `SetSongWithProgress` Interface hinzufügen (id, titel, kuenstler, sprache, coverUrl, progress, sessionCount, status, orderIndex)
    - `SetWithSongCount` um `description: string | null` erweitern
    - _Anforderungen: 1.1, 2.1, 6.1, 7.1, 7.2, 8.1, 8.2, 9.2_

- [ ] 3. Service-Layer erweitern (`src/lib/services/set-service.ts`)
  - [x] 3.1 `createSet` um `description`-Parameter erweitern
    - Validierung: Name max. 100 Zeichen, Beschreibung max. 500 Zeichen
    - Name trimmen, leere/whitespace-only Namen ablehnen
    - _Anforderungen: 1.1, 1.2, 1.3, 8.1, 8.2_
  - [x] 3.2 `updateSet` um `description`-Parameter erweitern
    - Gleiche Validierung wie bei `createSet`
    - _Anforderungen: 2.1, 2.2, 2.3_
  - [x] 3.3 `listSets` erweitern: `description` im Rückgabewert aufnehmen
    - _Anforderungen: 9.1, 9.2_
  - [x] 3.4 `getSetDetail`-Funktion implementieren
    - Set mit allen Songs laden, inkl. Fortschritt, Session-Anzahl und Status pro Song
    - Songs nach `orderIndex` aufsteigend sortieren
    - Eigentümerprüfung durchführen
    - _Anforderungen: 7.1, 7.2, 10.1_
  - [x] 3.5 `addSongToSet` erweitern: `orderIndex` auf höchsten bestehenden + 1 setzen
    - _Anforderungen: 6.4_
  - [x] 3.6 `reorderSetSongs`-Funktion implementieren
    - Nimmt Array von `{ songId, orderIndex }` entgegen
    - Eigentümerprüfung durchführen
    - Alle orderIndex-Werte in einer Transaktion aktualisieren
    - _Anforderungen: 6.2, 6.3_
  - [x] 3.7 Property-Test: Set-Erstellung Round-Trip
    - **Property 1: Set-Erstellung Round-Trip**
    - **Validiert: Anforderungen 1.1, 8.2**
  - [x] 3.8 Property-Test: Set-Aktualisierung Round-Trip
    - **Property 2: Set-Aktualisierung Round-Trip**
    - **Validiert: Anforderungen 2.1**
  - [x] 3.9 Property-Test: Leere Namen werden abgelehnt
    - **Property 3: Leere Namen werden abgelehnt**
    - **Validiert: Anforderungen 1.2**
  - [x] 3.10 Property-Test: Feldlängen-Validierung
    - **Property 4: Feldlängen-Validierung**
    - **Validiert: Anforderungen 1.3, 8.1**

- [x] 4. Checkpoint – Schema, Typen und Service verifizieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

- [ ] 5. API-Routen erweitern und neu erstellen
  - [x] 5.1 `POST /api/sets` erweitern: `description` aus Request-Body akzeptieren
    - Feldlängen-Validierung (Name max. 100, Beschreibung max. 500)
    - _Anforderungen: 1.1, 1.3, 8.2_
  - [x] 5.2 `PUT /api/sets/[id]` erweitern: `description` aus Request-Body akzeptieren
    - Feldlängen-Validierung
    - _Anforderungen: 2.1, 2.2, 2.3_
  - [x] 5.3 `GET /api/sets/[id]` implementieren: Set-Detail mit Songs und Fortschritt
    - Authentifizierung und Eigentümerprüfung
    - Fehlerbehandlung: 401, 403, 404
    - _Anforderungen: 7.1, 7.2, 10.1, 10.2, 10.3_
  - [x] 5.4 `PUT /api/sets/[id]/songs/reorder` implementieren
    - Request-Body: `{ items: Array<{ songId, orderIndex }> }`
    - Authentifizierung und Eigentümerprüfung
    - _Anforderungen: 6.2, 6.3_
  - [x] 5.5 Property-Test: Eigentümerprüfung bei Schreiboperationen
    - **Property 5: Eigentümerprüfung bei Schreiboperationen**
    - **Validiert: Anforderungen 2.2, 3.3, 5.2, 10.3**
  - [x] 5.6 Property-Test: Nicht-authentifizierter Zugriff wird abgelehnt
    - **Property 15: Nicht-authentifizierter Zugriff wird abgelehnt**
    - **Validiert: Anforderungen 10.2**
  - [x] 5.7 Property-Test: Nutzer-Isolation
    - **Property 14: Nutzer-Isolation**
    - **Validiert: Anforderungen 10.1**

- [x] 6. Checkpoint – API-Routen verifizieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

- [ ] 7. Song-Zuordnung: Hinzufügen, Entfernen und Reihenfolge
  - [x] 7.1 `DELETE /api/sets/[id]/songs/[songId]` Route erstellen (falls noch nicht vorhanden)
    - Authentifizierung und Eigentümerprüfung
    - _Anforderungen: 5.1, 5.2_
  - [x] 7.2 Property-Test: Löschen bewahrt Songs
    - **Property 6: Löschen bewahrt Songs**
    - **Validiert: Anforderungen 3.1**
  - [x] 7.3 Property-Test: Song hinzufügen und entfernen Round-Trip
    - **Property 7: Song hinzufügen und entfernen Round-Trip**
    - **Validiert: Anforderungen 4.1, 5.1**
  - [x] 7.4 Property-Test: Doppelte Song-Zuordnung wird abgelehnt
    - **Property 8: Doppelte Song-Zuordnung wird abgelehnt**
    - **Validiert: Anforderungen 4.2**
  - [x] 7.5 Property-Test: Song in mehreren Sets
    - **Property 9: Song in mehreren Sets**
    - **Validiert: Anforderungen 4.3**
  - [x] 7.6 Property-Test: Neuer Song erhält höchsten orderIndex + 1
    - **Property 10: Neuer Song erhält höchsten orderIndex + 1**
    - **Validiert: Anforderungen 6.4**
  - [x] 7.7 Property-Test: Reihenfolge-Änderung Round-Trip
    - **Property 11: Reihenfolge-Änderung Round-Trip**
    - **Validiert: Anforderungen 6.2, 6.3**

- [x] 8. Checkpoint – Song-Zuordnung und Reihenfolge verifizieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

- [ ] 9. UI: SetEditDialog erstellen (`src/components/songs/set-edit-dialog.tsx`)
  - [x] 9.1 Modal-Dialog für Erstellen und Bearbeiten von Sets implementieren
    - Felder: Name (required, max 100 Zeichen), Beschreibung (optional, max 500 Zeichen)
    - Frontend-Validierung mit Fehlermeldungen
    - Wiederverwendbar für POST (Erstellen) und PUT (Bearbeiten)
    - Fokus-Management und Escape-Taste zum Schließen
    - _Anforderungen: 1.1, 1.2, 1.3, 2.1, 8.1, 8.2_

- [ ] 10. UI: SetDeleteDialog erstellen (`src/components/songs/set-delete-dialog.tsx`)
  - [x] 10.1 Bestätigungsdialog analog zu bestehendem `SongDeleteDialog` implementieren
    - Warnung: „Alle Song-Zuordnungen werden entfernt, die Songs bleiben erhalten"
    - Fokus-Management und Escape-Taste
    - _Anforderungen: 3.1, 3.2_

- [ ] 11. UI: Set-Detailseite erstellen (`src/app/(main)/sets/[id]/page.tsx`)
  - [x] 11.1 Set-Detailseite als Client Component implementieren
    - Set-Daten via `GET /api/sets/[id]` laden
    - Set-Name, Beschreibung, Song-Anzahl anzeigen
    - Aktionen: Bearbeiten (öffnet SetEditDialog), Löschen (öffnet SetDeleteDialog)
    - Zurück-Link zum Dashboard
    - _Anforderungen: 7.1, 7.3, 7.4, 8.3_
  - [x] 11.2 `SetSongList`-Komponente erstellen (`src/components/songs/set-song-list.tsx`)
    - Sortierbare Song-Liste mit Drag-and-Drop (HTML Drag and Drop API)
    - Pro Song: Titel, Künstler, Fortschrittsbalken, Session-Anzahl, StatusPunkt
    - Entfernen-Button pro Song (ruft `DELETE /api/sets/[id]/songs/[songId]`)
    - Klick auf Song navigiert zur Song-Detailseite
    - Reihenfolge-Änderung persistiert via `PUT /api/sets/[id]/songs/reorder`
    - _Anforderungen: 5.1, 5.3, 6.2, 6.3, 7.2, 7.4_
  - [x] 11.3 `AddSongToSetDialog` erstellen (`src/components/songs/add-song-to-set-dialog.tsx`)
    - Modal-Dialog zur Auswahl von Songs, die noch nicht im Set sind
    - Mehrfachauswahl möglich
    - Songs via `POST /api/sets/[id]/songs` hinzufügen
    - Song-Liste nach Hinzufügen aktualisieren
    - _Anforderungen: 4.1, 4.2, 4.3, 4.4_
  - [x] 11.4 Property-Test: Set-Detail enthält vollständige Daten
    - **Property 12: Set-Detail enthält vollständige Daten**
    - **Validiert: Anforderungen 7.1, 7.2, 9.2**

- [ ] 12. UI: Dashboard-Integration und SetCard erweitern
  - [x] 12.1 `SetCard` zu einem Link zur Set-Detailansicht (`/sets/[id]`) umbauen
    - Letzte Aktivität anzeigen
    - _Anforderungen: 9.2, 9.3_
  - [x] 12.2 „+ Neues Set"-Button im Dashboard hinzufügen
    - Neben der Sets-Überschrift platzieren
    - Öffnet den SetEditDialog im Erstellen-Modus
    - Sets-Bereich immer anzeigen (auch wenn leer)
    - _Anforderungen: 1.4, 9.4_
  - [x] 12.3 Property-Test: Dashboard-Sets nach Aktualisierungsdatum sortiert
    - **Property 13: Dashboard-Sets nach Aktualisierungsdatum sortiert**
    - **Validiert: Anforderungen 9.1**

- [ ] 13. Integration und Verdrahtung
  - [x] 13.1 Alle Komponenten auf der Set-Detailseite verdrahten
    - SetEditDialog, SetDeleteDialog, AddSongToSetDialog, SetSongList integrieren
    - Nach Löschen eines Sets zum Dashboard navigieren
    - Nach Bearbeiten die Detailansicht aktualisieren
    - _Anforderungen: 7.3, 3.1, 3.2, 2.1_
  - [x] 13.2 Dashboard-Seite aktualisieren
    - `SetCard` durch neue verlinkte Version ersetzen
    - „+ Neues Set"-Button einbinden
    - Set-Liste nach Erstellung aktualisieren
    - _Anforderungen: 1.4, 9.3, 9.4_

- [x] 14. Abschluss-Checkpoint – Alle Tests bestehen
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints sichern inkrementelle Validierung
- Property-Tests validieren universelle Korrektheitseigenschaften (fast-check + Vitest)
- Unit-Tests validieren spezifische Beispiele und Grenzfälle
- Testdateien unter `__tests__/sets/` gemäß Design-Dokument
