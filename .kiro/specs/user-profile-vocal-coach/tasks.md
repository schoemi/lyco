# Implementierungsplan: Benutzerprofil & Gesangstechnik-Coach

## Übersicht

Schrittweise Implementierung des Benutzerprofils (Datenmodell, Service, API, Frontend) und des LLM-basierten Gesangstechnik-Coaches. Jeder Schritt baut auf dem vorherigen auf. Die bestehenden Patterns (Service-Layer, API-Routes, LLM-Client) werden konsequent wiederverwendet.

## Tasks

- [x] 1. Prisma-Schema erweitern und Migration erstellen
  - [x] 1.1 Neue Enums `Geschlecht` und `Erfahrungslevel` in `prisma/schema.prisma` anlegen
    - Enum `Geschlecht` mit Werten: MAENNLICH, WEIBLICH, DIVERS
    - Enum `Erfahrungslevel` mit Werten: ANFAENGER, FORTGESCHRITTEN, ERFAHREN, PROFI
    - _Anforderungen: 1.2, 1.3_
  - [x] 1.2 User-Modell in `prisma/schema.prisma` um optionale Felder erweitern
    - `alter Int?`, `geschlecht Geschlecht?`, `erfahrungslevel Erfahrungslevel?`, `stimmlage String?`, `genre String?`
    - Alle Felder optional mit implizitem Standardwert null
    - _Anforderungen: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [x] 1.3 Song-Modell in `prisma/schema.prisma` um optionales Feld `coachTipp String?` erweitern
    - _Anforderungen: 1b.1, 1b.2_
  - [x] 1.4 Prisma-Migration erstellen und Prisma-Client neu generieren
    - `npx prisma migrate dev --name add-profile-and-coach-fields`
    - `npx prisma generate`
    - _Anforderungen: 1.6, 1b.2_

- [x] 2. TypeScript-Typen definieren
  - [x] 2.1 Neue Datei `src/types/profile.ts` mit Profil-Typen erstellen
    - Interfaces: `ProfileData`, `UpdateProfileInput`, `ChangePasswordInput`, `CoachResult`
    - Enum-Werte als Union-Types: `"MAENNLICH" | "WEIBLICH" | "DIVERS"` und `"ANFAENGER" | "FORTGESCHRITTEN" | "ERFAHREN" | "PROFI"`
    - _Anforderungen: 1.1–1.5, 2.1, 3.2, 3.3_
  - [x] 2.2 `SongDetail`-Interface in `src/types/song.ts` um `coachTipp: string | null` erweitern
    - _Anforderungen: 1b.1, 9.4_

- [x] 3. Profil-Service implementieren
  - [x] 3.1 Neue Datei `src/lib/services/profil-service.ts` erstellen mit `getProfile(userId)`
    - User per `prisma.user.findUnique` laden
    - Passwort-Hash aus der Rückgabe ausschließen (select-Pattern analog zu `user-service.ts`)
    - Rückgabe als `ProfileData`
    - _Anforderungen: 2.1, 2.9_
  - [x] 3.2 `updateProfile(userId, data)` in `profil-service.ts` implementieren
    - Validierung: `name` nicht-leer, max. 100 Zeichen; `alter` Ganzzahl 1–120; `geschlecht` gültiger Enum-Wert; `erfahrungslevel` gültiger Enum-Wert
    - Bei Validierungsfehler: Error mit beschreibender Meldung werfen
    - `prisma.user.update` mit validierten Daten
    - _Anforderungen: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [x] 3.3 `changePassword(userId, data)` in `profil-service.ts` implementieren
    - Aktuelles Passwort gegen Hash verifizieren (via `verifyPassword` aus `auth-service.ts`)
    - Prüfen: neues Passwort === Bestätigung
    - Passwort-Validierung (min. 8 Zeichen) via `validatePassword` aus `auth-service.ts`
    - Neues Passwort hashen via `hashPassword` aus `auth-service.ts` und speichern
    - _Anforderungen: 3.1–3.7_
  - [x] 3.4 Unit-Tests für `profil-service.ts` schreiben
    - Tests für Validierung (Alter-Grenzen, ungültige Enum-Werte, Name-Länge)
    - Tests für Passwort-Änderung (falsches aktuelles Passwort, nicht übereinstimmende Passwörter, zu kurzes Passwort)
    - Datei: `__tests__/profile/profil-service.test.ts`
    - _Anforderungen: 2.3–2.7, 3.2–3.6_

- [x] 4. Profil-API-Routen implementieren
  - [x] 4.1 Neue Datei `src/app/api/profile/route.ts` mit GET- und PUT-Handler erstellen
    - Auth-Check via `auth()` aus `@/lib/auth` (Pattern aus `src/app/api/songs/[id]/analyze/route.ts`)
    - GET: `getProfile(session.user.id)` aufrufen, Ergebnis als JSON zurückgeben
    - PUT: Request-Body parsen, `updateProfile(session.user.id, body)` aufrufen
    - Fehlerbehandlung: 401 bei fehlender Session, 400 bei Validierungsfehler, 500 bei unerwartetem Fehler
    - _Anforderungen: 2.1, 2.2, 2.7, 2.8, 2.9_
  - [x] 4.2 Neue Datei `src/app/api/profile/password/route.ts` mit PUT-Handler erstellen
    - Auth-Check via `auth()`
    - `changePassword(session.user.id, body)` aufrufen
    - Fehlerbehandlung: 401 bei fehlender Session, 400 bei Validierungsfehler (spezifische Meldungen: „Passwörter stimmen nicht überein", „Aktuelles Passwort ist falsch")
    - Erfolg: `{ success: true }` zurückgeben
    - _Anforderungen: 3.1, 3.4, 3.6, 3.8_
  - [x] 4.3 Unit-Tests für Profil-API-Routen schreiben
    - Tests für Auth-Prüfung (401), Validierungsfehler (400), Erfolgsfall
    - Datei: `__tests__/profile/profile-api.test.ts`
    - _Anforderungen: 2.7, 2.8, 3.4, 3.6, 3.8_

- [x] 5. Checkpoint – Profil-Backend prüfen
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer fragen.

- [x] 6. LLM-Client für Text-Antwortformat erweitern
  - [x] 6.1 `LLMClientConfig`-Interface in `src/lib/services/llm-client.ts` um optionales Feld `responseFormat?: "json_object" | "text"` erweitern
    - Standard bleibt `"json_object"` (Abwärtskompatibilität mit `analyse-service.ts`)
    - Wenn `responseFormat` `"text"` ist: `response_format` im OpenAI-Aufruf weglassen oder auf `{ type: "text" }` setzen
    - _Anforderungen: 5.1 (Coach benötigt Freitext-Antwort)_
  - [x] 6.2 Unit-Tests für LLM-Client Text-Format schreiben
    - Sicherstellen, dass bestehende JSON-Funktionalität nicht bricht
    - Sicherstellen, dass Text-Format korrekt konfiguriert wird
    - Datei: `__tests__/smart-analysis/llm-client.test.ts` (bestehende Datei erweitern)
    - _Anforderungen: 5.1_

- [x] 7. Coach-Service implementieren
  - [x] 7.1 Neue Datei `src/lib/services/coach-service.ts` erstellen mit `buildCoachPrompt(profile, song)`
    - System-Prompt: Rolle als erfahrener Gesangscoach definieren, deutsche Sprache
    - User-Prompt: Geschlecht, Genre, Stimmlage, Erfahrungslevel, Songtitel, Künstler einfügen
    - Inhaltliche Anweisungen: Schwierigkeitseinschätzung, Gesangstechnik, Interpretations-Charakteristiken, schwierige Passagen, Übungsempfehlungen
    - Rückgabe als `LLMMessage[]` (Pattern aus `analyse-service.ts` → `buildAnalysePrompt`)
    - _Anforderungen: 5.1–5.6_
  - [x] 7.2 `validateCoachResponse(response)` in `coach-service.ts` implementieren
    - Prüfen: Antwort ist nicht-leerer String (nach trim)
    - Bei leerer/Whitespace-Antwort: Fehler werfen
    - Bei gültiger Antwort: getrimmten Text zurückgeben
    - _Anforderungen: 7.1–7.3_
  - [x] 7.3 `generateCoachTipp(userId, songId)` in `coach-service.ts` implementieren
    - User-Profil und Song aus DB laden
    - Ownership-Check: Song gehört dem User (403)
    - Song-Existenz prüfen (404)
    - Profil-Vollständigkeit prüfen: geschlecht, erfahrungslevel, stimmlage müssen gesetzt sein (400)
    - LLM-Client mit `responseFormat: "text"` erstellen
    - Prompt bauen, LLM aufrufen, Antwort validieren
    - `coachTipp` am Song speichern via `prisma.song.update`
    - Fehlerbehandlung: Timeout → spezifische Meldung, Rate-Limit (429) → spezifische Meldung, leere Antwort → spezifische Meldung
    - Fehler-Logging mit Zeitstempel, Song-ID, User-ID, Fehlerdetails
    - Error-Klasse `CoachError` analog zu `AnalyseError` in `analyse-service.ts`
    - _Anforderungen: 6.1–6.7, 7.1–7.3, 8.1–8.4_
  - [x] 7.4 Unit-Tests für `coach-service.ts` schreiben
    - Tests für Prompt-Aufbau (alle Profilfelder enthalten, deutsche Sprache)
    - Tests für Validierung (leere Antwort, Whitespace-Antwort)
    - Tests für Fehlerbehandlung (Timeout, Rate-Limit, leere Antwort)
    - Tests für Profil-Vollständigkeitsprüfung
    - Datei: `__tests__/coach/coach-service.test.ts`
    - _Anforderungen: 5.2–5.6, 7.1–7.3, 8.1–8.4_

- [x] 8. Coach-API-Route implementieren
  - [x] 8.1 Neue Datei `src/app/api/songs/[id]/coach/route.ts` mit POST-Handler erstellen
    - Auth-Check via `auth()` (Pattern aus `src/app/api/songs/[id]/analyze/route.ts`)
    - `generateCoachTipp(session.user.id, id)` aufrufen
    - Fehlerbehandlung via `CoachError`: 401, 403, 404, 400, 500
    - Erfolg: `{ coachTipp: "..." }` zurückgeben
    - _Anforderungen: 6.1–6.7_
  - [x] 8.2 Unit-Tests für Coach-API-Route schreiben
    - Tests für Auth (401), Ownership (403), Not-Found (404), unvollständiges Profil (400)
    - Datei: `__tests__/coach/coach-api.test.ts`
    - _Anforderungen: 6.4–6.7_

- [x] 9. Checkpoint – Coach-Backend prüfen
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer fragen.

- [x] 10. Profilseite im Frontend implementieren
  - [x] 10.1 Neue Datei `src/app/(main)/profile/page.tsx` erstellen
    - Client-Komponente (`"use client"`)
    - Profildaten-Formular: Name (Texteingabe), Alter (numerische Eingabe), Geschlecht (Select: Männlich/Weiblich/Divers), Erfahrungslevel (Select: Anfänger/Fortgeschritten/Erfahren/Profi), Stimmlage (Texteingabe), Genre (Texteingabe)
    - Beim Laden: GET `/api/profile` aufrufen, Formularfelder befüllen
    - Beim Absenden: PUT `/api/profile` aufrufen, Erfolgs-/Fehlermeldung anzeigen
    - Feld-spezifische Fehleranzeige bei Validierungsfehlern
    - Styling konsistent mit bestehendem Layout (Tailwind-Klassen analog zu Song-Detail-Seite)
    - _Anforderungen: 4.1–4.5_
  - [x] 10.2 Passwort-Änderungsbereich in der Profilseite implementieren
    - Separater Bereich mit Feldern: Aktuelles Passwort, Neues Passwort, Neues Passwort bestätigen
    - Beim Absenden: PUT `/api/profile/password` aufrufen
    - Bei Erfolg: Bestätigungsmeldung anzeigen, Passwort-Felder leeren
    - Bei Fehler: Fehlermeldung im Passwort-Bereich anzeigen
    - _Anforderungen: 4.6–4.8_

- [x] 11. Navigation und Song-Detail-Typ anpassen
  - [x] 11.1 Navigationslink „Profil" in `src/app/(main)/layout.tsx` hinzufügen
    - Neuer `<Link href="/profile">` zwischen „Song-Import" und „Abmelden"-Button
    - Active-State analog zu bestehenden Links (blau wenn `pathname === "/profile"`)
    - _Anforderungen: 4.1_
  - [x] 11.2 Song-API-Response um `coachTipp` erweitern
    - In `src/lib/services/song-service.ts` → `getSongDetail`: `coachTipp` aus Song-Daten in die Rückgabe aufnehmen
    - _Anforderungen: 1b.1, 9.4_

- [x] 12. CoachBereich-Komponente implementieren und in Song-Detail integrieren
  - [x] 12.1 Neue Datei `src/components/songs/coach-bereich.tsx` erstellen
    - Props: `songId`, `coachTipp`, `onCoachTippChanged`
    - Button „Gesangstechnik-Coach" (bzw. „Coach erneut befragen" wenn `coachTipp` vorhanden)
    - Ladezustand während LLM-Aufruf (Button deaktiviert, Spinner/Text)
    - POST `/api/songs/{songId}/coach` aufrufen
    - Bei Erfolg: `coachTipp` als Freitext anzeigen, `onCoachTippChanged` aufrufen
    - Bei Fehler: Fehlermeldung anzeigen
    - Bei unvollständigem Profil (400): Link zur Profilseite anzeigen
    - Bestehenden `coachTipp` beim Laden anzeigen
    - _Anforderungen: 9.1–9.7_
  - [x] 12.2 `CoachBereich` in `src/app/(main)/songs/[id]/page.tsx` integrieren
    - Import der `CoachBereich`-Komponente
    - `coachTipp` aus `song`-State an Komponente übergeben
    - `onCoachTippChanged`-Callback: lokalen Song-State aktualisieren (`setSong`)
    - Platzierung: nach den Lernmethoden, vor den Strophen
    - _Anforderungen: 9.1, 9.3, 9.4_

- [x] 13. Abschluss-Checkpoint
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer fragen.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Die bestehenden Patterns aus `analyse-service.ts`, `llm-client.ts` und den API-Routes werden konsequent wiederverwendet
