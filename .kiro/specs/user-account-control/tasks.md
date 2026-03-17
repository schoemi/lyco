# Implementierungsplan: Benutzerkonto-Steuerung (Sperren & Bestätigung)

## Übersicht

Schrittweise Implementierung der Benutzerkonto-Steuerung: Zuerst Datenmodell und Typen, dann Service-Layer, Auth-Anpassungen, API-Routen, Middleware und schließlich Frontend-Komponenten. Jeder Schritt baut auf dem vorherigen auf und wird durch Property-Tests und Unit-Tests abgesichert.

## Tasks

- [x] 1. Prisma-Schema erweitern und Typen anpassen
  - [x] 1.1 AccountStatus-Enum und accountStatus-Feld zum User-Modell hinzufügen
    - `AccountStatus`-Enum (`ACTIVE`, `SUSPENDED`, `PENDING`) in `prisma/schema.prisma` erstellen
    - `accountStatus`-Feld mit Default `ACTIVE` zum `User`-Modell hinzufügen
    - `SystemSetting`-Modell mit `id`, `key` (unique), `value`, `updatedAt` erstellen
    - Prisma-Migration generieren und anwenden
    - _Anforderungen: 1.1_

  - [x] 1.2 TypeScript-Typen in `src/types/auth.ts` erweitern
    - `AccountStatus`-Typ exportieren
    - `UserResponse` um `accountStatus` erweitern
    - `SessionUser` um `accountStatus` erweitern
    - `StatusChangeInput` und `SystemSettingResponse` Interfaces hinzufügen
    - _Anforderungen: 1.1_

- [x] 2. Service-Layer implementieren
  - [x] 2.1 `SystemSettingService` in `src/lib/services/system-setting-service.ts` erstellen
    - `getRequireApproval()`: Liest die Bestätigungspflicht-Einstellung aus der DB (Default: `false`)
    - `setRequireApproval(value: boolean)`: Speichert die Einstellung per Upsert
    - _Anforderungen: 4.2, 4.3, 4.4_

  - [x] 2.2 Property-Test: Bestätigungspflicht-Einstellung Round-Trip
    - **Property 8: Bestätigungspflicht-Einstellung Round-Trip**
    - Datei: `__tests__/admin/system-settings.property.test.ts`
    - **Validiert: Anforderungen 4.3, 4.4**

  - [x] 2.3 `UserService` um Statusverwaltungs-Methoden erweitern in `src/lib/services/user-service.ts`
    - `suspendUser(id, requestingUserId)`: Sperrt Benutzer, verhindert Selbstsperrung
    - `activateUser(id)`: Setzt Status auf ACTIVE (für Entsperren und Bestätigen)
    - `approveUser(id)`: Alias für activateUser bei PENDING-Benutzern
    - `rejectUser(id)`: Löscht den PENDING-Benutzer aus der DB
    - `getPendingCount()`: Zählt Benutzer mit Status PENDING
    - `getUserAccountStatus(id)`: Gibt den accountStatus eines Benutzers zurück
    - _Anforderungen: 2.1, 2.2, 2.3, 2.5, 5.2, 5.3_

  - [x] 2.4 Property-Tests für Kontostatus-Operationen
    - Datei: `__tests__/admin/account-status.property.test.ts`
    - **Property 1: Admin-Erstellung setzt Status ACTIVE** — Validiert: Anforderung 1.2
    - **Property 3: Sperren setzt Status SUSPENDED** — Validiert: Anforderung 2.1
    - **Property 4: Entsperren/Bestätigen setzt Status ACTIVE** — Validiert: Anforderungen 2.2, 2.5, 5.2
    - **Property 5: Selbstsperrung ist verboten** — Validiert: Anforderung 2.3
    - **Property 10: Ablehnung entfernt Benutzer** — Validiert: Anforderung 5.3

  - [x] 2.5 Property-Test: Ausstehend-Zähler
    - **Property 9: Ausstehend-Zähler entspricht tatsächlicher Anzahl**
    - Datei: `__tests__/admin/pending-count.property.test.ts`
    - **Validiert: Anforderung 5.1**

- [x] 3. Auth-System anpassen
  - [x] 3.1 `AuthService.authorize()` in `src/lib/auth.config.ts` erweitern
    - Kontostatus vor Passwort-Prüfung abfragen
    - Bei `SUSPENDED`: Fehler mit Meldung "Ihr Konto wurde gesperrt. Bitte wenden Sie sich an den Administrator."
    - Bei `PENDING`: Fehler mit Meldung "Ihr Konto wartet auf Freigabe durch einen Administrator."
    - Bei `ACTIVE`: Bisheriges Verhalten (Passwort prüfen)
    - `accountStatus` im zurückgegebenen User-Objekt mitgeben
    - _Anforderungen: 3.1, 3.2, 3.3_

  - [x] 3.2 JWT- und Session-Callbacks in `src/lib/auth.config.ts` erweitern
    - `jwt`-Callback: `accountStatus` ins Token schreiben, bei Token-Refresh aus DB nachladen
    - `session`-Callback: `accountStatus` in die Session übernehmen
    - _Anforderungen: 3.4_

  - [x] 3.3 Property-Test: Login-Ergebnis abhängig vom Kontostatus
    - **Property 6: Login-Ergebnis abhängig vom Kontostatus**
    - Datei: `__tests__/auth/login-status.property.test.ts`
    - **Validiert: Anforderungen 3.1, 3.2, 3.3**

  - [x] 3.4 Registrierungs-Route `src/app/api/auth/register/route.ts` erweitern
    - `SystemSettingService.getRequireApproval()` aufrufen
    - Bei `true`: User mit `accountStatus: PENDING` erstellen, Hinweismeldung in Response
    - Bei `false`: Bisheriges Verhalten (`accountStatus: ACTIVE`)
    - _Anforderungen: 1.3, 1.4, 4.5_

  - [x] 3.5 Property-Test: Registrierungs-Status abhängig von Bestätigungspflicht
    - **Property 2: Registrierungs-Status abhängig von Bestätigungspflicht**
    - Datei: `__tests__/auth/registration-status.property.test.ts`
    - **Validiert: Anforderungen 1.3, 1.4, 4.5**

- [x] 4. Checkpoint – Basis-Logik prüfen
  - Sicherstellen, dass alle bisherigen Tests bestehen, den Benutzer bei Fragen konsultieren.

- [ ] 5. Middleware und Session-Invalidierung
  - [-] 5.1 Middleware in `src/middleware.ts` erweitern
    - `accountStatus` aus dem JWT-Token lesen
    - Bei `accountStatus != ACTIVE`: Session löschen und Redirect auf `/login`
    - _Anforderungen: 3.4_

  - [~] 5.2 Property-Test: Aktive Session-Invalidierung bei Sperrung
    - **Property 7: Aktive Session-Invalidierung bei Sperrung**
    - Datei: `__tests__/middleware/session-invalidation.property.test.ts`
    - **Validiert: Anforderung 3.4**

  - [~] 5.3 Unit-Test: Middleware Status-Check
    - Datei: `__tests__/middleware/status-check.test.ts`
    - Testen: Session-Invalidierung bei gesperrtem Konto, Weiterleitung bei PENDING
    - _Anforderungen: 3.4_

- [ ] 6. API-Routen implementieren
  - [~] 6.1 `PATCH /api/users/[id]/status` Route erstellen
    - Admin-Auth prüfen, Selbstsperrung verhindern
    - `UserService.suspendUser()` oder `UserService.activateUser()` aufrufen
    - Fehlerbehandlung: 401, 403, 404, 400
    - _Anforderungen: 2.1, 2.2, 2.3, 2.5, 6.1, 6.3, 6.4_

  - [~] 6.2 `POST /api/users/[id]/approve` und `POST /api/users/[id]/reject` Routen erstellen
    - Admin-Auth prüfen
    - `UserService.approveUser()` bzw. `UserService.rejectUser()` aufrufen
    - Fehlerbehandlung: 401, 403, 404
    - _Anforderungen: 5.2, 5.3, 6.1, 6.3_

  - [~] 6.3 `GET /api/users/pending/count` Route erstellen
    - Admin-Auth prüfen
    - `UserService.getPendingCount()` aufrufen
    - _Anforderungen: 5.1, 6.1, 6.3_

  - [~] 6.4 `GET/PUT /api/settings/require-approval` Route erstellen
    - Admin-Auth prüfen
    - `SystemSettingService.getRequireApproval()` / `setRequireApproval()` aufrufen
    - Fehlerbehandlung: 401, 403, 400
    - _Anforderungen: 4.1, 4.3, 4.4, 6.2, 6.3_

  - [~] 6.5 Property-Test: API-Zugriffskontrolle
    - **Property 11: API-Zugriffskontrolle für Kontostatus-Operationen**
    - Datei: `__tests__/admin/status-access-control.property.test.ts`
    - **Validiert: Anforderungen 6.1, 6.2, 6.3**

  - [~] 6.6 Unit-Tests für API-Endpunkte
    - `__tests__/admin/account-status-api.test.ts`: Sperren, Entsperren, Bestätigen, Ablehnen
    - `__tests__/admin/settings-api.test.ts`: Bestätigungspflicht lesen/schreiben
    - `__tests__/admin/pending-count-api.test.ts`: Ausstehend-Zähler
    - `__tests__/auth/register-pending.test.ts`: Registrierung mit Bestätigungspflicht
    - _Anforderungen: 2.1, 2.2, 2.3, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_

- [~] 7. Checkpoint – Backend komplett prüfen
  - Sicherstellen, dass alle bisherigen Tests bestehen, den Benutzer bei Fragen konsultieren.

- [ ] 8. Frontend-Komponenten implementieren
  - [~] 8.1 `StatusBadge`-Komponente in `src/components/admin/status-badge.tsx` erstellen
    - Farblich gekennzeichnetes Badge: ACTIVE=grün, SUSPENDED=rot, PENDING=gelb
    - Deutsche Labels: "Aktiv", "Gesperrt", "Ausstehend"
    - _Anforderungen: 2.4_

  - [~] 8.2 Property-Test: StatusBadge-Rendering
    - **Property 12: StatusBadge-Rendering**
    - Datei: `__tests__/admin/status-badge.property.test.ts`
    - **Validiert: Anforderung 2.4**

  - [~] 8.3 `UserStatusActions`-Komponente in `src/components/admin/user-status-actions.tsx` erstellen
    - Sperren/Entsperren-Buttons für ACTIVE/SUSPENDED Benutzer
    - Bestätigen/Ablehnen-Buttons für PENDING Benutzer
    - Selbstsperrung visuell verhindern (Button deaktiviert für eigenen Account)
    - _Anforderungen: 2.1, 2.2, 2.3, 2.5, 5.2, 5.3, 5.4_

  - [~] 8.4 `RejectUserDialog`-Komponente in `src/components/admin/reject-user-dialog.tsx` erstellen
    - Bestätigungsdialog vor dem Ablehnen (Löschen) eines ausstehenden Benutzers
    - _Anforderungen: 5.3_

  - [~] 8.5 `PendingCountBadge`-Komponente in `src/components/admin/pending-count-badge.tsx` erstellen
    - Badge mit Anzahl ausstehender Benutzer, Polling oder SWR für Aktualisierung
    - _Anforderungen: 5.1_

  - [~] 8.6 `AdminUsersPage` in `src/app/(admin)/admin/users/page.tsx` erweitern
    - `StatusBadge` in der Benutzerliste anzeigen
    - `UserStatusActions` pro Benutzer einbinden
    - _Anforderungen: 2.4, 5.4_

  - [~] 8.7 `AdminSettingsPage` in `src/app/(admin)/admin/settings/page.tsx` erstellen
    - Toggle für Bestätigungspflicht mit `GET/PUT /api/settings/require-approval`
    - _Anforderungen: 4.1_

  - [~] 8.8 `AdminLayout` in `src/app/(admin)/layout.tsx` erweitern
    - "Einstellungen"-Link in der Navigation hinzufügen
    - `PendingCountBadge` neben "Benutzer"-Link einbinden
    - _Anforderungen: 5.1_

- [~] 9. Abschluss-Checkpoint – Alle Tests bestehen
  - Sicherstellen, dass alle Tests bestehen, den Benutzer bei Fragen konsultieren.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints sichern inkrementelle Validierung
- Property-Tests validieren universelle Korrektheitseigenschaften
- Unit-Tests validieren spezifische Beispiele und Edge Cases
