# Anforderungsdokument: Benutzerkonto-Steuerung (Sperren & Bestätigung)

## Einleitung

Dieses Dokument beschreibt die Anforderungen für die erweiterte Benutzerkonto-Steuerung der Songtext-Lern-Webanwendung. Das Feature ergänzt das bestehende User-Management (siehe Spec `user-management-auth`) um zwei Kernfunktionen:

1. **Benutzer sperren/entsperren**: Admins können Benutzerkonten sperren, sodass gesperrte Benutzer sich nicht mehr anmelden können.
2. **Manuelle Benutzerbestätigung**: Eine optionale Systemeinstellung, bei der neue Benutzer nach der Registrierung den Status "Ausstehend" erhalten und erst von einem Admin bestätigt werden müssen, bevor sie sich anmelden können.

Die Implementierung baut auf der bestehenden Architektur auf: NextAuth.js (Auth.js) mit Credentials-Provider, PostgreSQL via Prisma ORM, Next.js App Router und TypeScript. Die UI-Sprache ist Deutsch.

## Glossar

- **Anwendung**: Die Songtext-Lern-Webanwendung als Gesamtsystem
- **Auth_System**: Die Authentifizierungskomponente basierend auf NextAuth.js (Auth.js), verantwortlich für Login, Logout und Session-Verwaltung
- **Admin**: Ein registrierter Benutzer der Anwendung mit der Rolle "Admin", der erweiterte Verwaltungsrechte besitzt
- **Admin_Panel**: Die Verwaltungsoberfläche für Admins zur Benutzerverwaltung
- **Benutzer**: Ein registrierter Benutzer der Anwendung (unabhängig von der Rolle)
- **Kontostatus**: Der Zustand eines Benutzerkontos, der bestimmt, ob der Benutzer sich anmelden darf. Mögliche Werte: "Aktiv", "Gesperrt", "Ausstehend"
- **Gesperrter_Benutzer**: Ein Benutzer mit dem Kontostatus "Gesperrt", der sich nicht anmelden kann
- **Ausstehender_Benutzer**: Ein Benutzer mit dem Kontostatus "Ausstehend", der auf die Bestätigung durch einen Admin wartet und sich nicht anmelden kann
- **Bestätigungspflicht**: Eine Systemeinstellung, die festlegt, ob neue Benutzer nach der Registrierung manuell von einem Admin bestätigt werden müssen
- **Systemeinstellung**: Ein konfigurierbarer Parameter der Anwendung, der von Admins im Admin_Panel verwaltet wird
- **API_Route**: Ein serverseitiger Endpunkt in Next.js, der Anfragen verarbeitet und Antworten zurückgibt

## Anforderungen

### Anforderung 1: Kontostatus im Datenmodell

**User Story:** Als Systembetreiber möchte ich, dass jeder Benutzer einen Kontostatus hat, damit die Anwendung zwischen aktiven, gesperrten und ausstehenden Konten unterscheiden kann.

#### Akzeptanzkriterien

1. THE Anwendung SHALL jedem Benutzer genau einen Kontostatus zuweisen: "Aktiv", "Gesperrt" oder "Ausstehend".
2. WHEN ein Admin einen neuen Benutzer über das Admin_Panel erstellt, THE Anwendung SHALL dem Benutzer den Kontostatus "Aktiv" zuweisen.
3. WHEN ein Benutzer sich über das Registrierungsformular registriert und die Bestätigungspflicht deaktiviert ist, THE Anwendung SHALL dem Benutzer den Kontostatus "Aktiv" zuweisen.
4. WHEN ein Benutzer sich über das Registrierungsformular registriert und die Bestätigungspflicht aktiviert ist, THE Anwendung SHALL dem Benutzer den Kontostatus "Ausstehend" zuweisen.

### Anforderung 2: Benutzer sperren und entsperren

**User Story:** Als Admin möchte ich Benutzerkonten sperren und entsperren können, damit ich den Zugang zur Anwendung für einzelne Benutzer kontrollieren kann.

#### Akzeptanzkriterien

1. WHEN ein Admin im Admin_Panel die Aktion "Sperren" für einen aktiven Benutzer ausführt, THE Admin_Panel SHALL den Kontostatus des Benutzers auf "Gesperrt" setzen.
2. WHEN ein Admin im Admin_Panel die Aktion "Entsperren" für einen gesperrten Benutzer ausführt, THE Admin_Panel SHALL den Kontostatus des Benutzers auf "Aktiv" setzen.
3. IF ein Admin versucht, den eigenen Benutzer-Account zu sperren, THEN THE Admin_Panel SHALL die Sperrung verweigern und eine Fehlermeldung anzeigen.
4. THE Admin_Panel SHALL den aktuellen Kontostatus jedes Benutzers in der Benutzerliste als farblich gekennzeichnetes Badge anzeigen.
5. WHEN ein Admin im Admin_Panel die Aktion "Entsperren" für einen ausstehenden Benutzer ausführt, THE Admin_Panel SHALL den Kontostatus des Benutzers auf "Aktiv" setzen.

### Anforderung 3: Login-Sperre für gesperrte und ausstehende Benutzer

**User Story:** Als Systembetreiber möchte ich sicherstellen, dass gesperrte und ausstehende Benutzer sich nicht anmelden können, damit nur autorisierte Benutzer Zugang zur Anwendung haben.

#### Akzeptanzkriterien

1. WHEN ein Gesperrter_Benutzer versucht sich anzumelden, THE Auth_System SHALL die Anmeldung ablehnen und die Meldung "Ihr Konto wurde gesperrt. Bitte wenden Sie sich an den Administrator." anzeigen.
2. WHEN ein Ausstehender_Benutzer versucht sich anzumelden, THE Auth_System SHALL die Anmeldung ablehnen und die Meldung "Ihr Konto wartet auf Freigabe durch einen Administrator." anzeigen.
3. WHILE ein Benutzer den Kontostatus "Aktiv" hat, THE Auth_System SHALL die Anmeldung mit gültigen Credentials zulassen.
4. WHEN ein Benutzer gesperrt wird, während eine aktive Session besteht, THE Auth_System SHALL die bestehende Session bei der nächsten Anfrage beenden und den Benutzer auf die Login-Seite weiterleiten.

### Anforderung 4: Systemeinstellung für Bestätigungspflicht

**User Story:** Als Admin möchte ich eine Systemeinstellung aktivieren können, die neue Benutzer nach der Registrierung in den Status "Ausstehend" versetzt, damit ich kontrollieren kann, wer Zugang zur Anwendung erhält.

#### Akzeptanzkriterien

1. THE Admin_Panel SHALL eine Einstellungsseite bereitstellen, auf der die Bestätigungspflicht aktiviert oder deaktiviert werden kann.
2. THE Anwendung SHALL die Bestätigungspflicht standardmäßig als deaktiviert konfigurieren.
3. WHEN ein Admin die Bestätigungspflicht aktiviert, THE Anwendung SHALL die Einstellung persistent in der Datenbank speichern.
4. WHEN ein Admin die Bestätigungspflicht deaktiviert, THE Anwendung SHALL die Einstellung persistent in der Datenbank speichern.
5. WHILE die Bestätigungspflicht aktiviert ist, THE Anwendung SHALL nach erfolgreicher Registrierung eine Hinweismeldung anzeigen: "Ihre Registrierung war erfolgreich. Ihr Konto muss noch von einem Administrator bestätigt werden."

### Anforderung 5: Admin-Bestätigung ausstehender Benutzer

**User Story:** Als Admin möchte ich ausstehende Benutzer bestätigen oder ablehnen können, damit ich die Kontrolle über neue Registrierungen habe.

#### Akzeptanzkriterien

1. WHILE ausstehende Benutzer existieren, THE Admin_Panel SHALL die Anzahl der ausstehenden Benutzer als Badge in der Navigation anzeigen.
2. WHEN ein Admin die Aktion "Bestätigen" für einen Ausstehenden_Benutzer ausführt, THE Admin_Panel SHALL den Kontostatus des Benutzers auf "Aktiv" setzen.
3. WHEN ein Admin die Aktion "Ablehnen" für einen Ausstehenden_Benutzer ausführt, THE Admin_Panel SHALL den Benutzer nach einer Bestätigungsabfrage aus der Datenbank entfernen.
4. THE Admin_Panel SHALL ausstehende Benutzer in der Benutzerliste mit einem "Ausstehend"-Badge hervorheben und die Aktionen "Bestätigen" und "Ablehnen" anbieten.

### Anforderung 6: API-Absicherung für Kontostatus-Operationen

**User Story:** Als Systembetreiber möchte ich sicherstellen, dass nur Admins den Kontostatus von Benutzern ändern und Systemeinstellungen verwalten können.

#### Akzeptanzkriterien

1. WHEN eine API_Route zum Ändern des Kontostatus eine Anfrage von einem Benutzer mit der Rolle "User" erhält, THE API_Route SHALL die Anfrage mit HTTP-Statuscode 403 ablehnen.
2. WHEN eine API_Route zum Ändern der Bestätigungspflicht eine Anfrage von einem Benutzer mit der Rolle "User" erhält, THE API_Route SHALL die Anfrage mit HTTP-Statuscode 403 ablehnen.
3. WHEN eine API_Route zum Ändern des Kontostatus eine Anfrage ohne gültige Session erhält, THE API_Route SHALL die Anfrage mit HTTP-Statuscode 401 ablehnen.
4. WHEN eine API_Route eine Anfrage zum Sperren oder Entsperren eines nicht existierenden Benutzers erhält, THE API_Route SHALL die Anfrage mit HTTP-Statuscode 404 ablehnen.
