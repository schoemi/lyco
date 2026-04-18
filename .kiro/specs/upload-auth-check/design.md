# Upload-Auth-Check Bugfix Design

## Overview

Die Upload-Serving-Endpunkte `/api/uploads/audio/[...path]` und `/api/uploads/covers/[...path]` liefern Dateien ohne jegliche Authentifizierung oder Autorisierung aus. Die Ursache ist, dass `/api/uploads/` in der `publicApiPrefixes`-Liste der Middleware steht, wodurch alle Anfragen an diese Routen die Auth-Prüfung vollständig umgehen. Der Fix entfernt `/api/uploads/` aus den öffentlichen Prefixes und fügt in beiden Route-Handlern eine Session-Prüfung (401) sowie eine Eigentümer-/Freigabe-Prüfung (403) hinzu. Bestehende Funktionalität für berechtigte Benutzer (eigene Dateien, freigegebene Dateien, Range-Requests) bleibt vollständig erhalten.

## Glossary

- **Bug_Condition (C)**: Anfrage an `/api/uploads/audio/*` oder `/api/uploads/covers/*` ohne gültige Session ODER mit gültiger Session aber ohne Eigentümerschaft/Freigabe für die zugehörige Datei
- **Property (P)**: Unauthentifizierte Anfragen erhalten 401; authentifizierte Anfragen ohne Berechtigung erhalten 403; Dateiinhalt wird nicht ausgeliefert
- **Preservation**: Authentifizierte Benutzer mit Eigentümerschaft oder Freigabe erhalten weiterhin die Datei (inkl. Range-Requests, HEAD-Requests, korrekte Content-Types)
- **publicApiPrefixes**: Array in `middleware.ts`, das Pfad-Prefixes definiert, die ohne Auth-Prüfung durchgelassen werden
- **hatSongZugriff**: Funktion in `freigabe-service.ts`, die prüft ob ein Benutzer Zugriff auf einen Song hat (Eigentümer, direkte SongFreigabe, oder SetFreigabe)
- **AudioQuelle**: Datenbankmodell, das eine Audio-Datei mit einem Song verknüpft (enthält `url`-Feld mit Pfad wie `/api/uploads/audio/{uuid}.mp3`)
- **coverUrl**: Feld auf dem Song-Modell, das den Pfad zum Cover-Bild enthält (z.B. `/api/uploads/covers/{uuid}.jpg`)

## Bug Details

### Bug Condition

Der Bug tritt auf, wenn eine Anfrage an die Upload-Serving-Endpunkte gesendet wird und entweder keine gültige Session vorhanden ist oder der authentifizierte Benutzer keinen Zugriff auf die zugehörige Datei hat. Da `/api/uploads/` in `publicApiPrefixes` steht, wird die Middleware-Auth-Prüfung komplett übersprungen. Die Route-Handler selbst führen keinerlei Auth-Prüfung durch — sie lesen die Datei direkt vom Dateisystem und liefern sie aus.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type UploadRequest (method, path, session, fileOwnerUserId, songId)
  OUTPUT: boolean

  isUploadEndpoint ← input.path STARTS WITH "/api/uploads/audio/"
                     OR input.path STARTS WITH "/api/uploads/covers/"
  isUnauthenticated ← input.session = NULL
  isNotOwnerOrShared ← input.session ≠ NULL
                       AND input.fileOwnerUserId ≠ input.session.userId
                       AND NOT hatSongZugriff(input.songId, input.session.userId)

  RETURN isUploadEndpoint AND (isUnauthenticated OR isNotOwnerOrShared)
END FUNCTION
```

### Examples

- **Unauthentifiziert, Audio**: `GET /api/uploads/audio/abc123.mp3` ohne Session → System liefert Datei aus (erwartet: 401)
- **Unauthentifiziert, Cover**: `GET /api/uploads/covers/def456.jpg` ohne Session → System liefert Bild aus (erwartet: 401)
- **Unauthentifiziert, HEAD**: `HEAD /api/uploads/audio/abc123.mp3` ohne Session → System liefert Metadaten aus (erwartet: 401)
- **Fremde Datei, Audio**: Benutzer A ruft `GET /api/uploads/audio/abc123.mp3` ab, Datei gehört Benutzer B, keine Freigabe → System liefert Datei aus (erwartet: 403)
- **Fremde Datei, Cover**: Benutzer A ruft `GET /api/uploads/covers/def456.jpg` ab, Bild gehört Benutzer B, keine Freigabe → System liefert Bild aus (erwartet: 403)
- **Nicht-existierende Datei**: `GET /api/uploads/audio/nonexistent.mp3` ohne Session → System gibt 404 zurück (erwartet: 401 vor 404)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Authentifizierte Benutzer, die ihre eigenen Audio-Dateien abrufen, erhalten weiterhin die Datei mit korrektem Content-Type und Range-Request-Support
- Authentifizierte Benutzer, die ihre eigenen Cover-Bilder abrufen, erhalten weiterhin das Bild mit korrektem Content-Type
- HEAD-Requests für eigene Audio-Dateien liefern weiterhin Content-Length, Accept-Ranges und Content-Type
- Freigegebene Dateien (über SongFreigabe oder SetFreigabe) bleiben für den Empfänger zugänglich
- Upload-Endpunkte (`POST /api/songs/[id]/audio-quellen/upload` und `POST /api/songs/[id]/cover/upload`) funktionieren weiterhin unverändert
- 404-Antworten für nicht-existierende Dateien bleiben erhalten (nach Auth-Prüfung)
- Cache-Control-Header (`public, max-age=31536000, immutable`) bleiben für berechtigte Anfragen erhalten

**Scope:**
Alle Anfragen, die NICHT an `/api/uploads/audio/*` oder `/api/uploads/covers/*` gehen, sind von diesem Fix nicht betroffen. Ebenso sind alle Upload-POST-Endpunkte nicht betroffen, da diese bereits eigene Auth-Prüfungen haben.

## Hypothesized Root Cause

Basierend auf der Code-Analyse sind die Ursachen klar identifiziert:

1. **Middleware-Bypass**: `middleware.ts` Zeile 9 enthält `"/api/uploads/"` in der `publicApiPrefixes`-Liste. Die Funktion `isPublicRoute()` prüft `pathname.startsWith(prefix)` und lässt alle Anfragen an `/api/uploads/*` ohne Auth durch. Dies wurde in einem früheren Bugfix (audio-player-bugs) hinzugefügt, um Audio-Streaming zu ermöglichen, ohne die Sicherheitsimplikationen zu berücksichtigen.

2. **Fehlende Auth in Route-Handlern**: Weder `src/app/api/uploads/audio/[...path]/route.ts` noch `src/app/api/uploads/covers/[...path]/route.ts` rufen `auth()` auf oder prüfen die Session. Sie lesen die Datei direkt vom Dateisystem basierend auf dem Dateinamen im URL-Pfad.

3. **Fehlende Eigentümerprüfung**: Selbst wenn Auth hinzugefügt würde, gibt es aktuell keine Logik, die den Dateinamen (UUID) auf einen Song und dessen Eigentümer zurückführt. Die Verknüpfung existiert in der Datenbank (AudioQuelle.url für Audio, Song.coverUrl für Cover), muss aber in den Route-Handlern abgefragt werden.

4. **Kein Freigabe-Check**: Die bestehende `hatSongZugriff()`-Funktion prüft Eigentümerschaft, direkte SongFreigabe und SetFreigabe, wird aber in den Upload-Serving-Routen nicht verwendet.

## Correctness Properties

Property 1: Bug Condition - Unauthentifizierte/Unbefugte Anfragen werden abgelehnt

_For any_ Upload-Serving-Anfrage (GET oder HEAD an `/api/uploads/audio/*` oder `/api/uploads/covers/*`) wo die Bug-Bedingung gilt (keine Session ODER keine Eigentümerschaft/Freigabe), SHALL die gefixte Route mit HTTP 401 (keine Session) oder HTTP 403 (keine Berechtigung) antworten und KEINEN Dateiinhalt ausliefern.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Berechtigte Anfragen funktionieren weiterhin

_For any_ Upload-Serving-Anfrage wo die Bug-Bedingung NICHT gilt (authentifizierter Benutzer mit Eigentümerschaft oder Freigabe), SHALL die gefixte Route dasselbe Ergebnis liefern wie die ursprüngliche Route — korrekte Datei, korrekter Content-Type, Range-Request-Support und Cache-Header.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.8**

## Fix Implementation

### Changes Required

**Datei 1**: `middleware.ts`

**Änderung**: `/api/uploads/` aus `publicApiPrefixes` entfernen

**Spezifisch**:
1. **publicApiPrefixes bereinigen**: `"/api/uploads/"` aus dem Array entfernen, sodass Anfragen an Upload-Serving-Routen die normale Auth-Prüfung der Middleware durchlaufen
   - Vorher: `["/api/auth/", "/api/setup", "/api/uploads/"]`
   - Nachher: `["/api/auth/", "/api/setup"]`

---

**Datei 2**: `src/app/api/uploads/audio/[...path]/route.ts`

**Funktion**: `GET` und `HEAD`

**Spezifische Änderungen**:
1. **Auth-Import hinzufügen**: `import { auth } from "@/lib/auth"` und `import { prisma } from "@/lib/prisma"` sowie `import { hatSongZugriff } from "@/lib/services/freigabe-service"`
2. **Session-Prüfung**: Am Anfang von GET und HEAD `auth()` aufrufen. Wenn keine Session → 401 zurückgeben
3. **Datei-zu-Song-Auflösung**: Den Dateinamen aus dem URL-Pfad extrahieren und die zugehörige AudioQuelle in der Datenbank suchen (`prisma.audioQuelle.findFirst({ where: { url: CONTAINS filename } })`)
4. **Eigentümer-/Freigabe-Prüfung**: Über die AudioQuelle den Song ermitteln und `hatSongZugriff(songId, userId)` aufrufen. Wenn kein Zugriff → 403 zurückgeben
5. **Sonderfall: Datei ohne DB-Eintrag**: Wenn keine AudioQuelle gefunden wird (verwaiste Datei), nur dem Eigentümer Zugriff gewähren oder 403 zurückgeben. Konservativ: 403 für alle, da die Datei keinem Song zugeordnet werden kann.

---

**Datei 3**: `src/app/api/uploads/covers/[...path]/route.ts`

**Funktion**: `GET`

**Spezifische Änderungen**:
1. **Auth-Import hinzufügen**: Analog zu Audio-Route
2. **Session-Prüfung**: Am Anfang von GET `auth()` aufrufen. Wenn keine Session → 401
3. **Datei-zu-Song-Auflösung**: Den Dateinamen extrahieren und den Song suchen (`prisma.song.findFirst({ where: { coverUrl: CONTAINS filename } })`)
4. **Eigentümer-/Freigabe-Prüfung**: `hatSongZugriff(songId, userId)` aufrufen. Wenn kein Zugriff → 403
5. **Sonderfall: Datei ohne DB-Eintrag**: Analog zu Audio — 403 für verwaiste Dateien

---

**Hilfsfunktion** (optional, zur Wiederverwendung):

Eine gemeinsame Hilfsfunktion `resolveUploadAccess(filename, type, userId)` könnte in `src/lib/services/upload-auth-service.ts` erstellt werden, die:
- Den Dateinamen auf einen Song auflöst (über AudioQuelle.url oder Song.coverUrl)
- `hatSongZugriff()` aufruft
- Ein Ergebnis `{ allowed: boolean, songId?: string }` zurückgibt

## Testing Strategy

### Validation Approach

Die Teststrategie folgt einem zweiphasigen Ansatz: Zuerst werden Counterexamples auf dem unfixierten Code erzeugt, um den Bug zu bestätigen. Dann wird der Fix verifiziert und die Preservation sichergestellt.

### Exploratory Bug Condition Checking

**Goal**: Counterexamples erzeugen, die den Bug auf dem unfixierten Code demonstrieren. Die Root-Cause-Analyse bestätigen oder widerlegen.

**Test Plan**: Tests schreiben, die HTTP-Anfragen an die Upload-Serving-Endpunkte simulieren — sowohl ohne Session als auch mit fremder Session — und prüfen, ob die Dateien ausgeliefert werden (was auf unfixiertem Code der Fall sein wird).

**Test Cases**:
1. **Unauthentifizierter Audio-Zugriff**: GET `/api/uploads/audio/{uuid}.mp3` ohne Session → auf unfixiertem Code wird 200 mit Dateiinhalt zurückgegeben (Bug)
2. **Unauthentifizierter Cover-Zugriff**: GET `/api/uploads/covers/{uuid}.jpg` ohne Session → auf unfixiertem Code wird 200 mit Dateiinhalt zurückgegeben (Bug)
3. **Unauthentifizierter HEAD-Zugriff**: HEAD `/api/uploads/audio/{uuid}.mp3` ohne Session → auf unfixiertem Code werden Metadaten zurückgegeben (Bug)
4. **Fremder Audio-Zugriff**: GET `/api/uploads/audio/{uuid}.mp3` mit Session von Benutzer B, Datei gehört Benutzer A → auf unfixiertem Code wird 200 zurückgegeben (Bug)
5. **Fremder Cover-Zugriff**: GET `/api/uploads/covers/{uuid}.jpg` mit Session von Benutzer B, Bild gehört Benutzer A → auf unfixiertem Code wird 200 zurückgegeben (Bug)

**Expected Counterexamples**:
- Alle Anfragen erhalten 200 statt 401/403
- Dateiinhalt wird in der Response ausgeliefert
- Ursache: `/api/uploads/` in `publicApiPrefixes` umgeht die Middleware-Auth, und die Route-Handler haben keine eigene Auth-Prüfung

### Fix Checking

**Goal**: Verifizieren, dass für alle Eingaben, bei denen die Bug-Bedingung gilt, die gefixte Funktion das erwartete Verhalten zeigt.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := handleUploadRequest_fixed(input)
  IF input.session = NULL THEN
    ASSERT result.status = 401
  ELSE
    ASSERT result.status = 403
  END IF
  ASSERT result.body DOES NOT CONTAIN file_content
END FOR
```

### Preservation Checking

**Goal**: Verifizieren, dass für alle Eingaben, bei denen die Bug-Bedingung NICHT gilt, die gefixte Funktion dasselbe Ergebnis liefert wie die ursprüngliche Funktion.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT handleUploadRequest_original(input) = handleUploadRequest_fixed(input)
END FOR
```

**Testing Approach**: Property-Based Testing wird für Preservation Checking empfohlen, weil:
- Es automatisch viele Testfälle über den Eingabebereich generiert
- Es Randfälle findet, die manuelle Unit-Tests übersehen könnten
- Es starke Garantien bietet, dass das Verhalten für alle berechtigten Anfragen unverändert bleibt

**Test Plan**: Verhalten auf unfixiertem Code für berechtigte Anfragen beobachten (eigene Dateien, freigegebene Dateien), dann Property-Based Tests schreiben, die dieses Verhalten nach dem Fix verifizieren.

**Test Cases**:
1. **Eigene Audio-Datei Preservation**: Verifizieren, dass GET für eigene Audio-Dateien weiterhin 200 mit korrektem Content-Type und Dateiinhalt liefert
2. **Eigene Cover-Datei Preservation**: Verifizieren, dass GET für eigene Cover-Bilder weiterhin 200 mit korrektem Content-Type liefert
3. **Range-Request Preservation**: Verifizieren, dass Range-Requests für eigene Audio-Dateien weiterhin 206 mit korrektem Content-Range liefern
4. **HEAD-Request Preservation**: Verifizieren, dass HEAD für eigene Audio-Dateien weiterhin 200 mit Content-Length und Accept-Ranges liefert
5. **Freigegebene Datei Preservation**: Verifizieren, dass GET für freigegebene Audio-Dateien/Cover weiterhin 200 liefert
6. **404 Preservation**: Verifizieren, dass nicht-existierende Dateien weiterhin 404 liefern (nach Auth-Prüfung)

### Unit Tests

- Session-Prüfung: Anfragen ohne Session erhalten 401 für beide Endpunkte (GET und HEAD)
- Eigentümer-Prüfung: Anfragen mit Session aber ohne Eigentümerschaft/Freigabe erhalten 403
- Eigentümer-Zugriff: Anfragen mit Session des Eigentümers erhalten 200 mit Dateiinhalt
- Freigabe-Zugriff: Anfragen mit Session eines Freigabe-Empfängers erhalten 200
- Verwaiste Dateien: Dateien ohne DB-Eintrag liefern 403 für Nicht-Eigentümer
- Middleware-Prüfung: `/api/uploads/` ist nicht mehr in `publicApiPrefixes`

### Property-Based Tests

- Generiere zufällige Kombinationen aus (Session vorhanden/fehlend, Eigentümer/Fremder/Freigabe-Empfänger, Audio/Cover, GET/HEAD) und verifiziere korrekte Status-Codes
- Generiere zufällige berechtigte Anfragen und verifiziere, dass Dateiinhalt, Content-Type und Header korrekt sind
- Generiere zufällige Dateinamen (UUID-Format) und verifiziere, dass Path-Traversal-Schutz weiterhin funktioniert

### Integration Tests

- Vollständiger Flow: Datei hochladen → als Eigentümer abrufen → als Fremder abrufen (403) → Freigabe erstellen → als Empfänger abrufen (200)
- Audio-Streaming: Range-Request-Flow mit Auth für eigene Dateien
- Cover-Anzeige: Cover-Bild mit Auth für eigene und freigegebene Songs
