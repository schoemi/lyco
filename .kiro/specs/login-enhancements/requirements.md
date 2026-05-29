# Requirements Document

## Introduction

Erweiterung des bestehenden Login-Systems der Lyco-Anwendung um drei Funktionen: Remember-Me (persistente Sitzung), Passkey-Authentifizierung via WebAuthn/FIDO2 und Single Sign-On über Authentik als OpenID Connect Provider. Die bestehende Credentials-Authentifizierung (NextAuth, JWT-Sessions, bcrypt) bleibt erhalten und wird durch die neuen Optionen ergänzt.

## Glossary

- **Login_System**: Die bestehende Authentifizierungskomponente der Lyco-Anwendung basierend auf NextAuth mit JWT-Sessions
- **Remember_Me_Modul**: Komponente, die eine verlängerte Sitzungsdauer über den Browser-Neustart hinaus ermöglicht
- **Passkey_Service**: Serverkomponente, die WebAuthn/FIDO2-Registrierung und -Authentifizierung verwaltet
- **Passkey**: Ein FIDO2-konformer Credential, der auf dem Gerät des Benutzers gespeichert wird (z.B. Fingerabdruck, Face ID, Hardware-Key)
- **SSO_Provider**: Authentik-Instanz, die als OpenID Connect Identity Provider fungiert
- **Benutzer**: Eine registrierte Person mit einem aktiven Konto in der Lyco-Anwendung
- **Credential**: Ein gespeicherter WebAuthn Public Key, der einem Benutzer zugeordnet ist
- **Session_Token**: Das JWT-basierte Cookie, das die aktive Sitzung des Benutzers repräsentiert

## Requirements

### Requirement 1: Remember-Me bei der Anmeldung

**User Story:** Als Benutzer möchte ich bei der Anmeldung eine "Angemeldet bleiben"-Option wählen können, damit ich nicht bei jedem Browser-Neustart erneut meine Zugangsdaten eingeben muss.

#### Acceptance Criteria

1. THE Login_System SHALL eine "Angemeldet bleiben"-Checkbox auf der Login-Seite anzeigen, die standardmäßig deaktiviert ist
2. WHEN der Benutzer die "Angemeldet bleiben"-Option aktiviert und sich erfolgreich anmeldet, THE Login_System SHALL eine Sitzung mit einer Gültigkeitsdauer von 30 Tagen erstellen
3. WHEN der Benutzer sich ohne "Angemeldet bleiben"-Option anmeldet, THE Login_System SHALL die bestehende Sitzungsdauer von 24 Stunden beibehalten
4. WHILE eine Remember-Me-Sitzung aktiv ist, THE Login_System SHALL das Session_Token bei jeder authentifizierten Anfrage um 30 Tage ab dem Zeitpunkt der Anfrage verlängern (Rolling Session)
5. THE Login_System SHALL das Remember-Me-Cookie mit den Attributen httpOnly, secure (in Produktion) und sameSite=lax setzen
6. WHEN die serverseitige Sitzung aus beliebigem Grund invalidiert wird (Abmeldung, Sicherheitsrichtlinie oder Admin-Aktion), THE Login_System SHALL das Remember-Me-Cookie vollständig entfernen
7. IF eine Remember-Me-Sitzung abläuft, THEN THE Login_System SHALL den Benutzer zur Login-Seite weiterleiten UND eine Meldung anzeigen, die auf die abgelaufene Sitzung hinweist
8. IF das Konto eines Benutzers gesperrt wird (Status SUSPENDED) während eine Remember-Me-Sitzung aktiv ist, THEN THE Login_System SHALL die Sitzung bei der nächsten Anfrage invalidieren und den Zugriff verweigern

### Requirement 2: Passkey-Registrierung

**User Story:** Als Benutzer möchte ich einen Passkey für mein Konto registrieren können, damit ich mich zukünftig ohne Passwort anmelden kann.

#### Acceptance Criteria

1. WHILE der Benutzer angemeldet ist, THE Passkey_Service SHALL eine Option zur Passkey-Registrierung in den Kontoeinstellungen anbieten
2. WHEN der Benutzer die Passkey-Registrierung startet, THE Passkey_Service SHALL eine WebAuthn-Challenge mit einer Gültigkeitsdauer von 60 Sekunden generieren und an den Browser senden
3. WHEN der Browser einen signierten Credential zurückgibt, THE Passkey_Service SHALL den öffentlichen Schlüssel, die Credential-ID und einen benutzerdefinierten Namen (Pflichtfeld, 1–64 Zeichen) speichern
4. THE Passkey_Service SHALL maximal 10 Passkeys pro Benutzer unterstützen
5. IF der Benutzer bereits 10 Passkeys registriert hat, THEN THE Passkey_Service SHALL die Registrierung ablehnen und eine Fehlermeldung anzeigen, die auf das erreichte Limit hinweist
6. WHILE der Benutzer angemeldet ist, THE Passkey_Service SHALL eine Liste aller registrierten Passkeys mit Name und Erstellungsdatum anzeigen
7. WHEN der Benutzer einen Passkey löscht, THE Passkey_Service SHALL den zugehörigen Credential aus der Datenbank entfernen
8. IF die WebAuthn-Registrierung fehlschlägt, THEN THE Passkey_Service SHALL eine Fehlermeldung anzeigen, die den Grund des Fehlschlags benennt (z.B. Timeout, Abbruch durch Benutzer, nicht unterstütztes Gerät)
9. IF die Challenge abgelaufen ist, THEN THE Passkey_Service SHALL die Registrierung ablehnen und den Benutzer auffordern, den Vorgang erneut zu starten

### Requirement 3: Passkey-Authentifizierung

**User Story:** Als Benutzer möchte ich mich mit meinem registrierten Passkey anmelden können, damit ich kein Passwort eingeben muss.

#### Acceptance Criteria

1. IF der Browser WebAuthn unterstützt, THEN THE Login_System SHALL einen "Mit Passkey anmelden"-Button auf der Login-Seite anzeigen
2. WHEN der Benutzer die Passkey-Anmeldung startet, THE Passkey_Service SHALL eine Authentication-Challenge generieren, mit einer Gültigkeitsdauer von 60 Sekunden versehen und an den Browser senden
3. WHEN der Browser eine gültige Assertion zurückgibt, THE Passkey_Service SHALL den Benutzer authentifizieren und eine JWT-Sitzung mit der Standard-Sitzungsdauer von 24 Stunden erstellen
4. IF die Passkey-Assertion ungültig ist und die Challenge noch nicht abgelaufen ist, THEN THE Login_System SHALL eine Fehlermeldung anzeigen und dem Benutzer einen erneuten Versuch mit derselben Challenge ermöglichen
5. IF die Challenge abgelaufen ist, THEN THE Login_System SHALL eine Fehlermeldung anzeigen und den Benutzer auffordern, den Anmeldevorgang erneut zu starten
6. IF der Browser WebAuthn nicht unterstützt, THEN THE Login_System SHALL den "Mit Passkey anmelden"-Button ausblenden
7. WHEN eine erfolgreiche Passkey-Authentifizierung stattfindet, THE Login_System SHALL den Anmeldevorgang im Audit-Log mit Aktion, Benutzer-ID, IP-Adresse und verwendeter Credential-ID protokollieren
8. IF der Signature Counter eines Credentials kleiner oder gleich dem gespeicherten Wert ist, THEN THE Passkey_Service SHALL die Authentifizierung ablehnen, den betroffenen Credential deaktivieren und eine Fehlermeldung anzeigen, die auf ein mögliches Sicherheitsproblem hinweist
9. THE Passkey_Service SHALL die bestehende Rate-Limiting-Logik (maximal 5 fehlgeschlagene Versuche innerhalb von 15 Minuten) auf Passkey-Authentifizierungsversuche anwenden
10. WHEN der Benutzer die Passkey-Anmeldung startet, THE Passkey_Service SHALL Discoverable Credentials verwenden, sodass keine vorherige Eingabe eines Benutzernamens erforderlich ist

### Requirement 4: SSO via Authentik (OpenID Connect)

**User Story:** Als Benutzer möchte ich mich über meinen Authentik-Account anmelden können, damit ich zentrale Zugangsdaten verwenden kann.

#### Acceptance Criteria

1. WHERE SSO aktiviert ist, THE Login_System SHALL einen "Mit SSO anmelden"-Button auf der Login-Seite anzeigen, wenn die SSO-Konfiguration (Client-ID, Client-Secret, Issuer-URL) vollständig in den Umgebungsvariablen vorhanden ist
2. WHEN der Benutzer den SSO-Button klickt, THE Login_System SHALL den Benutzer zum Authentik-Authorization-Endpoint weiterleiten und dabei einen PKCE-Code-Challenge (S256-Methode), einen zufälligen State-Parameter sowie den Scope "openid email profile" mitsenden
3. WHEN Authentik einen gültigen Authorization-Code zurückgibt, THE Login_System SHALL den Code zusammen mit dem PKCE-Code-Verifier innerhalb von 10 Sekunden gegen ein ID-Token und Access-Token am Token-Endpoint eintauschen
4. IF der Token-Austausch fehlschlägt oder der Token-Endpoint nicht innerhalb von 10 Sekunden antwortet, THEN THE Login_System SHALL den Benutzer zur Login-Seite zurückleiten und eine Fehlermeldung anzeigen, die auf ein SSO-Kommunikationsproblem hinweist
5. WHEN ein ID-Token empfangen wird, THE Login_System SHALL das Token validieren, indem Signatur, Issuer (muss mit konfigurierter Issuer-URL übereinstimmen), Audience (muss mit konfigurierter Client-ID übereinstimmen) und Ablaufzeit (exp darf nicht in der Vergangenheit liegen) geprüft werden
6. WHEN ein gültiges ID-Token vorliegt und ein bestehendes Konto mit der im Token enthaltenen E-Mail-Adresse existiert, THE Login_System SHALL den Benutzer diesem Konto zuordnen und eine JWT-Sitzung erstellen
7. WHEN ein gültiges ID-Token vorliegt und kein bestehendes Konto mit der E-Mail-Adresse existiert und die automatische Kontoerstellung aktiviert ist, THE Login_System SHALL ein neues Konto erstellen und eine JWT-Sitzung erstellen
8. IF kein bestehendes Konto mit der SSO-E-Mail existiert und die automatische Kontoerstellung deaktiviert ist, THEN THE Login_System SHALL die Anmeldung verweigern und eine Fehlermeldung anzeigen, die darauf hinweist, dass kein Konto gefunden wurde und eine vorherige Registrierung erforderlich ist
9. IF der zurückgegebene State-Parameter nicht mit dem gesendeten State-Parameter übereinstimmt, THEN THE Login_System SHALL die Authentifizierung abbrechen und den Benutzer zur Login-Seite zurückleiten
10. THE Login_System SHALL die SSO-Konfiguration (Client-ID, Client-Secret, Issuer-URL) über Umgebungsvariablen laden
11. WHEN ein SSO-Benutzer sich abmeldet, THE Login_System SHALL die lokale JWT-Sitzung beenden und das Session-Cookie entfernen

### Requirement 5: SSO-Kontoverknüpfung und Verwaltung

**User Story:** Als Administrator möchte ich steuern können, ob SSO-Benutzer automatisch ein Konto erhalten, damit ich die Benutzerverwaltung kontrollieren kann.

#### Acceptance Criteria

1. THE Login_System SHALL eine Admin-Einstellung "Automatische Kontoerstellung bei SSO" als booleschen Wert bereitstellen, die nur von Benutzern mit der Rolle ADMIN gelesen und geändert werden kann und deren Standardwert FALSE ist
2. WHILE die automatische Kontoerstellung aktiviert ist, WHEN ein SSO-Benutzer sich anmeldet und kein Konto mit der E-Mail-Adresse aus dem ID-Token existiert, THE Login_System SHALL ein neues Konto mit der E-Mail-Adresse und dem Anzeigenamen aus dem ID-Token, der Rolle USER und dem Status ACTIVE erstellen
3. WHILE die automatische Kontoerstellung deaktiviert ist, THE Login_System SHALL ausschließlich SSO-Anmeldungen für Benutzer zulassen, deren E-Mail-Adresse bereits einem bestehenden Konto zugeordnet ist
4. WHILE ein Benutzer angemeldet ist, THE Login_System SHALL in den Kontoeinstellungen den SSO-Verknüpfungsstatus anzeigen, bestehend aus dem Hinweis, ob das Konto mit SSO verknüpft ist, und dem Namen des SSO-Providers
5. IF ein SSO-Benutzer ein gesperrtes Konto mit dem Status SUSPENDED hat, THEN THE Login_System SHALL die Anmeldung verweigern und eine Fehlermeldung anzeigen, die darauf hinweist, dass das Konto gesperrt ist
6. IF ein SSO-Benutzer ein Konto mit dem Status PENDING hat, THEN THE Login_System SHALL die Anmeldung verweigern und eine Fehlermeldung anzeigen, die darauf hinweist, dass das Konto noch nicht freigeschaltet ist

### Requirement 6: Sicherheitsanforderungen

**User Story:** Als Betreiber möchte ich sicherstellen, dass die neuen Authentifizierungsmethoden die Sicherheit der Anwendung nicht beeinträchtigen.

#### Acceptance Criteria

1. THE Passkey_Service SHALL ausschließlich den Algorithmus ES256 oder RS256 für WebAuthn-Credentials akzeptieren
2. WHEN der Passkey_Service bei einer Authentifizierung einen Signature Counter erkennt, der kleiner oder gleich dem gespeicherten Wert ist, THE Passkey_Service SHALL die Authentifizierung ablehnen und den betroffenen Credential als kompromittiert markieren
3. THE Login_System SHALL bei jedem Authentifizierungsversuch (Passkey, SSO, Remember-Me) sowohl bei Erfolg als auch bei Fehlschlag einen Eintrag im Audit-Log erstellen, der die Authentifizierungsmethode, die Benutzer-ID (falls bekannt), die IP-Adresse und den Zeitstempel enthält
4. THE Login_System SHALL die bestehende Rate-Limiting-Logik (maximal 5 fehlgeschlagene Versuche innerhalb von 15 Minuten) auf Passkey-Authentifizierungsversuche anwenden, wobei die IP-Adresse als Identifikator verwendet wird
5. IF der SSO_Provider ein abgelaufenes oder ungültiges ID-Token liefert, THEN THE Login_System SHALL die Authentifizierung ablehnen und den Benutzer zur Login-Seite zurückleiten
6. THE Login_System SHALL den PKCE-Flow (Proof Key for Code Exchange) mit der code_challenge_method S256 für die SSO-Kommunikation mit Authentik verwenden
7. IF ein Passkey-Credential als kompromittiert markiert ist, THEN THE Passkey_Service SHALL jede weitere Authentifizierung mit diesem Credential ablehnen und den Benutzer auffordern, den Passkey neu zu registrieren
