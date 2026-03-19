# Implementierungsplan: Admin Audit & Server-Fehler Log

## Übersicht

Schrittweise Implementierung des Audit-Log- und Server-Fehler-Log-Features: Prisma-Modelle, Log-Service, API-Endpunkte, Admin-Seite mit Tab-Navigation, Filterung und Paginierung. Jeder Schritt baut auf dem vorherigen auf und endet mit der Integration in bestehende API-Routes.

## Tasks

- [ ] 1. Prisma-Modelle und Datenbankschema erweitern
  - [ ] 1.1 `AuditLog`-Modell, `ServerError`-Modell und `ErrorSeverity`-Enum in `prisma/schema.prisma` hinzufügen
    - `AuditLog` mit Feldern: id, action, actorId, targetEntity, targetId, details (Json), ipAddress, createdAt
    - Relation `actor` auf `User` mit `onDelete: SetNull`
    - Index auf `[action, createdAt]`, `@@map("audit_logs")`
    - `ErrorSeverity`-Enum mit `ERROR`, `WARN`, `FATAL`
    - `ServerError` mit Feldern: id, severity, message, stackTrace, apiPath, httpMethod, statusCode, userId, createdAt
    - Relation `user` auf `User` mit `onDelete: SetNull`
    - Index auf `[severity, createdAt]`, `@@map("server_errors")`
    - Zwei neue Relationen im `User`-Modell: `auditLogs AuditLog[]` und `serverErrors ServerError[]`
    - Prisma-Migration ausführen
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 2. Log-Service implementieren
  - [ ] 2.1 `src/lib/services/log-service.ts` erstellen mit TypeScript-Interfaces und Aktionstyp-Konstanten
    - `AuditLogEntry`, `LogAuditParams`, `ServerErrorEntry`, `LogServerErrorParams`, `PaginatedResponse<T>` Interfaces
    - Aktionstyp-Konstanten: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`, `SETTING_CHANGED`, `ACCOUNT_STATUS_CHANGED`
    - _Requirements: 1.6, 2.3_

  - [ ] 2.2 `logAudit(params)` und `logServerError(params)` Funktionen implementieren
    - Fire-and-Forget-Muster: DB-Fehler abfangen und via `console.error` loggen, keine Exception werfen
    - Prisma `create` für jeweiliges Modell
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.4_

  - [ ] 2.3 `getAuditLogs({ page, limit, action? })` und `getServerErrors({ page, limit, severity? })` implementieren
    - Paginierung mit `skip`/`take`, absteigend nach `createdAt` sortiert
    - Optionaler Filter auf `action` bzw. `severity`
    - Rückgabe: `{ entries, total, page, limit }`
    - Audit-Logs mit `actor`-Relation (id, name, email) includen
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 4.1, 4.4, 4.5, 4.6_

  - [ ]* 2.4 Property-Test: Audit-Log Round-Trip
    - **Property 1: Audit-Log Round-Trip**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
    - Datei: `__tests__/admin/audit-log-roundtrip.property.test.ts`

  - [ ]* 2.5 Property-Test: Server-Fehler-Log Round-Trip
    - **Property 2: Server-Fehler-Log Round-Trip**
    - **Validates: Requirements 2.1, 2.2, 2.3**
    - Datei: `__tests__/admin/server-error-roundtrip.property.test.ts`

  - [ ]* 2.6 Property-Test: Log-Service Fehlerresilienz
    - **Property 3: Log-Service Fehlerresilienz**
    - **Validates: Requirements 2.4**
    - Datei: `__tests__/admin/log-error-resilience.property.test.ts`

- [ ] 3. Checkpoint – Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. API-Endpunkte implementieren
  - [ ] 4.1 `src/app/api/audit-log/route.ts` – GET-Endpunkt erstellen
    - `getAdminSession()` für Authentifizierung/Autorisierung (401/403)
    - Query-Parameter: `page`, `limit`, `action` (optional)
    - Standardwerte: page=1, limit=25; ungültige Werte auf Standardwerte zurücksetzen
    - `getAuditLogs` aus Log-Service aufrufen und JSON-Response zurückgeben
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.3_

  - [ ] 4.2 `src/app/api/server-errors/route.ts` – GET-Endpunkt erstellen
    - `getAdminSession()` für Authentifizierung/Autorisierung (401/403)
    - Query-Parameter: `page`, `limit`, `severity` (optional)
    - Standardwerte: page=1, limit=25; ungültige Werte auf Standardwerte zurücksetzen
    - `getServerErrors` aus Log-Service aufrufen und JSON-Response zurückgeben
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.3_

  - [ ]* 4.3 Property-Test: Zugriffsschutz der Log-APIs
    - **Property 7: Zugriffsschutz der Log-APIs**
    - **Validates: Requirements 3.2, 3.3, 4.2, 4.3, 7.3**
    - Datei: `__tests__/admin/log-access-control.property.test.ts`

  - [ ]* 4.4 Property-Test: Filterung liefert nur passende Einträge
    - **Property 4: Filterung liefert nur passende Einträge**
    - **Validates: Requirements 3.4, 4.4**
    - Datei: `__tests__/admin/log-filter.property.test.ts`

  - [ ]* 4.5 Property-Test: Paginierung liefert korrekte Teilmenge
    - **Property 5: Paginierung liefert korrekte Teilmenge**
    - **Validates: Requirements 3.5, 4.5**
    - Datei: `__tests__/admin/log-pagination.property.test.ts`

  - [ ]* 4.6 Property-Test: Absteigende Zeitstempel-Sortierung
    - **Property 6: Absteigende Zeitstempel-Sortierung**
    - **Validates: Requirements 3.6, 4.6**
    - Datei: `__tests__/admin/log-sort-order.property.test.ts`

  - [ ]* 4.7 Unit-Tests für API-Endpunkte
    - Dateien: `__tests__/admin/audit-log-api.test.ts`, `__tests__/admin/server-error-api.test.ts`
    - Edge Cases: ungültige Query-Parameter, leere Ergebnisse, Fehlerbehandlung
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_

- [ ] 5. Checkpoint – Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Admin Log-Seite mit Tab-Navigation, Filterung und Paginierung
  - [ ] 6.1 `src/app/(admin)/admin/logs/page.tsx` erstellen – Client-Komponente mit Tab-Navigation
    - "use client" Direktive
    - Zwei Tabs: "Audit Log" (Standard) und "Server-Fehler"
    - State für aktiven Tab, Daten, Ladestand, Fehler, Paginierung und Filter
    - Fetch von `/api/audit-log` bzw. `/api/server-errors` je nach aktivem Tab
    - Fehlermeldung "Logs konnten nicht geladen werden." bei Netzwerkfehler
    - _Requirements: 5.1, 5.2, 5.6_

  - [ ] 6.2 Audit-Log-Tabelle implementieren
    - Tabelle im bestehenden Stil (rounded borders, gray-50 header, divide-y rows, hover states)
    - Spalten: Zeitstempel, Aktion, Akteur (Name/E-Mail), Ziel, Details
    - Dropdown-Filter für Aktionstyp (alle Aktionstypen + "Alle")
    - _Requirements: 5.3, 6.1_

  - [ ] 6.3 Server-Fehler-Tabelle implementieren
    - Tabelle im bestehenden Stil
    - Spalten: Zeitstempel, Schweregrad, Nachricht, API-Pfad, Statuscode
    - Dropdown-Filter für Schweregrad (ERROR, WARN, FATAL + "Alle")
    - _Requirements: 5.4, 6.2_

  - [ ] 6.4 Paginierung implementieren
    - "Zurück"- und "Weiter"-Buttons mit Deaktivierung an den Grenzen
    - Anzeige: aktuelle Seite / Gesamtseiten
    - 25 Einträge pro Seite
    - Filter-Änderung setzt Seite auf 1 zurück
    - _Requirements: 6.3, 6.4, 6.5, 6.6_

  - [ ]* 6.5 Property-Test: Filter-Reset auf Seite 1
    - **Property 8: Filter-Reset auf Seite 1**
    - **Validates: Requirements 6.5**
    - Datei: `__tests__/admin/log-filter-reset.property.test.ts`

- [ ] 7. Navigation erweitern
  - [ ] 7.1 "Logs"-Link in `src/app/(admin)/layout.tsx` hinzufügen
    - Nach "Vocal Tags" einfügen
    - Aktive Hervorhebung mit `pathname?.startsWith("/admin/logs")`
    - Bestehenden Stil der anderen Links übernehmen
    - _Requirements: 5.5_

- [ ] 8. Audit-Logging in bestehende API-Routes integrieren
  - [ ] 8.1 Login-Audit-Logging integrieren
    - In der Login-API-Route `logAudit` mit `LOGIN_SUCCESS` bzw. `LOGIN_FAILED` aufrufen
    - _Requirements: 1.1, 1.2_

  - [ ] 8.2 Benutzer-CRUD-Audit-Logging integrieren
    - In den User-API-Routes `logAudit` mit `USER_CREATED`, `USER_UPDATED`, `USER_DELETED` aufrufen
    - Akteur-ID, Ziel-Benutzer-ID und relevante Details übergeben
    - _Requirements: 1.3_

  - [ ] 8.3 Einstellungs-Audit-Logging integrieren
    - In der Settings-API-Route `logAudit` mit `SETTING_CHANGED` aufrufen
    - Einstellungsschlüssel und neuen Wert in Details übergeben
    - _Requirements: 1.4_

  - [ ] 8.4 Kontostatus-Audit-Logging integrieren
    - In der Account-Status-API-Route `logAudit` mit `ACCOUNT_STATUS_CHANGED` aufrufen
    - Akteur-ID, Ziel-Benutzer-ID und neuen Status übergeben
    - _Requirements: 1.5_

  - [ ]* 8.5 Unit-Tests für Log-Service-Integration
    - Datei: `__tests__/admin/log-service.test.ts`
    - Testen, dass `logAudit` mit korrekten Parametern für jeden Aktionstyp aufgerufen wird
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 9. Abschluss-Checkpoint – Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachvollziehbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften
- Unit-Tests validieren spezifische Beispiele und Edge Cases
