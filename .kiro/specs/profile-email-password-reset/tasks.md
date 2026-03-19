# Implementation Plan: Passwort-Rücksetzung per E-Mail & E-Mail-Verwaltung im Profil

## Übersicht

Implementierung der Self-Service-Passwort-Rücksetzung per E-Mail und der E-Mail-Anzeige/-Änderung auf der Profilseite. Die Umsetzung folgt der Abhängigkeitsreihenfolge: Schema → Typen → Services → API-Routes → Frontend.

## Tasks

- [x] 1. Prisma-Schema erweitern und TypeScript-Typen anlegen
  - [x] 1.1 Prisma-Schema: Modelle `PasswordResetToken` und `PasswordResetAttempt` hinzufügen, `User`-Relation ergänzen
    - Neues Modell `PasswordResetToken` mit Feldern `id`, `token` (SHA-256-Hash), `userId`, `expiresAt`, `usedAt`, `createdAt` und Relation zu `User`
    - Neues Modell `PasswordResetAttempt` mit Feldern `id`, `email`, `type`, `createdAt` und Index auf `[email, type, createdAt]`
    - `User`-Modell um Relation `passwordResetTokens PasswordResetToken[]` erweitern
    - Prisma-Migration ausführen (`npx prisma migrate dev`)
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2_

  - [x] 1.2 TypeScript-Typen: `src/types/password-reset.ts` erstellen und `src/types/profile.ts` erweitern
    - `RequestPasswordResetInput` Interface mit `email: string`
    - `ResetPasswordInput` Interface mit `token`, `password`, `confirmPassword`
    - `ChangeEmailInput` Interface mit `email`, `currentPassword` in `src/types/profile.ts`
    - _Requirements: 4.1, 4.2, 7.1_

- [x] 2. Umgebungsvariablen und Dependency
  - [x] 2.1 `.env.example` um SMTP-Variablen erweitern
    - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` hinzufügen
    - _Requirements: 8.1, 8.2, 8.4_

  - [x] 2.2 `nodemailer` als Dependency installieren (`npm install nodemailer` und `npm install -D @types/nodemailer`)
    - _Requirements: 8.1_

- [x] 3. E-Mail-Service implementieren
  - [x] 3.1 `src/lib/services/email-service.ts` erstellen
    - `sendEmail(options: SendEmailOptions)` Funktion mit nodemailer-Transporter
    - `sendPasswordResetEmail(to, resetToken)` Convenience-Funktion
    - SMTP-Konfiguration aus Umgebungsvariablen lesen
    - Fehler bei fehlender SMTP-Konfiguration protokollieren und werfen
    - E-Mail-Betreff: „Lyco – Passwort zurücksetzen", Link-Format: `{BASE_URL}/passwort-zuruecksetzen?token={token}`
    - _Requirements: 2.5, 8.1, 8.2, 8.3_

  - [ ]* 3.2 Property-Test: Reset-E-Mail enthält korrekten Betreff und Link-Format
    - **Property 5: Reset-E-Mail enthält korrekten Betreff und Link-Format**
    - **Validates: Requirements 2.5**

- [x] 4. Passwort-Reset-Service implementieren
  - [x] 4.1 `src/lib/services/password-reset-service.ts` erstellen
    - `generateToken()` — kryptographisch sicherer Token via `crypto.randomBytes`
    - `hashToken(token)` — SHA-256-Hash des Klartext-Tokens
    - `requestPasswordReset(email)` — Rate-Limit prüfen, User suchen, alte Tokens invalidieren, neuen Token speichern, E-Mail senden, einheitliche Antwort
    - `resetPassword(token, newPassword, confirmPassword)` — Rate-Limit prüfen, Token hashen und suchen, Ablauf/Verwendung prüfen, Passwort validieren, hashen, speichern, Token als benutzt markieren
    - Rate-Limiting über `PasswordResetAttempt`-Modell (3 Anfragen/15 Min für Requests, 5 Versuche/15 Min für Validierungen)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 2.3, 3.3, 3.5, 3.6, 3.8, 3.9, 5.1, 5.2_

  - [ ]* 4.2 Property-Test: Token wird als Hash gespeichert
    - **Property 1: Token wird als Hash gespeichert, nicht als Klartext**
    - **Validates: Requirements 1.2**

  - [ ]* 4.3 Property-Test: Token-Ablaufzeit ist 60 Minuten
    - **Property 2: Token-Ablaufzeit ist 60 Minuten nach Erstellung**
    - **Validates: Requirements 1.3**

  - [ ]* 4.4 Property-Test: Neuer Token invalidiert vorherige
    - **Property 3: Neuer Token invalidiert alle vorherigen Token**
    - **Validates: Requirements 1.4**

  - [ ]* 4.5 Property-Test: Einheitliche Antwort verhindert E-Mail-Enumeration
    - **Property 4: Einheitliche Antwort verhindert E-Mail-Enumeration**
    - **Validates: Requirements 2.3, 2.4**

  - [ ]* 4.6 Property-Test: Passwort-Reset Round-Trip
    - **Property 7: Passwort-Reset Round-Trip**
    - **Validates: Requirements 3.3**

  - [ ]* 4.7 Property-Test: Ungültiges Passwort wird abgelehnt
    - **Property 8: Ungültiges Passwort wird beim Reset abgelehnt**
    - **Validates: Requirements 3.4, 3.5**

  - [ ]* 4.8 Property-Test: Token ist nur einmal verwendbar
    - **Property 9: Token ist nur einmal verwendbar**
    - **Validates: Requirements 3.6**

  - [ ]* 4.9 Property-Test: Rate-Limiting für Reset-Anforderungen
    - **Property 10: Rate-Limiting für Reset-Anforderungen**
    - **Validates: Requirements 5.1**

  - [ ]* 4.10 Property-Test: Rate-Limiting für Token-Validierungen
    - **Property 11: Rate-Limiting für Token-Validierungen**
    - **Validates: Requirements 5.2**

- [x] 5. Checkpoint – Schema, Services und Properties prüfen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. API-Routes implementieren
  - [x] 6.1 `src/app/api/auth/passwort-vergessen/route.ts` erstellen
    - POST-Handler: E-Mail aus Body lesen, Format validieren (400 bei ungültigem Format), `requestPasswordReset` aufrufen, einheitliche 200-Antwort
    - Öffentlich zugänglich (keine Auth-Prüfung)
    - Rate-Limit-Fehler als 429 zurückgeben
    - _Requirements: 4.1, 4.3, 4.5, 2.2, 2.3, 2.4_

  - [x] 6.2 `src/app/api/auth/passwort-zuruecksetzen/route.ts` erstellen
    - POST-Handler: Token, Passwort, Bestätigung aus Body lesen, `resetPassword` aufrufen
    - Fehler-Mapping: Token-Fehler → 400, Rate-Limit → 429, Validierung → 400
    - Öffentlich zugänglich (keine Auth-Prüfung)
    - _Requirements: 4.2, 4.4, 4.5, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 6.3 `src/app/api/profile/email/route.ts` erstellen
    - PUT-Handler: Auth-Prüfung via `auth()`, E-Mail und Passwort aus Body lesen, `changeEmail` aufrufen
    - Fehler-Mapping: Validierung → 400, Auth → 401
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 6.4 Unit-Tests für API-Routes
    - `__tests__/auth/password-reset-request-api.test.ts` — POST /api/auth/passwort-vergessen (Statuscode, Response-Format, Validierung)
    - `__tests__/auth/password-reset-api.test.ts` — POST /api/auth/passwort-zuruecksetzen (Statuscode, Token-Fehler, Passwort-Fehler)
    - `__tests__/profile/email-change-api.test.ts` — PUT /api/profile/email (Auth, Validierung, Fehler)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 7.2, 7.3, 7.5, 7.6_

  - [ ]* 6.5 Property-Test: Ungültiges E-Mail-Format wird abgelehnt
    - **Property 6: Ungültiges E-Mail-Format wird abgelehnt**
    - **Validates: Requirements 4.3, 7.2**

- [x] 7. Profil-Service erweitern und E-Mail-Änderung testen
  - [x] 7.1 `changeEmail`-Funktion in `src/lib/services/profil-service.ts` hinzufügen
    - E-Mail-Format validieren, Duplikat prüfen, Passwort verifizieren, E-Mail aktualisieren
    - `getProfile` soll E-Mail-Adresse bereits zurückgeben (prüfen ob `email` im `profileSelect` enthalten ist)
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 6.2_

  - [ ]* 7.2 Property-Test: E-Mail-Änderung wird bei falschem Passwort oder Duplikat abgelehnt
    - **Property 12: E-Mail-Änderung wird bei falschem Passwort oder Duplikat abgelehnt**
    - **Validates: Requirements 7.3, 7.5, 7.6**

  - [ ]* 7.3 Property-Test: E-Mail-Änderung Round-Trip
    - **Property 13: E-Mail-Änderung Round-Trip**
    - **Validates: Requirements 7.4**

- [x] 8. Checkpoint – API-Routes und Profil-Service prüfen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Frontend-Seiten implementieren
  - [x] 9.1 Anforderungs-Seite `src/app/(auth)/passwort-vergessen/page.tsx` erstellen
    - Client-Komponente im `(auth)`-Layout
    - E-Mail-Eingabefeld, Absende-Button, Bestätigungsmeldung nach Absenden
    - Fetch an POST `/api/auth/passwort-vergessen`
    - Fehlerbehandlung (Rate-Limit, Validierung)
    - Link zurück zur Login-Seite
    - _Requirements: 2.1, 2.4_

  - [x] 9.2 Reset-Seite `src/app/(auth)/passwort-zuruecksetzen/page.tsx` erstellen
    - Client-Komponente im `(auth)`-Layout
    - Token aus URL-Query-Parameter `?token=...` lesen
    - Fehlermeldung wenn kein Token vorhanden
    - Formular: „Neues Passwort" + „Neues Passwort bestätigen"
    - Fetch an POST `/api/auth/passwort-zuruecksetzen`
    - Erfolgsmeldung mit Link zur Login-Seite
    - _Requirements: 3.1, 3.2, 3.4, 3.7_

  - [x] 9.3 Login-Seite `src/app/(auth)/login/page.tsx` modifizieren
    - „Passwort vergessen?"-Link zwischen Passwort-Feld und Anmelde-Button hinzufügen
    - Link verweist auf `/passwort-vergessen`
    - _Requirements: 2.6_

  - [x] 9.4 Profil-Seite `src/app/(main)/profile/page.tsx` erweitern
    - E-Mail-Adresse als read-only Feld im Profildaten-Formular anzeigen
    - Neuer Abschnitt „E-Mail-Adresse ändern" mit Feldern: Neue E-Mail, Aktuelles Passwort
    - Separater Submit-Handler für E-Mail-Änderung (PUT `/api/profile/email`)
    - Erfolgs- und Fehlermeldungen
    - _Requirements: 6.1, 6.2, 7.1, 7.2, 7.3, 7.5, 7.6_

- [x] 10. Final Checkpoint – Alle Tests und Integration prüfen
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachvollziehbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften aus dem Design
- Unit-Tests validieren spezifische Beispiele und Edge-Cases
