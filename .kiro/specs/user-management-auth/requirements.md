# Anforderungsdokument: User-Management & Authentifizierung

## Einleitung

Dieses Dokument beschreibt die Anforderungen für das User-Management und die Authentifizierung der Songtext-Lern-Webanwendung. Das Feature umfasst Benutzerregistrierung, Login, Session-Verwaltung, ein Rollen-System (Admin/User) sowie eine Admin-Oberfläche zur Benutzerverwaltung. Die Authentifizierung wird über NextAuth.js (Auth.js) realisiert, die Benutzerdaten in PostgreSQL via Prisma ORM gespeichert. Die Oberfläche ist responsiv und auf Desktop, iPad und Smartphone nutzbar.

## Glossar

- **Anwendung**: Die Songtext-Lern-Webanwendung als Gesamtsystem
- **Auth_System**: Die Authentifizierungskomponente basierend auf NextAuth.js (Auth.js), verantwortlich für Login, Logout und Session-Verwaltung
- **User**: Ein registrierter Benutzer der Anwendung mit der Rolle "User"
- **Admin**: Ein registrierter Benutzer der Anwendung mit der Rolle "Admin", der erweiterte Verwaltungsrechte besitzt
- **Session**: Eine authentifizierte Sitzung eines Benutzers, verwaltet durch das Auth_System
- **Auth_UI**: Die Benutzeroberfläche für Login, Registrierung und Passwort-Zurücksetzen
- **Admin_Panel**: Die Verwaltungsoberfläche für Admins zur Benutzerverwaltung (CRUD-Operationen)
- **Credentials_Provider**: Der NextAuth.js-Provider für E-Mail/Passwort-basierte Authentifizierung
- **Rolle**: Die Berechtigungsstufe eines Benutzers im System (Admin oder User)
- **API_Route**: Ein serverseitiger Endpunkt in Next.js, der Anfragen verarbeitet und Antworten zurückgibt

## Anforderungen

### Anforderung 1: Benutzerregistrierung

**User Story:** Als neuer Benutzer möchte ich mich mit E-Mail und Passwort registrieren können, damit ich Zugang zur Anwendung erhalte.

#### Akzeptanzkriterien

1. WHEN ein Benutzer das Registrierungsformular mit gültiger E-Mail-Adresse und Passwort absendet, THE Auth_System SHALL einen neuen Benutzer mit der Rolle "User" in der Datenbank anlegen und eine Bestätigung anzeigen.
2. WHEN ein Benutzer eine E-Mail-Adresse eingibt, die bereits in der Datenbank existiert, THE Auth_System SHALL eine Fehlermeldung anzeigen, die darauf hinweist, dass die E-Mail-Adresse bereits vergeben ist.
3. WHEN ein Benutzer ein Passwort eingibt, das kürzer als 8 Zeichen ist, THE Auth_System SHALL eine Fehlermeldung anzeigen und die Registrierung ablehnen.
4. THE Auth_System SHALL das Passwort vor dem Speichern in der Datenbank mit bcrypt hashen.
5. WHEN ein Benutzer das Registrierungsformular mit einer ungültigen E-Mail-Adresse absendet, THE Auth_System SHALL eine Fehlermeldung anzeigen und die Registrierung ablehnen.

### Anforderung 2: Benutzer-Login

**User Story:** Als registrierter Benutzer möchte ich mich mit meiner E-Mail und meinem Passwort anmelden können, damit ich auf meine Songs und Sets zugreifen kann.

#### Akzeptanzkriterien

1. WHEN ein Benutzer gültige Anmeldedaten (E-Mail und Passwort) eingibt, THE Auth_System SHALL den Benutzer authentifizieren und eine neue Session erstellen.
2. WHEN ein Benutzer ungültige Anmeldedaten eingibt, THE Auth_System SHALL eine generische Fehlermeldung anzeigen, ohne preiszugeben, ob die E-Mail oder das Passwort falsch war.
3. WHEN ein Benutzer sich erfolgreich anmeldet, THE Auth_System SHALL den Benutzer auf die Hauptseite der Anwendung weiterleiten.
4. IF ein Benutzer 5 fehlgeschlagene Login-Versuche innerhalb von 15 Minuten durchführt, THEN THE Auth_System SHALL weitere Login-Versuche für diesen Benutzer für 15 Minuten sperren.

### Anforderung 3: Session-Management

**User Story:** Als angemeldeter Benutzer möchte ich eine aktive Sitzung haben, damit ich die Anwendung nutzen kann, ohne mich wiederholt anmelden zu müssen.

#### Akzeptanzkriterien

1. WHEN ein Benutzer sich erfolgreich anmeldet, THE Auth_System SHALL eine Session mit einer Gültigkeitsdauer von 24 Stunden erstellen.
2. WHILE eine gültige Session besteht, THE Auth_System SHALL den Benutzer bei jedem Seitenaufruf automatisch authentifizieren.
3. WHEN ein Benutzer den Logout-Button betätigt, THE Auth_System SHALL die aktive Session beenden und den Benutzer auf die Login-Seite weiterleiten.
4. WHEN eine Session abläuft, THE Auth_System SHALL den Benutzer auf die Login-Seite weiterleiten und eine Meldung anzeigen, dass die Sitzung abgelaufen ist.
5. WHILE eine Session aktiv ist und der Benutzer die Anwendung nutzt, THE Auth_System SHALL die Session-Gültigkeitsdauer bei jeder Interaktion erneuern.

### Anforderung 4: Rollen-System

**User Story:** Als Systembetreiber möchte ich ein Rollen-System mit den Rollen "Admin" und "User" haben, damit Zugriffsrechte differenziert vergeben werden können.

#### Akzeptanzkriterien

1. THE Anwendung SHALL jedem Benutzer genau eine Rolle zuweisen: "Admin" oder "User".
2. WHEN ein neuer Benutzer registriert wird, THE Auth_System SHALL dem Benutzer die Rolle "User" zuweisen.
3. WHILE ein Benutzer die Rolle "User" hat, THE Anwendung SHALL den Zugriff auf das Admin_Panel verweigern.
4. WHILE ein Benutzer die Rolle "Admin" hat, THE Anwendung SHALL den Zugriff auf das Admin_Panel gewähren.
5. WHEN ein nicht-authentifizierter Benutzer versucht, eine geschützte Seite aufzurufen, THE Anwendung SHALL den Benutzer auf die Login-Seite weiterleiten.

### Anforderung 5: Admin-Benutzerverwaltung (CRUD)

**User Story:** Als Admin möchte ich Benutzer erstellen, anzeigen, bearbeiten und löschen können, damit ich die Benutzerbasis der Anwendung verwalten kann.

#### Akzeptanzkriterien

1. WHILE ein Admin im Admin_Panel angemeldet ist, THE Admin_Panel SHALL eine Liste aller registrierten Benutzer mit E-Mail, Name und Rolle anzeigen.
2. WHEN ein Admin einen neuen Benutzer über das Admin_Panel erstellt, THE Admin_Panel SHALL den Benutzer mit den angegebenen Daten (E-Mail, Name, Passwort, Rolle) in der Datenbank anlegen.
3. WHEN ein Admin die Daten eines bestehenden Benutzers bearbeitet, THE Admin_Panel SHALL die geänderten Daten in der Datenbank aktualisieren.
4. WHEN ein Admin einen Benutzer löscht, THE Admin_Panel SHALL den Benutzer nach einer Bestätigungsabfrage aus der Datenbank entfernen.
5. IF ein Admin versucht, den eigenen Benutzer-Account zu löschen, THEN THE Admin_Panel SHALL die Löschung verweigern und eine Fehlermeldung anzeigen.
6. IF ein Admin versucht, einen Benutzer mit einer bereits vergebenen E-Mail-Adresse zu erstellen, THEN THE Admin_Panel SHALL eine Fehlermeldung anzeigen und das Erstellen ablehnen.
7. WHEN ein Admin das Passwort eines Benutzers zurücksetzt, THE Admin_Panel SHALL ein neues temporäres Passwort generieren und dem Admin anzeigen.

### Anforderung 6: Responsive Auth-UI

**User Story:** Als Benutzer möchte ich die Login- und Registrierungsseiten auf allen Geräten (Desktop, iPad, Smartphone) komfortabel nutzen können, damit ich flexibel auf die Anwendung zugreifen kann.

#### Akzeptanzkriterien

1. THE Auth_UI SHALL auf Bildschirmbreiten von 320px bis 2560px korrekt dargestellt werden.
2. WHILE die Bildschirmbreite kleiner als 768px ist, THE Auth_UI SHALL ein einspaltiges Layout verwenden.
3. THE Auth_UI SHALL alle Formularelemente mit einer Mindestgröße von 44x44 Pixeln für Touch-Eingaben darstellen.
4. THE Auth_UI SHALL Fehlermeldungen direkt am betroffenen Formularfeld anzeigen.
5. THE Auth_UI SHALL alle Formularfelder mit korrekten ARIA-Labels und Rollen versehen, damit Screenreader die Formulare korrekt vorlesen können.

### Anforderung 7: API-Absicherung

**User Story:** Als Systembetreiber möchte ich sicherstellen, dass alle API-Endpunkte abgesichert sind, damit keine unbefugten Zugriffe auf Benutzerdaten möglich sind.

#### Akzeptanzkriterien

1. WHEN eine API_Route eine Anfrage ohne gültige Session erhält, THE API_Route SHALL die Anfrage mit HTTP-Statuscode 401 ablehnen.
2. WHEN eine API_Route für Admin-Funktionen eine Anfrage von einem Benutzer mit der Rolle "User" erhält, THE API_Route SHALL die Anfrage mit HTTP-Statuscode 403 ablehnen.
3. THE Auth_System SHALL CSRF-Schutz für alle zustandsverändernden Anfragen (POST, PUT, DELETE) aktivieren.
4. THE Auth_System SHALL alle Session-Cookies mit den Attributen HttpOnly, Secure und SameSite=Strict setzen.

### Anforderung 8: Initialer Admin-Account

**User Story:** Als Systembetreiber möchte ich beim ersten Start der Anwendung einen Admin-Account erstellen können, damit die Anwendung initial konfiguriert werden kann.

#### Akzeptanzkriterien

1. WHEN die Anwendung zum ersten Mal gestartet wird und kein Admin-Benutzer in der Datenbank existiert, THE Anwendung SHALL einen Setup-Bildschirm anzeigen, der die Erstellung eines Admin-Accounts ermöglicht.
2. WHEN der initiale Admin-Account erstellt wurde, THE Anwendung SHALL den Setup-Bildschirm deaktivieren und auf die Login-Seite weiterleiten.
3. IF ein Benutzer versucht, den Setup-Bildschirm aufzurufen, obwohl bereits ein Admin-Account existiert, THEN THE Anwendung SHALL den Zugriff verweigern und auf die Login-Seite weiterleiten.
