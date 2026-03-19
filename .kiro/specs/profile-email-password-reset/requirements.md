# Anforderungsdokument: Passwort-Rücksetzung per E-Mail & E-Mail-Verwaltung im Profil

## Einleitung

Dieses Dokument beschreibt die Anforderungen für zwei neue Self-Service-Features der Songtext-Lern-Webanwendung „Lyco":

1. **Passwort-Rücksetzung per E-Mail**: Benutzer, die ihr Passwort vergessen haben, können über ihre registrierte E-Mail-Adresse einen Rücksetzungslink anfordern und ein neues Passwort setzen. Dies ist ein Self-Service-Feature und ergänzt die bestehende Admin-Passwort-Rücksetzung (siehe Spec `user-account-control`).
2. **E-Mail-Anzeige und -Änderung im Profil**: Die E-Mail-Adresse des Benutzers wird auf der bestehenden Profilseite (`/profile`) angezeigt und kann vom Benutzer geändert werden.

Die Implementierung baut auf der bestehenden Architektur auf: Next.js App Router, Prisma ORM mit PostgreSQL, NextAuth.js (Auth.js) mit Credentials-Provider, TypeScript, Service-Layer-Pattern. Die UI-Sprache ist Deutsch.

## Glossar

- **Anwendung**: Die Songtext-Lern-Webanwendung „Lyco" als Gesamtsystem
- **Auth_System**: Die Authentifizierungskomponente basierend auf NextAuth.js (Auth.js), verantwortlich für Login, Logout und Session-Verwaltung
- **Benutzer**: Ein registrierter Benutzer der Anwendung (unabhängig von der Rolle)
- **Profil_Seite**: Die bestehende Frontend-Seite unter `/profile`, auf der ein authentifizierter Benutzer seine persönlichen Daten einsehen und bearbeiten kann
- **Profil_API**: Die bestehenden REST-API-Endpunkte für Profiloperationen des aktuell angemeldeten Benutzers
- **Profil_Service**: Die bestehende serverseitige Komponente für Lese- und Schreiboperationen von Benutzerprofildaten
- **Passwort_Reset_Service**: Die neue serverseitige Komponente, die die Self-Service-Passwort-Rücksetzung per E-Mail orchestriert (Token-Erzeugung, Validierung, Passwort-Aktualisierung)
- **E-Mail_Service**: Die neue serverseitige Komponente, die E-Mails über einen SMTP-Anbieter versendet
- **Reset_Token**: Ein kryptographisch sicherer, einmaliger Token, der einem Benutzer zugeordnet wird und zur Passwort-Rücksetzung berechtigt
- **Reset_Seite**: Die öffentliche Frontend-Seite, auf der ein Benutzer nach Klick auf den Rücksetzungslink ein neues Passwort setzen kann
- **Anforderungs_Seite**: Die öffentliche Frontend-Seite, auf der ein Benutzer seine E-Mail-Adresse eingibt, um einen Rücksetzungslink anzufordern

## Anforderungen

### Anforderung 1: Datenmodell für Passwort-Rücksetzungs-Token

**User Story:** Als Systembetreiber möchte ich, dass Passwort-Rücksetzungs-Token sicher in der Datenbank gespeichert werden, damit die Rücksetzung nachvollziehbar und zeitlich begrenzt ist.

#### Akzeptanzkriterien

1. THE Anwendung SHALL ein neues Datenbankmodell `PasswordResetToken` mit den Feldern `id`, `token` (gehasht), `userId`, `expiresAt` und `usedAt` bereitstellen.
2. THE Anwendung SHALL den Reset_Token als SHA-256-Hash in der Datenbank speichern, sodass der Klartext-Token nur dem Benutzer per E-Mail bekannt ist.
3. THE Anwendung SHALL jedem Reset_Token eine Gültigkeitsdauer von 60 Minuten ab Erstellung zuweisen.
4. WHEN ein neuer Reset_Token für einen Benutzer erstellt wird, THE Passwort_Reset_Service SHALL alle vorherigen ungenutzten Token des Benutzers als ungültig markieren.

### Anforderung 2: Passwort-Rücksetzung anfordern

**User Story:** Als Benutzer möchte ich einen Rücksetzungslink per E-Mail anfordern können, wenn ich mein Passwort vergessen habe, damit ich wieder Zugang zu meinem Konto erhalte.

#### Akzeptanzkriterien

1. THE Anforderungs_Seite SHALL unter dem Pfad `/passwort-vergessen` erreichbar sein und ein Formular mit einem E-Mail-Eingabefeld und einem Absende-Button anzeigen.
2. WHEN ein Benutzer eine registrierte E-Mail-Adresse eingibt und das Formular absendet, THE Passwort_Reset_Service SHALL einen kryptographisch sicheren Reset_Token erzeugen und per E-Mail an die angegebene Adresse senden.
3. WHEN ein Benutzer eine nicht registrierte E-Mail-Adresse eingibt, THE Anforderungs_Seite SHALL dieselbe Bestätigungsmeldung anzeigen wie bei einer registrierten Adresse, damit keine Rückschlüsse auf existierende Konten möglich sind.
4. WHEN die Anforderung erfolgreich verarbeitet wurde, THE Anforderungs_Seite SHALL die Meldung „Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Rücksetzungslink gesendet. Bitte prüfe dein Postfach." anzeigen.
5. THE E-Mail_Service SHALL die Rücksetzungs-E-Mail mit dem Betreff „Lyco – Passwort zurücksetzen" und einem Link im Format `{BASE_URL}/passwort-zuruecksetzen?token={token}` versenden.
6. THE Login-Seite SHALL einen Link „Passwort vergessen?" anzeigen, der auf die Anforderungs_Seite verweist.

### Anforderung 3: Neues Passwort setzen über Rücksetzungslink

**User Story:** Als Benutzer möchte ich über den Rücksetzungslink ein neues Passwort setzen können, damit ich mein Konto wiederherstellen kann.

#### Akzeptanzkriterien

1. THE Reset_Seite SHALL unter dem Pfad `/passwort-zuruecksetzen` erreichbar sein und ein Formular mit den Feldern „Neues Passwort" und „Neues Passwort bestätigen" anzeigen.
2. WHEN die Reset_Seite ohne gültigen Token-Parameter aufgerufen wird, THE Reset_Seite SHALL die Meldung „Ungültiger oder abgelaufener Rücksetzungslink." anzeigen und das Formular ausblenden.
3. WHEN ein Benutzer ein gültiges neues Passwort eingibt und das Formular absendet, THE Passwort_Reset_Service SHALL den Token validieren, das neue Passwort mit bcrypt hashen und im User-Modell speichern.
4. WHEN das neue Passwort und die Bestätigung nicht übereinstimmen, THE Reset_Seite SHALL die Fehlermeldung „Passwörter stimmen nicht überein." anzeigen.
5. THE Passwort_Reset_Service SHALL das neue Passwort mit der bestehenden Passwort-Validierung (mindestens 8 Zeichen) prüfen.
6. WHEN die Passwort-Rücksetzung erfolgreich abgeschlossen ist, THE Passwort_Reset_Service SHALL den verwendeten Token als benutzt markieren, sodass der Token nicht erneut verwendet werden kann.
7. WHEN die Passwort-Rücksetzung erfolgreich abgeschlossen ist, THE Reset_Seite SHALL die Meldung „Dein Passwort wurde erfolgreich zurückgesetzt. Du kannst dich jetzt anmelden." und einen Link zur Login-Seite anzeigen.
8. IF der Token abgelaufen ist, THEN THE Passwort_Reset_Service SHALL die Anfrage ablehnen und die Meldung „Der Rücksetzungslink ist abgelaufen. Bitte fordere einen neuen Link an." zurückgeben.
9. IF der Token bereits verwendet wurde, THEN THE Passwort_Reset_Service SHALL die Anfrage ablehnen und die Meldung „Dieser Rücksetzungslink wurde bereits verwendet." zurückgeben.

### Anforderung 4: API-Endpunkte für Passwort-Rücksetzung

**User Story:** Als Entwickler möchte ich klar definierte API-Endpunkte für die Passwort-Rücksetzung haben, damit Frontend und Backend sauber getrennt sind.

#### Akzeptanzkriterien

1. THE Anwendung SHALL einen POST-Endpunkt unter `/api/auth/passwort-vergessen` bereitstellen, der eine E-Mail-Adresse entgegennimmt und den Rücksetzungsprozess auslöst.
2. THE Anwendung SHALL einen POST-Endpunkt unter `/api/auth/passwort-zuruecksetzen` bereitstellen, der einen Token, ein neues Passwort und eine Passwort-Bestätigung entgegennimmt.
3. WHEN der Endpunkt `/api/auth/passwort-vergessen` eine ungültige E-Mail-Adresse (kein gültiges Format) erhält, THE Anwendung SHALL die Anfrage mit HTTP-Statuscode 400 ablehnen.
4. WHEN der Endpunkt `/api/auth/passwort-zuruecksetzen` einen ungültigen oder abgelaufenen Token erhält, THE Anwendung SHALL die Anfrage mit HTTP-Statuscode 400 und einer beschreibenden Fehlermeldung ablehnen.
5. THE Anwendung SHALL beide Endpunkte ohne Authentifizierung zugänglich machen, da Benutzer mit vergessenem Passwort nicht angemeldet sind.

### Anforderung 5: Rate-Limiting für Passwort-Rücksetzung

**User Story:** Als Systembetreiber möchte ich die Anzahl der Rücksetzungsanfragen begrenzen, damit Missbrauch und Spam verhindert werden.

#### Akzeptanzkriterien

1. WHEN ein Benutzer mehr als 3 Rücksetzungsanfragen innerhalb von 15 Minuten für dieselbe E-Mail-Adresse sendet, THE Passwort_Reset_Service SHALL weitere Anfragen ablehnen und die Meldung „Zu viele Anfragen. Bitte warte einige Minuten und versuche es erneut." zurückgeben.
2. WHEN ein Benutzer mehr als 5 fehlgeschlagene Token-Validierungen innerhalb von 15 Minuten sendet, THE Passwort_Reset_Service SHALL weitere Validierungsversuche ablehnen und die Meldung „Zu viele Versuche. Bitte warte einige Minuten." zurückgeben.

### Anforderung 6: E-Mail-Anzeige auf der Profilseite

**User Story:** Als authentifizierter Benutzer möchte ich meine E-Mail-Adresse auf der Profilseite sehen können, damit ich weiß, mit welcher Adresse mein Konto verknüpft ist.

#### Akzeptanzkriterien

1. THE Profil_Seite SHALL die aktuelle E-Mail-Adresse des Benutzers im Profildaten-Formular als eigenes Feld anzeigen.
2. THE Profil_API SHALL die E-Mail-Adresse des Benutzers in der GET-Antwort von `/api/profile` zurückgeben.

### Anforderung 7: E-Mail-Adresse ändern

**User Story:** Als authentifizierter Benutzer möchte ich meine E-Mail-Adresse im Profil ändern können, damit ich mein Konto mit einer aktuellen Adresse verknüpfen kann.

#### Akzeptanzkriterien

1. THE Profil_Seite SHALL ein bearbeitbares E-Mail-Feld im Profildaten-Formular anzeigen, über das der Benutzer eine neue E-Mail-Adresse eingeben kann.
2. WHEN der Benutzer eine neue E-Mail-Adresse eingibt und das Profil speichert, THE Profil_Service SHALL prüfen, dass die neue Adresse ein gültiges E-Mail-Format hat.
3. WHEN die neue E-Mail-Adresse bereits von einem anderen Benutzer verwendet wird, THE Profil_API SHALL die Anfrage mit HTTP-Statuscode 400 und der Meldung „Diese E-Mail-Adresse wird bereits verwendet." ablehnen.
4. WHEN die Validierung erfolgreich ist, THE Profil_Service SHALL die E-Mail-Adresse im User-Modell aktualisieren.
5. WHEN der Benutzer seine E-Mail-Adresse ändert, THE Profil_Service SHALL das aktuelle Passwort als Bestätigung verlangen, damit unbefugte Änderungen verhindert werden.
6. IF das eingegebene Passwort nicht korrekt ist, THEN THE Profil_API SHALL die Anfrage mit HTTP-Statuscode 400 und der Meldung „Passwort ist falsch." ablehnen.

### Anforderung 8: E-Mail-Versand-Konfiguration

**User Story:** Als Systembetreiber möchte ich den E-Mail-Versand über Umgebungsvariablen konfigurieren können, damit die Anwendung in verschiedenen Umgebungen betrieben werden kann.

#### Akzeptanzkriterien

1. THE E-Mail_Service SHALL die SMTP-Verbindungsdaten (Host, Port, Benutzer, Passwort) aus Umgebungsvariablen lesen.
2. THE E-Mail_Service SHALL die Absenderadresse aus einer Umgebungsvariable `EMAIL_FROM` lesen.
3. IF die SMTP-Konfiguration unvollständig ist, THEN THE E-Mail_Service SHALL beim Versuch, eine E-Mail zu senden, einen beschreibenden Fehler protokollieren und die Rücksetzungsanfrage mit HTTP-Statuscode 500 ablehnen.
4. THE Anwendung SHALL die benötigten Umgebungsvariablen in der `.env.example`-Datei dokumentieren.
