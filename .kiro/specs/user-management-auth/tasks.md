# Implementierungsplan: User-Management & Authentifizierung

## Übersicht

Schrittweise Implementierung des User-Management- und Auth-Systems für die Songtext-Lern-Webanwendung. Der Plan beginnt mit der Datenbank und den Core-Services, baut darauf die API-Schicht auf, und schließt mit den Frontend-Komponenten ab. Jeder Schritt baut auf dem vorherigen auf und endet mit einer funktionierenden Integration.

Tech-Stack: Next.js (App Router), TypeScript, Prisma ORM, PostgreSQL, NextAuth.js, Tailwind CSS + shadcn/ui, Vitest + fast-check.

## Tasks

- [x] 1. Projektstruktur und Datenbank-Setup
  - [x] 1.1 Prisma Schema erstellen und Datenbank konfigurieren
    - Prisma initialisieren (`npx prisma init`)
    - `prisma/schema.prisma` erstellen mit `User`-Model (id, email, name, passwordHash, role, createdAt, updatedAt) und `LoginAttempt`-Model (id, email, success, ipAddress, createdAt, userId)
    - `Role`-Enum definieren (ADMIN, USER)
    - Indizes auf `LoginAttempt` (email, createdAt) setzen
    - `.env` mit `DATABASE_URL` konfigurieren
    - Migration ausführen (`npx prisma migrate dev`)
    - _Requirements: 1.1, 1.4, 2.4, 4.1_

  - [x] 1.2 Prisma Client Singleton und TypeScript-Typen erstellen
    - `lib/prisma.ts` mit globalem Prisma-Client-Singleton erstellen
    - `types/auth.ts` mit Interfaces erstellen: `CreateUserInput`, `UpdateUserInput`, `SetupInput`, `UserResponse`, `SessionUser`
    - _Requirements: 4.1, 5.2, 5.3_

- [x] 2. Core-Services implementieren
  - [x] 2.1 AuthService implementieren
    - `lib/services/auth-service.ts` erstellen
    - `hashPassword(password)` mit bcrypt (Salt Rounds: 12)
    - `verifyPassword(password, hash)` mit bcrypt.compare
    - `validateEmail(email)` mit Regex-Validierung
    - `validatePassword(password)` mit Mindestlänge 8 Zeichen
    - `authorize(email, password)` mit Rate-Limit-Check, User-Lookup und Passwort-Verifikation
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 2.2_

  - [x] 2.2 Property-Test: Passwort-Hashing-Integrität
    - **Property 4: Passwort-Hashing-Integrität**
    - Für jedes generierte Passwort: `hashPassword` erzeugt gültigen bcrypt-Hash, `verifyPassword(original, hash)` gibt `true` zurück
    - Test-Datei: `__tests__/auth/password-hashing.property.test.ts`
    - **Validates: Requirements 1.4**

  - [x] 2.3 Property-Test: Ungültige Registrierungsdaten werden abgelehnt
    - **Property 2: Ungültige Registrierungsdaten werden abgelehnt**
    - Für ungültige E-Mails und Passwörter < 8 Zeichen: Validierung schlägt fehl
    - Test-Datei: `__tests__/auth/registration.property.test.ts`
    - **Validates: Requirements 1.3, 1.5**

  - [x] 2.4 RateLimiter implementieren
    - `lib/services/rate-limiter.ts` erstellen
    - `checkRateLimit(email)`: Prüft ob 5+ fehlgeschlagene Versuche in den letzten 15 Minuten vorliegen
    - `recordFailedAttempt(email)`: Speichert fehlgeschlagenen Versuch in `LoginAttempt`
    - `resetAttempts(email)`: Löscht fehlgeschlagene Versuche nach erfolgreichem Login
    - _Requirements: 2.4_

  - [x] 2.5 Property-Test: Rate-Limiting bei Login-Versuchen
    - **Property 6: Rate-Limiting bei Login-Versuchen**
    - Nach 5 fehlgeschlagenen Versuchen innerhalb von 15 Minuten wird jeder weitere Versuch blockiert
    - Test-Datei: `__tests__/auth/rate-limiting.property.test.ts`
    - **Validates: Requirements 2.4**

  - [x] 2.6 UserService implementieren
    - `lib/services/user-service.ts` erstellen
    - `listUsers()`: Alle Benutzer ohne passwordHash zurückgeben
    - `getUserById(id)`: Einzelnen Benutzer laden
    - `createUser(data)`: Benutzer erstellen mit Passwort-Hashing und E-Mail-Duplikat-Check
    - `updateUser(id, data)`: Benutzer aktualisieren mit E-Mail-Duplikat-Check
    - `deleteUser(id, requestingUserId)`: Benutzer löschen mit Selbstlöschungs-Schutz
    - `resetPassword(id)`: Temporäres Passwort generieren, hashen und speichern
    - `isEmailTaken(email)`: E-Mail-Verfügbarkeit prüfen
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 2.7 Property-Test: E-Mail-Uniqueness
    - **Property 3: E-Mail-Uniqueness**
    - Für jede bereits existierende E-Mail: Erstellung eines weiteren Benutzers mit derselben E-Mail wird abgelehnt
    - Test-Datei: `__tests__/auth/email-uniqueness.property.test.ts`
    - **Validates: Requirements 1.2, 5.6**

  - [x] 2.8 Property-Test: Selbstlöschung durch Admin ist verboten
    - **Property 11: Selbstlöschung durch Admin ist verboten**
    - Für jeden Admin: Versuch den eigenen Account zu löschen wird abgelehnt, Benutzer existiert weiterhin
    - Test-Datei: `__tests__/admin/user-crud.property.test.ts`
    - **Validates: Requirements 5.5**

  - [x] 2.9 SetupService implementieren
    - `lib/services/setup-service.ts` erstellen
    - `isSetupRequired()`: Prüft ob mindestens ein Admin in der DB existiert
    - `createInitialAdmin(data)`: Erstellt den ersten Admin-Account mit Validierung
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 3. Checkpoint – Core-Services validieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

- [x] 4. NextAuth.js Konfiguration und Middleware
  - [x] 4.1 NextAuth.js konfigurieren
    - `auth.ts` (oder `lib/auth.ts`) erstellen mit NextAuth-Konfiguration
    - Credentials-Provider mit Delegation an `AuthService.authorize()`
    - JWT-Strategie mit 24h `maxAge` und 5min `updateAge` (Sliding Expiration)
    - `jwt`-Callback: Rolle in Token schreiben
    - `session`-Callback: Rolle aus Token in Session übertragen
    - Cookie-Optionen: `httpOnly: true`, `secure: true`, `sameSite: "strict"`
    - Custom Sign-In Page: `/login`
    - `app/api/auth/[...nextauth]/route.ts` Handler erstellen
    - _Requirements: 2.1, 3.1, 3.2, 3.5, 7.3, 7.4_

  - [x] 4.2 Property-Test: Session-Cookie-Sicherheitsattribute
    - **Property 15: Session-Cookie-Sicherheitsattribute**
    - Für jede Session: Cookie hat `HttpOnly`, `Secure` und `SameSite=Strict`
    - Test-Datei: `__tests__/auth/cookie-security.property.test.ts`
    - **Validates: Requirements 7.4**

  - [x] 4.3 Middleware für Route-Schutz implementieren
    - `middleware.ts` im Projekt-Root erstellen
    - Öffentliche Routen definieren: `/login`, `/register`, `/setup`, `/api/auth/*`, `/api/setup/*`
    - Geschützte Routen: Alle anderen Routen erfordern gültige Session
    - Admin-Routen: `/admin/*` und `/api/users/*` erfordern Rolle "ADMIN"
    - Redirect auf `/login` bei fehlender Session
    - HTTP 403 bei fehlender Admin-Berechtigung
    - _Requirements: 4.3, 4.4, 4.5, 7.1, 7.2_

  - [x] 4.4 Property-Test: Rollenbasierte Zugriffskontrolle
    - **Property 7: Rollenbasierte Zugriffskontrolle**
    - Ohne Session → 401, User auf Admin-Route → 403, Admin auf Admin-Route → Zugriff erlaubt
    - Test-Datei: `__tests__/auth/access-control.property.test.ts`
    - **Validates: Requirements 4.3, 4.4, 4.5, 7.1, 7.2**

- [x] 5. API-Routen implementieren
  - [x] 5.1 Registrierungs-API erstellen
    - `app/api/auth/register/route.ts` erstellen
    - POST-Handler: E-Mail/Passwort validieren, E-Mail-Duplikat prüfen, Benutzer erstellen
    - Fehlerbehandlung: 400 (Validierung), 409 (Duplikat), 500 (Server)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 5.2 Property-Test: Registrierungs-Round-Trip
    - **Property 1: Registrierungs-Round-Trip**
    - Für gültige E-Mail und Passwort: Nach Registrierung existiert Benutzer mit Rolle "USER", Login mit denselben Credentials erzeugt gültige Session
    - Test-Datei: `__tests__/auth/registration.property.test.ts`
    - **Validates: Requirements 1.1, 1.4, 2.1, 4.2**

  - [x] 5.3 Property-Test: Generische Fehlermeldung bei fehlgeschlagenem Login
    - **Property 5: Generische Fehlermeldung bei fehlgeschlagenem Login**
    - Für jede ungültige Credential-Kombination: Fehlermeldung ist identisch und verrät nicht ob E-Mail oder Passwort falsch war
    - Test-Datei: `__tests__/auth/login.property.test.ts`
    - **Validates: Requirements 2.2**

  - [x] 5.4 Setup-API erstellen
    - `app/api/setup/route.ts` erstellen (POST: Admin erstellen)
    - `app/api/setup/status/route.ts` erstellen (GET: Setup-Status prüfen)
    - POST: Nur wenn kein Admin existiert, sonst 302 Redirect
    - GET: Gibt `{ required: boolean }` zurück
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 5.5 Property-Test: Setup-Endpunkt-Verfügbarkeit
    - **Property 14: Setup-Endpunkt-Verfügbarkeit**
    - Setup-Endpunkt verfügbar genau dann wenn kein Admin existiert; mit Admin → Redirect auf Login
    - Test-Datei: `__tests__/setup/setup-availability.property.test.ts`
    - **Validates: Requirements 8.1, 8.3**

  - [x] 5.6 Admin-User-API erstellen
    - `app/api/users/route.ts` erstellen (GET: Liste, POST: Erstellen)
    - `app/api/users/[id]/route.ts` erstellen (PUT: Bearbeiten, DELETE: Löschen)
    - `app/api/users/[id]/reset-password/route.ts` erstellen (POST: Passwort zurücksetzen)
    - Alle Endpunkte erfordern Admin-Rolle (zusätzlich zur Middleware-Prüfung)
    - Fehlerbehandlung: 401, 403, 404, 409, 500
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 5.7 Property-Tests: Admin-User-CRUD
    - **Property 8: Admin-User-CRUD-Round-Trip (Erstellen)**
    - **Property 9: Admin-User-CRUD-Round-Trip (Bearbeiten)**
    - **Property 10: Löschen entfernt Benutzer**
    - Erstellen → Benutzer abrufbar mit korrekten Daten; Bearbeiten → neue Werte gespeichert, ungeänderte Felder bleiben; Löschen → Benutzer nicht mehr auffindbar
    - Test-Datei: `__tests__/admin/user-crud.property.test.ts`
    - **Validates: Requirements 5.2, 5.3, 5.4**

  - [x] 5.8 Property-Test: Passwort-Reset-Round-Trip
    - **Property 12: Passwort-Reset-Round-Trip**
    - Nach Reset: Temporäres Passwort funktioniert für Login, altes Passwort nicht mehr
    - Test-Datei: `__tests__/admin/password-reset.property.test.ts`
    - **Validates: Requirements 5.7**

- [x] 6. Checkpoint – API-Schicht validieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

- [x] 7. Auth-Frontend-Seiten implementieren
  - [x] 7.1 Auth-Layout und gemeinsame Komponenten erstellen
    - `app/(auth)/layout.tsx` erstellen: Zentriertes, responsives Layout (320px–2560px)
    - Einspaltiges Layout unter 768px Breite
    - Formularelemente mit Mindestgröße 44x44px für Touch
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 7.2 Login-Seite implementieren
    - `app/(auth)/login/page.tsx` erstellen
    - Formular mit E-Mail- und Passwort-Feld
    - Fehleranzeige direkt am Feld (generische Meldung bei fehlgeschlagenem Login)
    - Redirect auf Hauptseite nach erfolgreichem Login
    - Link zur Registrierungsseite
    - ARIA-Labels auf allen Formularfeldern
    - _Requirements: 2.1, 2.2, 2.3, 6.4, 6.5_

  - [x] 7.3 Registrierungsseite implementieren
    - `app/(auth)/register/page.tsx` erstellen
    - Formular mit E-Mail-, Name- und Passwort-Feld
    - Client-seitige Validierung (E-Mail-Format, Passwort ≥ 8 Zeichen)
    - Fehleranzeige direkt am Feld
    - Bestätigungsmeldung nach erfolgreicher Registrierung
    - ARIA-Labels auf allen Formularfeldern
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 6.4, 6.5_

  - [x] 7.4 Setup-Seite implementieren
    - `app/(auth)/setup/page.tsx` erstellen
    - Prüfung via `/api/setup/status` ob Setup nötig ist, sonst Redirect auf `/login`
    - Formular mit E-Mail-, Name- und Passwort-Feld für initialen Admin
    - Nach Erstellung Redirect auf Login-Seite
    - ARIA-Labels auf allen Formularfeldern
    - _Requirements: 8.1, 8.2, 8.3, 6.5_

  - [x] 7.5 Property-Test: ARIA-Labels auf Formularfeldern
    - **Property 13: ARIA-Labels auf Formularfeldern**
    - Für jedes Formularfeld in der Auth-UI: `aria-label` oder `aria-labelledby` vorhanden
    - Test-Datei: `__tests__/ui/auth-accessibility.property.test.ts`
    - **Validates: Requirements 6.5**

- [x] 8. Admin-Panel implementieren
  - [x] 8.1 Admin-Layout erstellen
    - `app/(admin)/layout.tsx` erstellen mit Navigation und Admin-Bereich-Styling
    - Logout-Button in der Navigation
    - _Requirements: 4.4, 3.3_

  - [x] 8.2 Benutzerliste im Admin-Panel implementieren
    - `app/(admin)/admin/users/page.tsx` erstellen
    - Tabelle mit allen Benutzern (E-Mail, Name, Rolle, Erstellungsdatum)
    - Button zum Erstellen neuer Benutzer
    - Aktionen pro Zeile: Bearbeiten, Passwort zurücksetzen, Löschen
    - _Requirements: 5.1_

  - [x] 8.3 User-Create-Dialog implementieren
    - `components/admin/user-create-dialog.tsx` erstellen
    - shadcn/ui Dialog mit Formular (E-Mail, Name, Passwort, Rolle)
    - Validierung und Fehleranzeige (E-Mail-Duplikat, Passwort zu kurz)
    - _Requirements: 5.2, 5.6_

  - [x] 8.4 User-Edit-Dialog implementieren
    - `components/admin/user-edit-dialog.tsx` erstellen
    - shadcn/ui Dialog mit vorausgefülltem Formular (E-Mail, Name, Rolle)
    - _Requirements: 5.3_

  - [x] 8.5 User-Delete-Dialog implementieren
    - `components/admin/user-delete-dialog.tsx` erstellen
    - shadcn/ui Bestätigungsdialog mit Warnung
    - Selbstlöschungs-Schutz: Button deaktiviert wenn eigener Account
    - _Requirements: 5.4, 5.5_

  - [x] 8.6 Passwort-Reset-Funktion implementieren
    - Passwort-Reset-Button in der Benutzerliste
    - Bestätigungsdialog, danach Anzeige des temporären Passworts
    - _Requirements: 5.7_

- [x] 9. Session-Management und Logout
  - [x] 9.1 Logout-Funktionalität implementieren
    - Logout-Button im App-Layout (Header/Navigation)
    - NextAuth `signOut()` aufrufen, Session beenden
    - Redirect auf Login-Seite nach Logout
    - _Requirements: 3.3_

  - [x] 9.2 Session-Ablauf-Handling implementieren
    - Automatischer Redirect auf Login-Seite bei abgelaufener Session
    - Meldung "Sitzung abgelaufen" auf der Login-Seite anzeigen
    - _Requirements: 3.4_

- [x] 10. Abschluss-Checkpoint – Gesamtsystem validieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften (15 Properties aus dem Design)
- Unit Tests validieren spezifische Beispiele und Edge Cases
- Die Implementierungssprache ist TypeScript durchgängig
