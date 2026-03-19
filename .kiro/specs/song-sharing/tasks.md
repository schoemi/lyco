# Implementierungsplan: Song-Sharing

## Übersicht

Schrittweise Implementierung des Song-Sharing-Features: Prisma-Schema-Erweiterung, Freigabe-Service, API-Routen, Dashboard-Erweiterung, UI-Komponenten und optionaler E-Mail-Service. Jeder Schritt baut auf dem vorherigen auf und endet mit der vollständigen Integration aller Teile.

## Tasks

- [x] 1. Prisma-Schema erweitern und Datenbank migrieren
  - [x] 1.1 Neue Modelle `SongFreigabe` und `SetFreigabe` in `prisma/schema.prisma` anlegen
    - `SongFreigabe`: Felder `id`, `songId`, `eigentuemerId`, `empfaengerId`, `createdAt`
    - Unique-Constraint auf `[songId, empfaengerId]`, Tabelle `song_freigaben` via `@@map`
    - `SetFreigabe`: Felder `id`, `setId`, `eigentuemerId`, `empfaengerId`, `createdAt`
    - Unique-Constraint auf `[setId, empfaengerId]`, Tabelle `set_freigaben` via `@@map`
    - Foreign Keys mit `onDelete: Cascade` zu Song, Set und User
    - _Anforderungen: 1.1, 2.1, 10.1, 10.2_
  - [x] 1.2 Bestehende Modelle `User`, `Song` und `Set` um Freigabe-Relationen erweitern
    - `User`: Relationen `songFreigabenAlsEigentuemer`, `songFreigabenAlsEmpfaenger`, `setFreigabenAlsEigentuemer`, `setFreigabenAlsEmpfaenger`
    - `Song`: Relation `freigaben SongFreigabe[]`
    - `Set`: Relation `freigaben SetFreigabe[]`
    - _Anforderungen: 1.1, 2.1_
  - [x] 1.3 Prisma-Migration erzeugen und anwenden
    - `npx prisma migrate dev --name add-song-sharing`
    - _Anforderungen: 1.1, 2.1_

- [x] 2. TypeScript-Typen definieren (`src/types/song.ts`)
  - [x] 2.1 Neue Freigabe-Typen in `src/types/song.ts` hinzufügen
    - `CreateSongFreigabeInput`, `CreateSetFreigabeInput`
    - `FreigabeEmpfaenger`, `EmpfangenesSet`, `EmpfangenerSong`, `GeteilteInhalte`
    - `DashboardData` um `geteilteInhalte: GeteilteInhalte` erweitern
    - `SongDetail` um optionale Felder `istFreigabe?: boolean`, `eigentuemerName?: string` erweitern
    - _Anforderungen: 4.1, 4.3, 4.4, 5.1, 5.4_

- [x] 3. Freigabe-Service implementieren (`src/lib/services/freigabe-service.ts`)
  - [x] 3.1 Song-Freigabe-Funktionen: `createSongFreigabe`, `revokeSongFreigabe`, `listSongFreigaben`
    - `createSongFreigabe`: Eigentümerprüfung, Empfänger-Lookup per E-Mail, Selbst-Freigabe-Prüfung, Duplikat-Prüfung
    - `revokeSongFreigabe`: Eigentümerprüfung, Freigabe löschen
    - `listSongFreigaben`: Eigentümerprüfung, alle Empfänger mit Name/E-Mail zurückgeben
    - _Anforderungen: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.3, 3.4, 7.1, 7.3_
  - [x] 3.2 Set-Freigabe-Funktionen: `createSetFreigabe`, `revokeSetFreigabe`, `listSetFreigaben`
    - Analog zu Song-Freigabe, aber für Sets
    - _Anforderungen: 2.1, 2.3, 2.4, 2.5, 3.2, 3.3, 7.2, 7.3_
  - [x] 3.3 Zugriffsprüfungs-Funktionen: `hatSongZugriff`, `hatSetZugriff`
    - `hatSongZugriff`: Prüft Eigentümerschaft ODER direkte SongFreigabe ODER SetFreigabe (Song in geteiltem Set)
    - `hatSetZugriff`: Prüft Eigentümerschaft ODER direkte SetFreigabe
    - _Anforderungen: 2.2, 5.3, 9.3, 9.4, 9.5_
  - [x] 3.4 Empfangene Freigaben: `getEmpfangeneFreigaben`
    - Gibt alle empfangenen Song- und Set-Freigaben mit Eigentümer-Name und Song-Fortschritt zurück
    - _Anforderungen: 4.1, 4.3, 4.4, 6.5_
  - [x] 3.5 Property-Test: Freigabe-Erstellung Round-Trip
    - **Property 1: Freigabe-Erstellung Round-Trip**
    - **Validiert: Anforderungen 1.1, 2.1**
  - [x] 3.6 Property-Test: Keine doppelten Freigaben
    - **Property 2: Keine doppelten Freigaben**
    - **Validiert: Anforderungen 1.2, 2.3**
  - [x] 3.7 Property-Test: Selbst-Freigabe wird abgelehnt
    - **Property 3: Selbst-Freigabe wird abgelehnt**
    - **Validiert: Anforderungen 1.3, 2.4**

- [x] 4. Checkpoint – Freigabe-Service verifizieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

- [x] 5. Zugriffskontrolle und Schreibschutz
  - [x] 5.1 `song-service.ts` erweitern: `getSongDetail` für Empfänger mit Freigabe öffnen
    - Wenn Nutzer nicht Eigentümer: Prüfung über `hatSongZugriff` aus freigabe-service
    - Bei Zugriff: Song-Detail mit `istFreigabe: true` und `eigentuemerName` zurückgeben
    - Ohne Zugriff: weiterhin „Zugriff verweigert"
    - _Anforderungen: 5.1, 5.4, 9.3, 9.4_
  - [x] 5.2 Schreibschutz in bestehenden Song-API-Routen sicherstellen
    - `updateSong`, `deleteSong`, Strophen-/Zeilen-CRUD, Audio-Quellen-CRUD: Eigentümerprüfung bleibt bestehen, Empfänger erhalten 403
    - _Anforderungen: 5.2, 5.3_
  - [x] 5.3 Property-Test: Nur der Eigentümer kann Freigaben verwalten
    - **Property 4: Nur der Eigentümer kann Freigaben verwalten**
    - **Validiert: Anforderungen 1.5, 2.5, 3.3, 9.2**
  - [x] 5.4 Property-Test: Schreiboperationen auf geteilte Songs werden abgelehnt
    - **Property 12: Schreiboperationen auf geteilte Songs werden abgelehnt**
    - **Validiert: Anforderungen 5.3**
  - [x] 5.5 Property-Test: Zugriff ohne Freigabe oder Eigentümerschaft wird abgelehnt
    - **Property 17: Zugriff ohne Freigabe oder Eigentümerschaft wird abgelehnt**
    - **Validiert: Anforderungen 9.3, 9.4**

- [x] 6. Set-Freigabe-Vererbung und dynamischer Zugriff
  - [x] 6.1 Dynamische Set-Vererbung in `hatSongZugriff` implementieren
    - Prüfung: Song gehört zu einem Set, für das eine aktive SetFreigabe besteht
    - Kein separates SongFreigabe-Record pro Song im Set nötig
    - _Anforderungen: 2.1, 2.2, 9.5_
  - [x] 6.2 Property-Test: Set-Freigabe gewährt Zugriff auf alle Songs im Set
    - **Property 5: Set-Freigabe gewährt Zugriff auf alle Songs im Set**
    - **Validiert: Anforderungen 2.1**
  - [x] 6.3 Property-Test: Neuer Song in geteiltem Set erbt Zugriff
    - **Property 6: Neuer Song in geteiltem Set erbt Zugriff**
    - **Validiert: Anforderungen 2.2**
  - [x] 6.4 Property-Test: Entfernen eines Songs aus geteiltem Set entzieht Zugriff
    - **Property 18: Entfernen eines Songs aus geteiltem Set entzieht Zugriff**
    - **Validiert: Anforderungen 9.5**

- [x] 7. Freigabe-Widerruf und Lerndaten-Bewahrung
  - [x] 7.1 Widerruf-Logik in freigabe-service verifizieren
    - Song-Freigabe widerrufen: Zugriff entzogen, Lerndaten bleiben erhalten
    - Set-Freigabe widerrufen: Zugriff auf Set und alle Songs entzogen (sofern keine separate Song-Freigabe)
    - _Anforderungen: 3.1, 3.2, 3.4_
  - [x] 7.2 Property-Test: Widerruf einer Song-Freigabe entzieht Zugriff
    - **Property 7: Widerruf einer Song-Freigabe entzieht Zugriff**
    - **Validiert: Anforderungen 3.1**
  - [x] 7.3 Property-Test: Widerruf einer Set-Freigabe entzieht Zugriff auf Set und Songs
    - **Property 8: Widerruf einer Set-Freigabe entzieht Zugriff auf Set und Songs**
    - **Validiert: Anforderungen 3.2**
  - [x] 7.4 Property-Test: Widerruf bewahrt Lerndaten
    - **Property 9: Widerruf bewahrt Lerndaten**
    - **Validiert: Anforderungen 3.4**

- [x] 8. Checkpoint – Zugriffskontrolle und Widerruf verifizieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

- [x] 9. API-Routen für Freigaben implementieren
  - [x] 9.1 Song-Freigabe-Routen erstellen
    - `POST /api/freigaben/songs` – Song-Freigabe erstellen (Request: `{ songId, empfaengerEmail }`, Response: 201)
    - `DELETE /api/freigaben/songs/[id]` – Song-Freigabe widerrufen (Response: 204)
    - `GET /api/freigaben/songs/[songId]` – Freigaben eines Songs auflisten (Response: 200)
    - Authentifizierung via `auth()`, Fehlerbehandlung gemäß Design (400, 401, 403, 404, 409)
    - _Anforderungen: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 7.1, 7.3, 9.1_
  - [x] 9.2 Set-Freigabe-Routen erstellen
    - `POST /api/freigaben/sets` – Set-Freigabe erstellen
    - `DELETE /api/freigaben/sets/[id]` – Set-Freigabe widerrufen
    - `GET /api/freigaben/sets/[setId]` – Freigaben eines Sets auflisten
    - _Anforderungen: 2.1, 2.3, 2.4, 2.5, 3.2, 7.2, 7.3, 9.1_
  - [x] 9.3 Empfangene-Freigaben-Route erstellen
    - `GET /api/freigaben/empfangen` – Alle empfangenen Freigaben auflisten
    - Gibt Sets mit Songs und einzeln geteilte Songs zurück, jeweils mit Eigentümer-Name und eigenem Fortschritt
    - _Anforderungen: 4.1, 4.2, 4.3, 4.4_
  - [x] 9.4 Song-Detail-API erweitern (`GET /api/songs/[id]`)
    - Zugriff auch für Empfänger mit aktiver Freigabe (Lesemodus)
    - Zusätzliche Felder `istFreigabe` und `eigentuemerName` in Response
    - _Anforderungen: 5.1, 5.4, 9.3, 9.4_
  - [x] 9.5 Dashboard-API erweitern (`GET /api/dashboard`)
    - Neue Sektion `geteilteInhalte` mit empfangenen Sets und Songs
    - Fortschritt des Empfängers (nicht des Eigentümers) anzeigen
    - _Anforderungen: 4.1, 4.3, 4.4, 6.5_

- [x] 10. Checkpoint – API-Routen verifizieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

- [x] 11. Lerndaten-Isolation und unabhängige Daten
  - [x] 11.1 Sicherstellen, dass Empfänger eigene Lerndaten erstellen können
    - Sessions, Fortschritt, Notizen, Interpretationen sind bereits über `userId` nutzerspezifisch
    - Verifizieren, dass bestehende Endpunkte (Session erstellen, Fortschritt aktualisieren, Notiz erstellen) für geteilte Songs funktionieren
    - _Anforderungen: 6.1, 6.2_
  - [x] 11.2 Property-Test: Empfänger erstellen unabhängige Lerndaten
    - **Property 13: Empfänger erstellen unabhängige Lerndaten**
    - **Validiert: Anforderungen 6.1, 6.2**
  - [x] 11.3 Property-Test: Lerndaten-Isolation zwischen Eigentümer und Empfänger
    - **Property 14: Lerndaten-Isolation zwischen Eigentümer und Empfänger**
    - **Validiert: Anforderungen 6.3, 6.4**

- [x] 12. Geteilte-Inhalte-Anzeige und Freigabe-Übersicht
  - [x] 12.1 Property-Test: Geteilte Inhalte im Dashboard enthalten vollständige Daten
    - **Property 10: Geteilte Inhalte im Dashboard enthalten vollständige Daten**
    - **Validiert: Anforderungen 4.1, 4.3, 4.4, 6.5**
  - [x] 12.2 Property-Test: Geteilter Song-Detail enthält vollständigen Inhalt und Eigentümer-Name
    - **Property 11: Geteilter Song-Detail enthält vollständigen Inhalt und Eigentümer-Name**
    - **Validiert: Anforderungen 5.1, 5.4**
  - [x] 12.3 Property-Test: Freigabe-Übersicht listet alle Empfänger mit Details
    - **Property 15: Freigabe-Übersicht listet alle Empfänger mit Details**
    - **Validiert: Anforderungen 7.1, 7.2, 7.3**

- [x] 13. Optionaler E-Mail-Service (`src/lib/services/email-service.ts`)
  - [x] 13.1 E-Mail-Service implementieren
    - Prüft ob SMTP-Umgebungsvariablen gesetzt sind, überspringt Versand falls nicht
    - Sendet Benachrichtigung an Empfänger mit Eigentümer-Name und Song-/Set-Titel
    - Fehler beim Versand werden geloggt, blockieren aber nicht die Freigabe
    - _Anforderungen: 8.1, 8.2, 8.3_
  - [x] 13.2 E-Mail-Service in `createSongFreigabe` und `createSetFreigabe` integrieren
    - Nach erfolgreicher Freigabe-Erstellung E-Mail-Versand auslösen
    - _Anforderungen: 8.1_
  - [x] 13.3 Property-Test: E-Mail-Benachrichtigung bei Freigabe-Erstellung
    - **Property 16: E-Mail-Benachrichtigung bei Freigabe-Erstellung**
    - **Validiert: Anforderungen 8.1**

- [x] 14. Kaskadierendes Löschen
  - [x] 14.1 Kaskadierendes Löschen über Prisma-Schema verifizieren
    - `onDelete: Cascade` auf SongFreigabe → Song und SetFreigabe → Set sicherstellen
    - Testen: Song löschen entfernt alle SongFreigaben, Set löschen entfernt alle SetFreigaben
    - Song aus Set entfernen: Set-Freigabe bleibt bestehen, Zugriff auf entfernten Song endet
    - _Anforderungen: 10.1, 10.2, 10.3_
  - [x] 14.2 Property-Test: Kaskadierendes Löschen entfernt alle Freigaben
    - **Property 19: Kaskadierendes Löschen entfernt alle Freigaben**
    - **Validiert: Anforderungen 10.1, 10.2**
  - [x] 14.3 Property-Test: Löschen eines Songs aus geteiltem Set bewahrt Set-Freigabe
    - **Property 20: Löschen eines Songs aus geteiltem Set bewahrt Set-Freigabe**
    - **Validiert: Anforderungen 10.3**

- [x] 15. Checkpoint – Service-Layer und Kaskaden verifizieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

- [x] 16. UI-Komponenten: Freigabe-Dialog und Übersicht
  - [x] 16.1 `FreigabeDialog` erstellen (`src/components/sharing/freigabe-dialog.tsx`)
    - Modal-Dialog mit E-Mail-Eingabefeld für Empfänger
    - Validierung: E-Mail-Format, Erfolgs-/Fehlermeldung nach Absenden
    - Unterstützt Song- und Set-Freigabe (über Props konfigurierbar)
    - _Anforderungen: 1.1, 2.1_
  - [x] 16.2 `FreigabeUebersicht` erstellen (`src/components/sharing/freigabe-uebersicht.tsx`)
    - Liste aller Empfänger mit Name und E-Mail
    - Widerrufen-Button pro Empfänger mit Bestätigungsdialog
    - Nur für Eigentümer sichtbar
    - _Anforderungen: 7.1, 7.2, 7.3, 7.4_
  - [x] 16.3 `GeteilteInhalteSektion` erstellen (`src/components/sharing/geteilte-inhalte-sektion.tsx`)
    - Dashboard-Sektion „Mit mir geteilt"
    - Zeigt geteilte Sets (aufklappbar mit Songs) und einzeln geteilte Songs
    - Eigentümer-Name pro Eintrag, eigener Fortschritt des Empfängers
    - Nur sichtbar wenn mindestens eine aktive Freigabe vorhanden
    - _Anforderungen: 4.1, 4.2, 4.3, 4.4, 4.5, 6.5_
  - [x] 16.4 `GeteilterSongBadge` erstellen (`src/components/sharing/geteilter-song-badge.tsx`)
    - Badge „Geteilt von [Name]" für geteilte Songs in der Detail-Ansicht
    - _Anforderungen: 5.4_

- [x] 17. UI-Integration: Bestehende Seiten erweitern
  - [x] 17.1 Song-Detail-Seite erweitern
    - Eigentümer: „Teilen"-Button und `FreigabeUebersicht` einbinden
    - Empfänger: `GeteilterSongBadge` anzeigen, Bearbeitungsfunktionen ausblenden
    - Zugriffsprüfung erweitert: Eigentümer ODER aktive Freigabe
    - _Anforderungen: 5.1, 5.2, 5.4, 7.1, 7.3, 7.4_
  - [x] 17.2 Set-Detail-Seite erweitern
    - Eigentümer: „Teilen"-Button und `FreigabeUebersicht` für Set einbinden
    - _Anforderungen: 7.2, 7.3, 7.4_
  - [x] 17.3 Dashboard-Seite erweitern
    - `GeteilteInhalteSektion` nach der bestehenden Song-/Set-Übersicht einbinden
    - Daten aus erweiterter Dashboard-API laden
    - _Anforderungen: 4.1, 4.2_

- [x] 18. Abschluss-Checkpoint – Alle Tests bestehen
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints sichern inkrementelle Validierung
- Property-Tests validieren universelle Korrektheitseigenschaften (20 Properties über 8 Testdateien)
- Unit-Tests validieren spezifische Beispiele und Grenzfälle
- Der E-Mail-Service ist optional und funktioniert auch ohne SMTP-Konfiguration
