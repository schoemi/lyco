# Anforderungsdokument: Admin Audit & Server-Fehler Log

## Einleitung

Dieses Feature erweitert den Admin-Bereich der Song Text Trainer Anwendung um eine Seite mit zwei Log-Ansichten: einem Audit-Log, das Benutzeraktionen und Systemereignisse protokolliert, sowie einem Server-Fehler-Log, das serverseitige Fehler und API-Ausfälle erfasst. Beide Logs sind ausschließlich für Administratoren zugänglich und dienen der Nachvollziehbarkeit, Fehleranalyse und Systemüberwachung.

## Glossar

- **Audit_Log**: Datenbanktabelle und zugehörige Ansicht, die sicherheitsrelevante und administrative Benutzeraktionen chronologisch protokolliert (z.B. Login, Benutzererstellung, Einstellungsänderungen).
- **Server_Fehler_Log**: Datenbanktabelle und zugehörige Ansicht, die serverseitige Fehler, unbehandelte Ausnahmen und fehlgeschlagene API-Aufrufe protokolliert.
- **Log_Eintrag**: Ein einzelner Datensatz im Audit_Log oder Server_Fehler_Log mit Zeitstempel, Kategorie und Detailinformationen.
- **Admin_Log_Seite**: Die neue Seite im Admin-Bereich unter `/admin/logs`, die beide Log-Ansichten als Tabs bereitstellt.
- **Log_API**: Die REST-API-Endpunkte unter `/api/audit-log` und `/api/server-errors`, die Log-Einträge bereitstellen.
- **Log_Service**: Die serverseitige Dienstschicht, die das Schreiben und Lesen von Log-Einträgen kapselt.
- **Administrator**: Ein Benutzer mit der Rolle `ADMIN` im System.
- **Akteur**: Der Benutzer, der eine protokollierte Aktion ausgelöst hat.
- **Fehler_Schweregrad**: Klassifizierung eines Server-Fehlers als `ERROR`, `WARN` oder `FATAL`.

## Anforderungen

### Anforderung 1: Audit-Log Datenspeicherung

**User Story:** Als Administrator möchte ich, dass sicherheitsrelevante Benutzeraktionen automatisch protokolliert werden, damit ich nachvollziehen kann, wer wann welche Aktion durchgeführt hat.

#### Akzeptanzkriterien

1. WHEN ein Benutzer sich erfolgreich anmeldet, THE Log_Service SHALL einen Log_Eintrag mit der Aktion "LOGIN_SUCCESS", der Benutzer-ID und dem Zeitstempel im Audit_Log erstellen.
2. WHEN ein Benutzer sich nicht erfolgreich anmeldet, THE Log_Service SHALL einen Log_Eintrag mit der Aktion "LOGIN_FAILED" und der verwendeten E-Mail-Adresse im Audit_Log erstellen.
3. WHEN ein Administrator einen Benutzer erstellt, bearbeitet oder löscht, THE Log_Service SHALL einen Log_Eintrag mit der jeweiligen Aktion, der Akteur-ID und der betroffenen Benutzer-ID im Audit_Log erstellen.
4. WHEN ein Administrator eine Systemeinstellung ändert, THE Log_Service SHALL einen Log_Eintrag mit der Aktion "SETTING_CHANGED", dem Einstellungsschlüssel und dem neuen Wert im Audit_Log erstellen.
5. WHEN ein Administrator den Kontostatus eines Benutzers ändert, THE Log_Service SHALL einen Log_Eintrag mit der Aktion "ACCOUNT_STATUS_CHANGED", der Akteur-ID, der betroffenen Benutzer-ID und dem neuen Status im Audit_Log erstellen.
6. THE Audit_Log SHALL für jeden Log_Eintrag folgende Felder speichern: ID, Aktion, Akteur-ID (optional), Ziel-Entität (optional), Ziel-ID (optional), Details (optional, JSON), IP-Adresse (optional) und Zeitstempel.

### Anforderung 2: Server-Fehler-Log Datenspeicherung

**User Story:** Als Administrator möchte ich, dass serverseitige Fehler automatisch protokolliert werden, damit ich Probleme im System schnell erkennen und analysieren kann.

#### Akzeptanzkriterien

1. WHEN ein API-Endpunkt einen unbehandelten Fehler auslöst, THE Log_Service SHALL einen Log_Eintrag mit dem Fehler_Schweregrad "ERROR", der Fehlermeldung, dem Stack-Trace und dem betroffenen API-Pfad im Server_Fehler_Log erstellen.
2. WHEN ein API-Endpunkt einen HTTP-Statuscode >= 500 zurückgibt, THE Log_Service SHALL einen Log_Eintrag mit dem Fehler_Schweregrad "ERROR", dem Statuscode und dem API-Pfad im Server_Fehler_Log erstellen.
3. THE Server_Fehler_Log SHALL für jeden Log_Eintrag folgende Felder speichern: ID, Fehler_Schweregrad, Nachricht, Stack-Trace (optional), API-Pfad (optional), HTTP-Methode (optional), HTTP-Statuscode (optional), Benutzer-ID (optional) und Zeitstempel.
4. IF das Schreiben eines Log_Eintrags in die Datenbank fehlschlägt, THEN THE Log_Service SHALL den Fehler in die Konsole (stdout) schreiben, ohne die ursprüngliche Anfrage zu beeinträchtigen.

### Anforderung 3: Audit-Log API

**User Story:** Als Administrator möchte ich Audit-Log-Einträge über eine API abrufen können, damit die Admin-Oberfläche die Daten anzeigen kann.

#### Akzeptanzkriterien

1. THE Log_API SHALL einen GET-Endpunkt unter `/api/audit-log` bereitstellen, der paginierte Audit-Log-Einträge zurückgibt.
2. WHEN ein nicht authentifizierter Benutzer den Endpunkt `/api/audit-log` aufruft, THE Log_API SHALL mit HTTP-Statuscode 401 antworten.
3. WHEN ein Benutzer ohne ADMIN-Rolle den Endpunkt `/api/audit-log` aufruft, THE Log_API SHALL mit HTTP-Statuscode 403 antworten.
4. WHEN ein Administrator den Endpunkt `/api/audit-log` mit dem Query-Parameter `action` aufruft, THE Log_API SHALL nur Log_Einträge mit der angegebenen Aktion zurückgeben.
5. WHEN ein Administrator den Endpunkt `/api/audit-log` mit den Query-Parametern `page` und `limit` aufruft, THE Log_API SHALL die Ergebnisse entsprechend paginieren und die Gesamtanzahl der Einträge im Response-Body zurückgeben.
6. THE Log_API SHALL die Audit-Log-Einträge absteigend nach Zeitstempel sortiert zurückgeben.

### Anforderung 4: Server-Fehler-Log API

**User Story:** Als Administrator möchte ich Server-Fehler-Log-Einträge über eine API abrufen können, damit die Admin-Oberfläche die Daten anzeigen kann.

#### Akzeptanzkriterien

1. THE Log_API SHALL einen GET-Endpunkt unter `/api/server-errors` bereitstellen, der paginierte Server-Fehler-Log-Einträge zurückgibt.
2. WHEN ein nicht authentifizierter Benutzer den Endpunkt `/api/server-errors` aufruft, THE Log_API SHALL mit HTTP-Statuscode 401 antworten.
3. WHEN ein Benutzer ohne ADMIN-Rolle den Endpunkt `/api/server-errors` aufruft, THE Log_API SHALL mit HTTP-Statuscode 403 antworten.
4. WHEN ein Administrator den Endpunkt `/api/server-errors` mit dem Query-Parameter `severity` aufruft, THE Log_API SHALL nur Log_Einträge mit dem angegebenen Fehler_Schweregrad zurückgeben.
5. WHEN ein Administrator den Endpunkt `/api/server-errors` mit den Query-Parametern `page` und `limit` aufruft, THE Log_API SHALL die Ergebnisse entsprechend paginieren und die Gesamtanzahl der Einträge im Response-Body zurückgeben.
6. THE Log_API SHALL die Server-Fehler-Log-Einträge absteigend nach Zeitstempel sortiert zurückgeben.

### Anforderung 5: Admin Log-Seite mit Tab-Navigation

**User Story:** Als Administrator möchte ich eine übersichtliche Seite im Admin-Bereich haben, auf der ich zwischen Audit-Log und Server-Fehler-Log wechseln kann.

#### Akzeptanzkriterien

1. THE Admin_Log_Seite SHALL unter dem Pfad `/admin/logs` erreichbar sein.
2. THE Admin_Log_Seite SHALL zwei Tabs bereitstellen: "Audit Log" und "Server-Fehler".
3. WHEN der Administrator den Tab "Audit Log" auswählt, THE Admin_Log_Seite SHALL die Audit-Log-Einträge in einer Tabelle mit den Spalten Zeitstempel, Aktion, Akteur, Ziel und Details anzeigen.
4. WHEN der Administrator den Tab "Server-Fehler" auswählt, THE Admin_Log_Seite SHALL die Server-Fehler-Log-Einträge in einer Tabelle mit den Spalten Zeitstempel, Schweregrad, Nachricht, API-Pfad und Statuscode anzeigen.
5. THE Admin_Log_Seite SHALL einen Link "Logs" in der Admin-Navigation anzeigen, konsistent mit den bestehenden Navigationseinträgen (Benutzer, Einstellungen, Theming, Vocal Tags).
6. WHEN die Admin_Log_Seite geladen wird, THE Admin_Log_Seite SHALL den Tab "Audit Log" als Standard-Tab anzeigen.

### Anforderung 6: Filterung und Paginierung der Log-Ansichten

**User Story:** Als Administrator möchte ich die Log-Einträge filtern und durch Seiten blättern können, damit ich relevante Einträge schnell finden kann.

#### Akzeptanzkriterien

1. THE Admin_Log_Seite SHALL im Tab "Audit Log" ein Dropdown-Menü zur Filterung nach Aktionstyp bereitstellen.
2. THE Admin_Log_Seite SHALL im Tab "Server-Fehler" ein Dropdown-Menü zur Filterung nach Fehler_Schweregrad bereitstellen.
3. THE Admin_Log_Seite SHALL in beiden Tabs eine Paginierung mit "Zurück"- und "Weiter"-Schaltflächen anzeigen.
4. THE Admin_Log_Seite SHALL die aktuelle Seitennummer und die Gesamtanzahl der Seiten anzeigen.
5. WHEN der Administrator einen Filter ändert, THE Admin_Log_Seite SHALL die Paginierung auf Seite 1 zurücksetzen und die gefilterten Ergebnisse laden.
6. THE Admin_Log_Seite SHALL 25 Einträge pro Seite anzeigen.

### Anforderung 7: Zugriffsschutz

**User Story:** Als Systembetreiber möchte ich sicherstellen, dass nur Administratoren auf die Log-Daten zugreifen können, damit sensible Informationen geschützt bleiben.

#### Akzeptanzkriterien

1. WHEN ein nicht authentifizierter Benutzer die URL `/admin/logs` aufruft, THE Admin_Log_Seite SHALL den Benutzer zur Anmeldeseite weiterleiten.
2. WHEN ein authentifizierter Benutzer ohne ADMIN-Rolle die URL `/admin/logs` aufruft, THE Admin_Log_Seite SHALL den Zugriff verweigern und eine Fehlermeldung anzeigen.
3. THE Log_API SHALL bei jedem Aufruf die Authentifizierung und die ADMIN-Rolle des anfragenden Benutzers prüfen, bevor Log-Daten zurückgegeben werden.

### Anforderung 8: Datenbankmodell

**User Story:** Als Entwickler möchte ich klar definierte Datenbankmodelle für die Log-Einträge haben, damit die Daten konsistent und effizient gespeichert werden.

#### Akzeptanzkriterien

1. THE Audit_Log SHALL als Prisma-Modell `AuditLog` mit den Feldern `id` (cuid), `action` (String), `actorId` (optional, Referenz auf User), `targetEntity` (optional, String), `targetId` (optional, String), `details` (optional, JSON), `ipAddress` (optional, String) und `createdAt` (DateTime) definiert werden.
2. THE Server_Fehler_Log SHALL als Prisma-Modell `ServerError` mit den Feldern `id` (cuid), `severity` (Enum: ERROR, WARN, FATAL), `message` (String), `stackTrace` (optional, String), `apiPath` (optional, String), `httpMethod` (optional, String), `statusCode` (optional, Int), `userId` (optional, Referenz auf User) und `createdAt` (DateTime) definiert werden.
3. THE Audit_Log SHALL einen Index auf den Feldern `action` und `createdAt` haben, um effiziente Filterung und Sortierung zu ermöglichen.
4. THE Server_Fehler_Log SHALL einen Index auf den Feldern `severity` und `createdAt` haben, um effiziente Filterung und Sortierung zu ermöglichen.
