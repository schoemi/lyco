# Anforderungsdokument: Benutzerprofil & Gesangstechnik-Coach

## Einleitung

Dieses Dokument beschreibt die Anforderungen für zwei zusammenhängende Features der Songtext-Lern-Webanwendung „Lyco":

1. Eine Benutzerprofilseite, auf der authentifizierte Nutzer persönliche Daten und gesangsbezogene Informationen pflegen können (Anzeigename, Passwort, Alter, Geschlecht, Erfahrungslevel, Stimmlage, Genre).
2. Ein LLM-basierter Gesangstechnik-Coach, der auf Basis des Benutzerprofils und eines ausgewählten Songs personalisierte Gesangstipps generiert. Die Antwort wird als Freitext in einem einzelnen Textfeld am Song gespeichert.

Das Benutzerprofil erweitert das bestehende User-Modell (Prisma) um gesangsspezifische Felder. Der Technik-Coach nutzt den bestehenden LLM_Client und wird als neuer Endpunkt in die Song-Detail-Ansicht integriert.

Referenz: [Planungsdokument](../../.planning/user-profile.md)

## Glossar

- **Anwendung**: Die Songtext-Lern-Webanwendung „Lyco" als Gesamtsystem
- **Profil_Seite**: Die Frontend-Seite unter `/profile`, auf der ein authentifizierter Benutzer seine persönlichen Daten und Gesangsinformationen einsehen und bearbeiten kann
- **Profil_Service**: Die serverseitige Komponente, die Lese- und Schreiboperationen für Benutzerprofildaten orchestriert
- **Profil_API**: Die REST-API-Endpunkte für Profiloperationen des aktuell angemeldeten Benutzers
- **Coach_Service**: Die serverseitige Komponente, die den LLM-Prompt für den Gesangstechnik-Coach zusammenstellt, an den LLM_Client sendet und die Antwort validiert
- **Coach_API**: Der REST-API-Endpunkt, über den der Gesangstechnik-Coach für einen bestimmten Song aufgerufen wird
- **LLM_Client**: Die bestehende Komponente, die HTTP-Anfragen an die LLM-API sendet und Antworten empfängt (aus smart-song-analysis)
- **Coach_Prompt**: Die strukturierte Eingabeaufforderung, die Benutzerprofildaten und Songinformationen kombiniert und an das LLM gesendet wird
- **Coach_Ergebnis**: Die LLM-Antwort als Freitext, die am Song-Modell in einem Textfeld (`coachTipp`) gespeichert wird
- **Erfahrungslevel**: Die Selbsteinschätzung des Benutzers als ANFAENGER, FORTGESCHRITTEN, ERFAHREN oder PROFI
- **Geschlecht**: Die Geschlechtsangabe des Benutzers als MAENNLICH, WEIBLICH oder DIVERS

## Anforderungen

### Anforderung 1: Datenmodell-Erweiterung für Benutzerprofil

**User Story:** Als Benutzer möchte ich meine gesangsbezogenen Informationen in meinem Profil speichern können, damit der Technik-Coach personalisierte Tipps geben kann.

#### Akzeptanzkriterien

1. THE Anwendung SHALL das User-Modell im Prisma-Schema um ein optionales Ganzzahlfeld `alter` erweitern.
2. THE Anwendung SHALL das User-Modell im Prisma-Schema um ein optionales Enum-Feld `geschlecht` mit den Werten MAENNLICH, WEIBLICH und DIVERS erweitern.
3. THE Anwendung SHALL das User-Modell im Prisma-Schema um ein optionales Enum-Feld `erfahrungslevel` mit den Werten ANFAENGER, FORTGESCHRITTEN, ERFAHREN und PROFI erweitern.
4. THE Anwendung SHALL das User-Modell im Prisma-Schema um ein optionales Textfeld `stimmlage` erweitern.
5. THE Anwendung SHALL das User-Modell im Prisma-Schema um ein optionales Textfeld `genre` erweitern.
6. THE Anwendung SHALL bei Migration der neuen Felder bestehende Benutzer ohne Datenverlust beibehalten (alle neuen Felder sind optional mit Standardwert null).

### Anforderung 1b: Datenmodell-Erweiterung für Coach-Ergebnis am Song

**User Story:** Als Benutzer möchte ich, dass die Rückmeldung des Gesangstechnik-Coaches am Song gespeichert wird, damit ich sie später erneut einsehen kann.

#### Akzeptanzkriterien

1. THE Anwendung SHALL das Song-Modell im Prisma-Schema um ein optionales Textfeld `coachTipp` erweitern.
2. THE Anwendung SHALL bei Migration des neuen Feldes bestehende Songs ohne Datenverlust beibehalten (`coachTipp` ist optional mit Standardwert null).

### Anforderung 2: Profil-API für den angemeldeten Benutzer

**User Story:** Als authentifizierter Benutzer möchte ich meine Profildaten über eine API lesen und aktualisieren können, damit ich meine Informationen verwalten kann.

#### Akzeptanzkriterien

1. THE Profil_API SHALL einen GET-Endpunkt unter `/api/profile` bereitstellen, der die Profildaten des aktuell angemeldeten Benutzers zurückgibt (Name, Alter, Geschlecht, Erfahrungslevel, Stimmlage, Genre).
2. THE Profil_API SHALL einen PUT-Endpunkt unter `/api/profile` bereitstellen, der die Profildaten des aktuell angemeldeten Benutzers aktualisiert.
3. WHEN der PUT-Endpunkt ein Alter erhält, THE Profil_Service SHALL prüfen, dass der Wert eine Ganzzahl zwischen 1 und 120 ist.
4. WHEN der PUT-Endpunkt ein Geschlecht erhält, THE Profil_Service SHALL prüfen, dass der Wert MAENNLICH, WEIBLICH oder DIVERS ist.
5. WHEN der PUT-Endpunkt ein Erfahrungslevel erhält, THE Profil_Service SHALL prüfen, dass der Wert ANFAENGER, FORTGESCHRITTEN, ERFAHREN oder PROFI ist.
6. WHEN der PUT-Endpunkt einen Namen erhält, THE Profil_Service SHALL prüfen, dass der Wert ein nicht-leerer String mit maximal 100 Zeichen ist.
7. IF ein Validierungsfehler auftritt, THEN THE Profil_API SHALL die Anfrage mit HTTP-Statuscode 400 und einer beschreibenden Fehlermeldung ablehnen.
8. WHEN die Profil_API eine Anfrage ohne gültige Session erhält, THE Profil_API SHALL die Anfrage mit HTTP-Statuscode 401 ablehnen.
9. THE Profil_API SHALL das Passwort-Hash-Feld in keiner Antwort zurückgeben.

### Anforderung 3: Passwort-Änderung durch den Benutzer

**User Story:** Als authentifizierter Benutzer möchte ich mein Passwort selbst ändern können, damit ich die Sicherheit meines Kontos verwalten kann.

#### Akzeptanzkriterien

1. THE Profil_API SHALL einen PUT-Endpunkt unter `/api/profile/password` bereitstellen, der das Passwort des aktuell angemeldeten Benutzers ändert.
2. WHEN ein Benutzer sein Passwort ändern möchte, THE Profil_Service SHALL das aktuelle Passwort als Pflichtfeld entgegennehmen und gegen den gespeicherten Hash verifizieren.
3. WHEN ein Benutzer sein Passwort ändern möchte, THE Profil_Service SHALL das neue Passwort und eine Bestätigung des neuen Passworts als Pflichtfelder entgegennehmen.
4. WHEN das neue Passwort und die Bestätigung nicht übereinstimmen, THE Profil_API SHALL die Anfrage mit HTTP-Statuscode 400 und der Meldung „Passwörter stimmen nicht überein" ablehnen.
5. THE Profil_Service SHALL das neue Passwort mit der bestehenden Passwort-Validierung (mindestens 8 Zeichen) prüfen.
6. IF das aktuelle Passwort nicht korrekt ist, THEN THE Profil_API SHALL die Anfrage mit HTTP-Statuscode 400 und der Meldung „Aktuelles Passwort ist falsch" ablehnen.
7. WHEN die Validierung erfolgreich ist, THE Profil_Service SHALL das neue Passwort mit bcrypt hashen und im User-Modell speichern.
8. WHEN die Profil_API eine Anfrage ohne gültige Session erhält, THE Profil_API SHALL die Anfrage mit HTTP-Statuscode 401 ablehnen.

### Anforderung 4: Profilseite im Frontend

**User Story:** Als authentifizierter Benutzer möchte ich eine Profilseite haben, auf der ich meine persönlichen Daten und Gesangsinformationen einsehen und bearbeiten kann.

#### Akzeptanzkriterien

1. THE Profil_Seite SHALL unter dem Pfad `/profile` erreichbar sein und das bestehende Layout der Anwendung verwenden.
2. THE Profil_Seite SHALL ein Formular mit folgenden Feldern anzeigen: Anzeigename (Texteingabe), Alter (numerische Eingabe), Geschlecht (Auswahl mit den Optionen Männlich, Weiblich, Divers), Erfahrungslevel (Auswahl mit den Optionen Anfänger, Fortgeschritten, Erfahren, Profi), Stimmlage (Texteingabe), Genre (Texteingabe).
3. WHEN die Profil_Seite geladen wird, THE Profil_Seite SHALL die aktuellen Profildaten des Benutzers vom GET-Endpunkt laden und in den Formularfeldern anzeigen.
4. WHEN der Benutzer das Formular absendet, THE Profil_Seite SHALL die geänderten Daten an den PUT-Endpunkt senden und bei Erfolg eine Bestätigungsmeldung anzeigen.
5. IF die API einen Validierungsfehler zurückgibt, THEN THE Profil_Seite SHALL die Fehlermeldung am betroffenen Feld anzeigen.
6. THE Profil_Seite SHALL einen separaten Bereich für die Passwort-Änderung mit den Feldern „Aktuelles Passwort", „Neues Passwort" und „Neues Passwort bestätigen" anzeigen.
7. WHEN der Benutzer die Passwort-Änderung absendet, THE Profil_Seite SHALL die Daten an den Passwort-Endpunkt senden und bei Erfolg eine Bestätigungsmeldung anzeigen sowie die Passwort-Felder leeren.
8. IF die Passwort-API einen Fehler zurückgibt, THEN THE Profil_Seite SHALL die Fehlermeldung im Passwort-Bereich anzeigen.

### Anforderung 5: Gesangstechnik-Coach Prompt-Erstellung

**User Story:** Als Entwickler möchte ich eine klar definierte Prompt-Struktur für den Gesangstechnik-Coach haben, damit die LLM-Antworten konsistent und personalisiert sind.

#### Akzeptanzkriterien

1. THE Coach_Service SHALL den Coach_Prompt als strukturierte Nachricht mit System-Prompt und User-Prompt zusammenstellen.
2. THE Coach_Service SHALL im System-Prompt die Rolle des LLM als erfahrener Gesangscoach definieren, der personalisierte Tipps auf Basis des Benutzerprofils gibt.
3. THE Coach_Service SHALL im User-Prompt das Geschlecht, das Genre, die Stimmlage und das Erfahrungslevel des Benutzers aus dem Profil einfügen.
4. THE Coach_Service SHALL im User-Prompt den Songtitel und den Künstler des ausgewählten Songs einfügen.
5. THE Coach_Service SHALL das LLM anweisen, folgende Informationen als zusammenhängenden Freitext zu liefern: Schwierigkeitseinschätzung für den Benutzer, allgemeine Gesangstechnik des Songs (Kopfstimme, Bruststimme etc.), typische Interpretations-Charakteristiken des Originalkünstlers, schwierige Passagen im Song, Übungsempfehlungen (allgemeine Übungen für bestimmte Passagen, Tipps zur Imitation der Charakteristik des Interpreten).
6. THE Coach_Service SHALL den Prompt in deutscher Sprache formulieren.

### Anforderung 6: Gesangstechnik-Coach API-Endpunkt

**User Story:** Als Benutzer möchte ich für einen bestimmten Song personalisierte Gesangstipps von einem KI-Coach erhalten, damit ich den Song besser lernen und singen kann.

#### Akzeptanzkriterien

1. THE Coach_API SHALL einen POST-Endpunkt unter `/api/songs/[id]/coach` bereitstellen, der den Gesangstechnik-Coach für den angegebenen Song auslöst.
2. WHEN der POST-Endpunkt aufgerufen wird, THE Coach_Service SHALL die Profildaten des angemeldeten Benutzers und die Songdaten laden, den Coach_Prompt zusammenstellen und an den LLM_Client senden.
3. WHEN der LLM_Client eine gültige Antwort zurückgibt, THE Coach_Service SHALL den Antworttext im Feld `coachTipp` des Songs speichern und das Coach_Ergebnis als JSON-Antwort zurückgeben.
4. WHEN die Coach_API eine Anfrage ohne gültige Session erhält, THE Coach_API SHALL die Anfrage mit HTTP-Statuscode 401 ablehnen.
5. IF ein Benutzer den Coach für einen Song eines anderen Benutzers aufruft, THEN THE Coach_API SHALL die Anfrage mit HTTP-Statuscode 403 ablehnen.
6. IF der Song nicht existiert, THEN THE Coach_API SHALL die Anfrage mit HTTP-Statuscode 404 ablehnen.
7. IF das Benutzerprofil unvollständig ist (Geschlecht, Erfahrungslevel oder Stimmlage fehlen), THEN THE Coach_API SHALL die Anfrage mit HTTP-Statuscode 400 und einer Meldung ablehnen, die den Benutzer auffordert, zuerst sein Profil zu vervollständigen.

### Anforderung 7: Validierung der Coach-Antwort

**User Story:** Als Entwickler möchte ich die LLM-Antwort des Coaches validieren, damit die Anwendung nur sinnvolle Ergebnisse speichert und anzeigt.

#### Akzeptanzkriterien

1. THE Coach_Service SHALL prüfen, dass die LLM-Antwort ein nicht-leerer String ist.
2. IF die LLM-Antwort leer ist oder nur Whitespace enthält, THEN THE Coach_Service SHALL die Antwort verwerfen und eine beschreibende Fehlermeldung zurückgeben.
3. WHEN die Validierung erfolgreich ist, THE Coach_Service SHALL den Antworttext unverändert als `coachTipp` am Song speichern.

### Anforderung 8: Fehlerbehandlung des Coaches

**User Story:** Als Benutzer möchte ich bei Fehlern des Gesangstechnik-Coaches eine verständliche Rückmeldung erhalten, damit ich weiß, warum keine Tipps generiert werden konnten.

#### Akzeptanzkriterien

1. IF der LLM_Client einen Timeout-Fehler zurückgibt, THEN THE Coach_Service SHALL die Fehlermeldung „Die Coach-Analyse konnte nicht abgeschlossen werden. Bitte versuche es später erneut." an den Aufrufer zurückgeben.
2. IF der LLM_Client einen Rate-Limit-Fehler (HTTP 429) zurückgibt, THEN THE Coach_Service SHALL die Fehlermeldung „Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut." an den Aufrufer zurückgeben.
3. IF die LLM-Antwort leer oder ungültig ist, THEN THE Coach_Service SHALL die Fehlermeldung „Die Coach-Antwort konnte nicht verarbeitet werden. Bitte versuche es erneut." an den Aufrufer zurückgeben.
4. THE Coach_Service SHALL alle LLM-Fehler mit Zeitstempel, Song-ID, User-ID und Fehlerdetails protokollieren.

### Anforderung 9: Coach-Integration in der Song-Detail-Ansicht

**User Story:** Als Benutzer möchte ich den Gesangstechnik-Coach direkt aus der Song-Detail-Ansicht aufrufen können und die gespeicherten Tipps jederzeit einsehen, damit ich schnell personalisierte Tipps für einen Song erhalte.

#### Akzeptanzkriterien

1. THE Anwendung SHALL auf der Song-Detail-Seite einen Button „Gesangstechnik-Coach" anzeigen, der die Coach-Analyse für den aktuellen Song auslöst.
2. WHILE die Coach-Analyse läuft, THE Anwendung SHALL einen Ladezustand anzeigen und den Button deaktivieren.
3. WHEN die Coach-Analyse erfolgreich abgeschlossen ist, THE Anwendung SHALL das Coach_Ergebnis als Freitext in einem Textbereich unterhalb des Buttons anzeigen.
4. WHEN der Song bereits einen gespeicherten `coachTipp` besitzt, THE Anwendung SHALL diesen beim Laden der Seite im Textbereich anzeigen.
5. WHEN der Song bereits einen gespeicherten `coachTipp` besitzt, THE Anwendung SHALL den Button-Text zu „Coach erneut befragen" ändern, damit der Benutzer eine neue Analyse anfordern kann.
6. IF die Coach-API einen Fehler zurückgibt, THEN THE Anwendung SHALL die Fehlermeldung im Coach-Bereich anzeigen.
7. IF die Coach-API meldet, dass das Profil unvollständig ist, THEN THE Anwendung SHALL einen Link zur Profilseite anzeigen, damit der Benutzer sein Profil vervollständigen kann.
