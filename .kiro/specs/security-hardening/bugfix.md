# Bugfix: Security Hardening – Pentest-Findings 3–9

## Kontext

Bei der Pentest-Vorbereitung für Lyco wurden mehrere Schwachstellen identifiziert. Die Punkte 1 (unauthentifizierte Upload-Endpunkte) und 2 (ZIP-Bomb-Schutz) sind bereits adressiert. Dieses Dokument beschreibt die verbleibenden Findings 3–9.

---

## Finding 3: Setup-Endpunkt Race Condition

### Problem
Der `/api/setup`-Endpunkt prüft mit `isSetupRequired()` ob bereits ein Admin existiert und erstellt dann einen neuen Admin. Zwischen Check und Create liegt eine Zeitlücke (TOCTOU – Time of Check, Time of Use). Bei gleichzeitigen Requests könnten mehrere Admin-Accounts mit unterschiedlichen E-Mail-Adressen erstellt werden.

### Betroffene Dateien
- `src/lib/services/setup-service.ts` – `createInitialAdmin()`

### Anforderungen
- **3.1** Die Prüfung `isSetupRequired()` und die Admin-Erstellung MÜSSEN atomar in einer Prisma-Transaktion mit serialisierbarer Isolation erfolgen.
- **3.2** Innerhalb der Transaktion MUSS erneut geprüft werden, ob bereits ein Admin existiert. Falls ja, MUSS ein Fehler geworfen werden.
- **3.3** Bestehende Tests und das Verhalten bei bereits abgeschlossenem Setup DÜRFEN sich nicht ändern.

### Lösungsansatz
`createInitialAdmin()` in eine `prisma.$transaction()` mit `isolationLevel: "Serializable"` wrappen. Der Admin-Count-Check erfolgt innerhalb der Transaktion.

---

## Finding 4: Fehlende Security-Headers

### Problem
Die Anwendung sendet keine Security-Headers. Dadurch ist sie anfällig für:
- **Clickjacking** (kein `X-Frame-Options`)
- **MIME-Sniffing** (kein `X-Content-Type-Options`)
- **Downgrade-Angriffe** (kein `Strict-Transport-Security`)
- **Referrer-Leaks** (kein `Referrer-Policy`)
- **Fehlende CSP-Baseline** (kein `Content-Security-Policy`)

### Betroffene Dateien
- `next.config.ts`

### Anforderungen
- **4.1** In `next.config.ts` MUSS eine `headers()`-Funktion definiert werden, die für alle Routen (`/(.*)`  ) folgende Header setzt:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (nur wenn `NODE_ENV === "production"` oder immer mit Hinweis, dass dies nur über HTTPS wirkt)
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **4.2** Ein grundlegender `Content-Security-Policy`-Header SOLL hinzugefügt werden. Mindestens: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self';`. Die CSP muss mit den tatsächlich genutzten externen Ressourcen (Spotify-Embeds, YouTube-Embeds etc.) kompatibel sein – ggf. Domains ergänzen.
- **4.3** Die bestehende Funktionalität der Anwendung DARF durch die Header nicht eingeschränkt werden. Insbesondere Audio-Streaming, Cover-Bilder und TipTap-Editor müssen weiterhin funktionieren.

---

## Finding 5: Admin-Middleware-Lücke

### Problem
Die Middleware (`middleware.ts`) schützt nur `/admin` (Seiten) und `/api/users` (API) als Admin-Routen. Folgende Admin-API-Endpunkte werden von der Middleware NICHT als Admin-Routen erkannt:
- `/api/admin/files` und `/api/admin/files/[filename]`
- `/api/settings/require-approval`
- `/api/settings/themes` und Unter-Routen (`/api/settings/themes/[id]`, `/api/settings/themes/import`)
- `/api/settings/theme` (globales Theme)
- `/api/server-errors`
- `/api/audit-log`

Diese Endpunkte haben zwar eigene `getAdminSession()`-Checks im Route-Handler, aber die Middleware bietet keine zusätzliche Schutzschicht. Ein vergessener Check bei einem neuen Endpunkt wäre sofort ausnutzbar.

### Betroffene Dateien
- `middleware.ts` – `isAdminRoute()` und die Konstanten `adminApiPrefix`

### Anforderungen
- **5.1** Die Middleware MUSS alle Admin-API-Prefixe abdecken. Die Konstante `adminApiPrefix` MUSS zu einem Array erweitert werden:
  ```
  /api/users
  /api/admin
  /api/settings
  /api/server-errors
  /api/audit-log
  ```
- **5.2** Die Funktion `isAdminRoute()` MUSS gegen alle Prefixe prüfen.
- **5.3** Die bestehenden `getAdminSession()`-Checks in den Route-Handlern SOLLEN als Defense-in-Depth beibehalten werden.
- **5.4** Der öffentliche Endpunkt `/api/settings/theme` (GET, für Theme-Auswahl durch normale User) MUSS weiterhin für authentifizierte Nicht-Admin-User erreichbar sein, falls er nicht admin-only ist. Prüfen, ob dieser Endpunkt tatsächlich nur für Admins gedacht ist, und ggf. aus der Admin-Middleware ausnehmen.

---

## Finding 6: Fehlende IP-Adresse im Audit-Log

### Problem
Das `AuditLog`-Schema hat ein `ipAddress`-Feld, aber es wird bei keinem Audit-Log-Eintrag befüllt. Bei einem Sicherheitsvorfall fehlt die forensische Nachvollziehbarkeit.

### Betroffene Dateien
- `src/lib/services/log-service.ts` – `logAudit()`-Funktion
- Alle Aufrufer von `logAudit()` in API-Route-Handlern (Login, User-CRUD, Account-Status-Änderungen)

### Anforderungen
- **6.1** Die `logAudit()`-Funktion MUSS einen optionalen `ipAddress`-Parameter akzeptieren.
- **6.2** In allen API-Route-Handlern, die `logAudit()` aufrufen, MUSS die IP-Adresse aus dem Request extrahiert werden. Reihenfolge: `x-forwarded-for`-Header (erster Wert), dann `x-real-ip`, dann Fallback auf `request.ip` oder `"unknown"`.
- **6.3** Mindestens folgende Aktionen MÜSSEN die IP-Adresse loggen:
  - Login (Erfolg und Fehlschlag)
  - User-Erstellung, -Änderung, -Löschung
  - Account-Status-Änderungen (Approve, Reject, Suspend)
  - Passwort-Reset-Anfragen
- **6.4** Bestehende Audit-Log-Einträge ohne IP-Adresse DÜRFEN nicht verändert werden (Feld bleibt nullable).

---

## Finding 7: Kein Rate-Limiting auf Upload-Endpunkten

### Problem
Die Audio-Upload- und Cover-Upload-Endpunkte haben kein Rate-Limiting. Ein authentifizierter Nutzer könnte durch massenhaftes Hochladen den Speicherplatz des Servers erschöpfen (Denial of Service).

### Betroffene Dateien
- `src/app/api/songs/[id]/audio-quellen/upload/route.ts`
- `src/app/api/songs/[id]/cover/upload/route.ts`

### Anforderungen
- **7.1** Upload-Endpunkte MÜSSEN ein Rate-Limit pro User implementieren: maximal **20 Uploads pro 15 Minuten** pro User.
- **7.2** Bei Überschreitung MUSS HTTP 429 (Too Many Requests) mit einem `Retry-After`-Header zurückgegeben werden.
- **7.3** Das Rate-Limiting SOLL analog zum bestehenden Login-Rate-Limiter über die Datenbank oder einen In-Memory-Counter implementiert werden. Ein einfacher In-Memory-Ansatz (Map mit userId → Timestamps) ist akzeptabel, da die Anwendung single-instance läuft.
- **7.4** Admins SOLLEN vom Rate-Limit ausgenommen sein (optional, je nach Nutzungsmuster).

---

## Finding 8: Session-Fixation / JWT-Härtung

### Problem
Die JWT-Session-Konfiguration ist grundsätzlich solide (httpOnly, secure, sameSite=lax), aber es fehlen zusätzliche Härtungsmaßnahmen:
- Kein expliziter Check, ob der `accountStatus` im JWT noch aktuell ist (JWT könnte veraltet sein, wenn ein Admin den Account zwischenzeitlich sperrt).
- Die Middleware prüft `accountStatus` aus dem JWT-Token, aber der Token wird nur alle 5 Minuten (`updateAge: 60 * 5`) aktualisiert. In diesem Fenster könnte ein gesperrter User weiter agieren.

### Betroffene Dateien
- `src/lib/auth.config.ts` – JWT-Callbacks
- `middleware.ts` – Account-Status-Prüfung

### Anforderungen
- **8.1** Das `updateAge` in der Session-Konfiguration SOLL auf **60 Sekunden** reduziert werden, um das Fenster für veraltete Account-Status-Informationen zu minimieren.
- **8.2** Der `jwt`-Callback SOLL bei Token-Refresh (wenn `trigger === "update"` oder kein `user`-Objekt vorhanden) den aktuellen `accountStatus` aus der Datenbank laden. HINWEIS: Dies erfordert einen DB-Zugriff im JWT-Callback, was die Edge-Kompatibilität beeinträchtigt. Falls die Middleware auf Edge läuft, MUSS eine alternative Lösung gefunden werden (z.B. ein separater API-Call oder ein kürzeres `maxAge`).
- **8.3** Alternativ zu 8.2: Ein dedizierter Middleware-Check, der bei jedem Request den Account-Status über einen leichtgewichtigen API-Call oder Cache validiert. Die Entscheidung zwischen 8.2 und 8.3 SOLL basierend auf der Deployment-Architektur getroffen werden.

---

## Finding 9: Fehlende CORS-Konfiguration

### Problem
Es gibt keine explizite CORS-Konfiguration. Next.js API-Routen akzeptieren standardmäßig Requests von jeder Origin. Das `sameSite: lax`-Cookie schützt vor CSRF bei POST/PUT/DELETE (Browser sendet Cookie nicht bei Cross-Origin-POST), aber:
- GET-Requests mit Seiteneffekten wären angreifbar (aktuell keine identifiziert, aber präventiv absichern).
- Preflight-Requests (OPTIONS) werden nicht explizit behandelt.

### Betroffene Dateien
- `middleware.ts` oder `next.config.ts`

### Anforderungen
- **9.1** Die Middleware SOLL CORS-Header für API-Routen setzen:
  - `Access-Control-Allow-Origin`: Nur die eigene Domain (aus `process.env.NEXTAUTH_URL` oder `process.env.AUTH_URL` ableiten). Im Development `http://localhost:3000`.
  - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization`
  - `Access-Control-Allow-Credentials: true`
- **9.2** OPTIONS-Preflight-Requests MÜSSEN mit Status 204 und den CORS-Headern beantwortet werden.
- **9.3** Requests von nicht-erlaubten Origins SOLLEN mit 403 abgelehnt werden (für API-Routen).
- **9.4** Die Upload-Endpunkte (`/api/uploads/*`) DÜRFEN von der strikten CORS-Policy ausgenommen werden, falls sie für öffentlichen Zugriff vorgesehen sind (abhängig von Finding 1).

---

## Priorisierung

| Finding | Schwere | Aufwand | Priorität |
|---------|---------|---------|-----------|
| 4 – Security-Headers | Hoch | Klein | **P1** |
| 5 – Admin-Middleware | Mittel-Hoch | Klein | **P1** |
| 3 – Setup Race Condition | Mittel | Klein | **P2** |
| 6 – IP im Audit-Log | Mittel | Mittel | **P2** |
| 9 – CORS | Mittel | Mittel | **P2** |
| 7 – Upload Rate-Limiting | Mittel | Mittel | **P3** |
| 8 – JWT-Härtung | Mittel | Groß | **P3** |

---

## Akzeptanzkriterien

- [ ] Alle Security-Headers werden in der Response gesendet (prüfbar via `curl -I`)
- [ ] Middleware blockiert Nicht-Admin-Zugriff auf alle Admin-API-Routen
- [ ] Setup-Endpunkt erstellt bei parallelen Requests maximal einen Admin
- [ ] Audit-Log-Einträge enthalten IP-Adressen
- [ ] Upload-Endpunkte geben 429 bei Überschreitung des Rate-Limits zurück
- [ ] JWT-Token-Refresh-Intervall ist reduziert
- [ ] CORS-Header sind korrekt gesetzt und blockieren Cross-Origin-Requests von fremden Domains
- [ ] Bestehende Funktionalität ist nicht beeinträchtigt (alle Tests grün)
