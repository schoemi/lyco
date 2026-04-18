# Security Hardening Design – Findings 3–9

## Übersicht

Dieses Design beschreibt die Implementierung der Pentest-Findings 3–9. Die Findings 1 (Upload-Auth) und 2 (ZIP-Bomb) sind bereits adressiert. Der aktuelle Security-Check bestätigt alle 7 verbleibenden Findings als offen.

## Ist-Zustand (Security-Check-Ergebnis)

| Finding | Status | Bewertung |
| --- | --- | --- |
| 3 – Setup Race Condition | **Offen** | `createInitialAdmin()` nutzt keine Transaktion |
| 4 – Security-Headers | **Offen** | `next.config.ts` hat keine `headers()`-Funktion |
| 5 – Admin-Middleware-Lücke | **Offen** | `adminApiPrefix` ist nur `"/api/users"` — `/api/admin`, `/api/settings`, `/api/server-errors`, `/api/audit-log` fehlen |
| 6 – IP im Audit-Log | **Offen** | `logAudit()` akzeptiert `ipAddress`, aber kein Aufrufer übergibt es |
| 7 – Upload Rate-Limiting | **Offen** | Kein Rate-Limiting auf Upload-Endpunkten |
| 8 – JWT-Härtung | **Offen** | `updateAge: 60 * 5` (5 Min), kein DB-Refresh des accountStatus |
| 9 – CORS | **Offen** | Keine CORS-Konfiguration vorhanden |

## Glossar

- **TOCTOU**: Time of Check, Time of Use — Race Condition zwischen Prüfung und Aktion
- **CSP**: Content Security Policy — Browser-Sicherheitsheader gegen XSS
- **HSTS**: HTTP Strict Transport Security — erzwingt HTTPS
- **Defense-in-Depth**: Mehrere Sicherheitsschichten, sodass ein Fehler in einer Schicht nicht sofort ausnutzbar ist

---

## Finding 3: Setup-Endpunkt Race Condition

### Analyse

`createInitialAdmin()` in `src/lib/services/setup-service.ts` prüft `isSetupRequired()` (zählt Admins) und erstellt dann einen Admin. Zwischen Check und Create liegt eine Zeitlücke. Bei gleichzeitigen Requests könnten beide den Check bestehen und jeweils einen Admin erstellen.

### Fix-Design

Die gesamte Logik wird in eine `prisma.$transaction()` mit `isolationLevel: "Serializable"` gewrappt. Innerhalb der Transaktion wird erneut geprüft, ob bereits ein Admin existiert.

**Datei**: `src/lib/services/setup-service.ts`

```typescript
export async function createInitialAdmin(data: SetupInput) {
  return prisma.$transaction(async (tx) => {
    const adminCount = await tx.user.count({ where: { role: "ADMIN" } });
    if (adminCount > 0) {
      throw new Error("Setup wurde bereits abgeschlossen");
    }

    // Validierung + Erstellung innerhalb der Transaktion
    if (!validateEmail(data.email)) {
      throw new Error("Ungültige E-Mail-Adresse");
    }
    const passwordCheck = validatePassword(data.password);
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.error!);
    }
    const passwordHash = await hashPassword(data.password);

    return tx.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: "ADMIN",
      },
    });
  }, { isolationLevel: "Serializable" });
}
```

**Preservation**: `isSetupRequired()` bleibt als separate Funktion für den GET-Check erhalten. Nur `createInitialAdmin()` wird geändert.

---

## Finding 4: Security-Headers

### Analyse

`next.config.ts` hat keine `headers()`-Funktion. Keine Security-Headers werden gesendet.

### Fix-Design

**Datei**: `next.config.ts`

Eine `headers()`-Funktion wird hinzugefügt, die für alle Routen Security-Headers setzt:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://images.genius.com",
            "media-src 'self' blob:",
            "connect-src 'self'",
            "font-src 'self'",
            "frame-ancestors 'none'",
          ].join("; "),
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ],
    },
  ];
},
```

**Hinweise**:
- `unsafe-inline` und `unsafe-eval` sind für Next.js und TipTap-Editor nötig
- `images.genius.com` wird für Album-Art-Bilder aus der Genius-Suche benötigt
- `frame-ancestors 'none'` ergänzt `X-Frame-Options: DENY`
- HSTS wird immer gesetzt (wirkt nur über HTTPS, schadet nicht über HTTP)

---

## Finding 5: Admin-Middleware-Lücke

### Analyse

Die Middleware schützt nur `/admin` (Seiten) und `/api/users` (API) als Admin-Routen. Folgende Admin-API-Endpunkte werden nicht erkannt:
- `/api/admin/*` (Datei-Management)
- `/api/settings/*` (Themes, Approval, globales Theme)
- `/api/server-errors` (Fehler-Log)
- `/api/audit-log` (Audit-Log)

Alle diese Endpunkte haben eigene `getAdminSession()`-Checks, aber die Middleware bietet keine zusätzliche Schutzschicht.

### Fix-Design

**Datei**: `middleware.ts`

`adminApiPrefix` wird zu einem Array erweitert:

```typescript
const adminApiPrefixes = [
  "/api/users",
  "/api/admin",
  "/api/settings",
  "/api/server-errors",
  "/api/audit-log",
];

function isAdminRoute(pathname: string): boolean {
  if (pathname.startsWith(adminPagePrefix)) return true;
  return adminApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}
```

**Sonderfall `/api/settings/theme` GET**: Dieser Endpunkt nutzt aktuell `getAdminSession()` und ist damit admin-only. Falls normale User das aktive Theme lesen müssen (z.B. für Theme-Anzeige), muss ein separater öffentlicher Endpunkt erstellt werden. Aktuell ist kein solcher Bedarf erkennbar — die Theme-Daten werden serverseitig gerendert.

**Preservation**: Die bestehenden `getAdminSession()`-Checks in den Route-Handlern bleiben als Defense-in-Depth erhalten.

---

## Finding 6: IP-Adresse im Audit-Log

### Analyse

`logAudit()` akzeptiert bereits einen optionalen `ipAddress`-Parameter, aber kein Aufrufer übergibt ihn. Betroffen sind 7 Aufrufe in 5 Dateien.

### Fix-Design

**Schritt 1**: Hilfsfunktion zur IP-Extraktion erstellen.

**Datei**: `src/lib/utils/request-ip.ts`

```typescript
import { NextRequest } from "next/server";

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "unknown";
}
```

**Schritt 2**: Alle `logAudit()`-Aufrufe in API-Route-Handlern um `ipAddress` ergänzen.

Betroffene Dateien und Aufrufe:
1. `src/lib/auth.ts` — LOGIN_SUCCESS, LOGIN_FAILED (Sonderfall: `authorize()` hat keinen Request-Zugriff, IP muss über einen anderen Weg übergeben werden — siehe unten)
2. `src/app/api/users/route.ts` — USER_CREATED
3. `src/app/api/users/[id]/route.ts` — USER_UPDATED, USER_DELETED
4. `src/app/api/users/[id]/status/route.ts` — ACCOUNT_STATUS_CHANGED
5. `src/app/api/settings/theme/route.ts` — SETTING_CHANGED
6. `src/app/api/settings/require-approval/route.ts` — SETTING_CHANGED

**Sonderfall Login**: Der `authorize()`-Callback in `src/lib/auth.ts` hat keinen Zugriff auf das `NextRequest`-Objekt. Die IP-Adresse kann hier nicht direkt extrahiert werden. Lösungsansätze:
- **Option A**: Login-Audit-Logging in die `/api/auth/[...nextauth]/route.ts` verlagern (POST-Handler wrappen)
- **Option B**: IP über einen Custom-Header oder Cookie-Mechanismus durchreichen
- **Option C**: Login-IP-Logging vorerst auslassen und nur bei Admin-Aktionen loggen

**Empfehlung**: Option C für den ersten Release — die Admin-Aktionen (User-CRUD, Status-Änderungen, Settings) sind sicherheitskritischer und haben direkten Request-Zugriff. Login-IP-Logging kann in einem Follow-up über einen Custom-Middleware-Header gelöst werden.

---

## Finding 7: Upload Rate-Limiting

### Analyse

Die Upload-Endpunkte haben kein Rate-Limiting. Der bestehende Login-Rate-Limiter nutzt die Datenbank (`LoginAttempt`-Tabelle). Für Uploads ist ein In-Memory-Ansatz effizienter, da die Anwendung single-instance läuft.

### Fix-Design

**Datei**: `src/lib/services/upload-rate-limiter.ts`

```typescript
const UPLOAD_LIMIT = 20;
const WINDOW_MS = 15 * 60 * 1000; // 15 Minuten

const uploadTimestamps = new Map<string, number[]>();

export function checkUploadRateLimit(userId: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let timestamps = uploadTimestamps.get(userId) ?? [];
  // Alte Einträge entfernen
  timestamps = timestamps.filter((t) => t > windowStart);
  uploadTimestamps.set(userId, timestamps);

  if (timestamps.length >= UPLOAD_LIMIT) {
    const oldestInWindow = timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }

  timestamps.push(now);
  return { allowed: true };
}
```

**Integration** in beide Upload-Routen (`audio-quellen/upload` und `cover/upload`):

```typescript
import { checkUploadRateLimit } from "@/lib/services/upload-rate-limiter";

// Nach Auth-Check, vor Dateiverarbeitung:
const rateCheck = checkUploadRateLimit(session.user.id);
if (!rateCheck.allowed) {
  return NextResponse.json(
    { error: "Zu viele Uploads. Bitte warten." },
    {
      status: 429,
      headers: { "Retry-After": String(rateCheck.retryAfter) },
    }
  );
}
```

**Preservation**: Bestehende Upload-Logik bleibt unverändert. Der Rate-Check wird vor der Dateiverarbeitung eingefügt.

---

## Finding 8: JWT-Härtung

### Analyse

- `updateAge: 60 * 5` (5 Minuten) — in diesem Fenster könnte ein gesperrter User weiter agieren
- Der JWT-Callback lädt den `accountStatus` nicht aus der DB nach

### Fix-Design

**Datei**: `src/lib/auth.config.ts`

**Änderung 1**: `updateAge` auf 60 Sekunden reduzieren:

```typescript
session: {
  strategy: "jwt",
  maxAge: 24 * 60 * 60,
  updateAge: 60, // Reduziert von 300s auf 60s
},
```

**Änderung 2**: Kein DB-Zugriff im JWT-Callback, da `auth.config.ts` Edge-kompatibel sein muss (kein Prisma-Import). Die Middleware prüft bereits den `accountStatus` aus dem Token und leitet bei nicht-aktivem Status auf `/login` um. Mit `updateAge: 60` wird das Fenster auf maximal 60 Sekunden reduziert.

**Alternative (nicht implementiert)**: Ein separater Middleware-API-Call zum Validieren des Account-Status bei jedem Request wäre möglich, aber würde die Latenz jedes Requests erhöhen. Das 60-Sekunden-Fenster ist ein akzeptabler Kompromiss.

---

## Finding 9: CORS-Konfiguration

### Analyse

Keine CORS-Header konfiguriert. Next.js API-Routen akzeptieren standardmäßig Requests von jeder Origin. Das `sameSite: lax`-Cookie schützt vor CSRF bei POST/PUT/DELETE.

### Fix-Design

**Datei**: `middleware.ts`

CORS-Header werden in der Middleware für API-Routen gesetzt:

```typescript
function addCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
  const allowedOrigin = getAllowedOrigin();

  if (origin && origin === allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  return response;
}

function getAllowedOrigin(): string {
  return process.env.AUTH_URL
    || process.env.NEXTAUTH_URL
    || "http://localhost:3000";
}
```

**OPTIONS-Preflight**: In der Middleware wird ein Early-Return für OPTIONS-Requests auf API-Routen eingefügt:

```typescript
if (req.method === "OPTIONS" && isApiRoute(pathname)) {
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response, req.headers.get("origin"));
}
```

**Preservation**: Alle bestehenden Routen funktionieren weiterhin, da Same-Origin-Requests nicht von CORS betroffen sind. Nur Cross-Origin-Requests von fremden Domains werden blockiert.

---

## Implementierungsreihenfolge

| Schritt | Finding | Aufwand | Risiko |
| --- | --- | --- | --- |
| 1 | 4 – Security-Headers | Klein | Niedrig |
| 2 | 5 – Admin-Middleware | Klein | Niedrig |
| 3 | 9 – CORS | Mittel | Mittel |
| 4 | 3 – Setup Race Condition | Klein | Niedrig |
| 5 | 6 – IP im Audit-Log | Mittel | Niedrig |
| 6 | 7 – Upload Rate-Limiting | Mittel | Niedrig |
| 7 | 8 – JWT-Härtung | Klein | Niedrig |

## Teststrategie

- **Finding 3**: Unit-Test mit parallelen `createInitialAdmin()`-Aufrufen — nur einer darf erfolgreich sein
- **Finding 4**: `curl -I` gegen die Anwendung, Header-Prüfung in Integration-Tests
- **Finding 5**: Property-Test: für alle Admin-API-Prefixe × (kein Auth / User-Auth / Admin-Auth) korrekte Status-Codes
- **Finding 6**: Unit-Tests prüfen, dass `logAudit()` mit `ipAddress` aufgerufen wird
- **Finding 7**: Property-Test: 20 Uploads erlaubt, 21. gibt 429 mit Retry-After
- **Finding 8**: Prüfung des `updateAge`-Werts in der Config
- **Finding 9**: Integration-Test: Cross-Origin-Request von fremder Domain wird blockiert, Same-Origin funktioniert
