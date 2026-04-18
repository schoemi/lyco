# Bugfix Requirements Document

## Einleitung

Die Endpunkte `/api/uploads/audio/[...path]` und `/api/uploads/covers/[...path]` liefern Dateien ohne jegliche Authentifizierung aus. Die Middleware (`middleware.ts`) enthält `/api/uploads/` in der Liste `publicApiPrefixes`, wodurch alle Upload-Abruf-Routen die Authentifizierung vollständig umgehen. Ein Angreifer, der einen Dateinamen kennt oder errät (z. B. durch Brute-Force auf UUIDs oder Beobachtung des Netzwerkverkehrs), kann Audio-Dateien und Cover-Bilder aller Benutzer herunterladen. Schweregrad: Hoch (Information Disclosure).

## Bug-Analyse

### Aktuelles Verhalten (Defekt)

1.1 WENN ein nicht-authentifizierter Benutzer eine GET-Anfrage an `/api/uploads/audio/{dateiname}` sendet, DANN liefert das System die Audio-Datei ohne Authentifizierungsprüfung aus

1.2 WENN ein nicht-authentifizierter Benutzer eine GET-Anfrage an `/api/uploads/covers/{dateiname}` sendet, DANN liefert das System das Cover-Bild ohne Authentifizierungsprüfung aus

1.3 WENN ein nicht-authentifizierter Benutzer eine HEAD-Anfrage an `/api/uploads/audio/{dateiname}` sendet, DANN liefert das System die Datei-Metadaten (Größe, Typ) ohne Authentifizierungsprüfung aus

1.4 WENN ein authentifizierter Benutzer eine GET-Anfrage an `/api/uploads/audio/{dateiname}` für eine Audio-Datei sendet, die einem anderen Benutzer gehört, DANN liefert das System die Datei ohne Eigentümerprüfung aus

1.5 WENN ein authentifizierter Benutzer eine GET-Anfrage an `/api/uploads/covers/{dateiname}` für ein Cover-Bild sendet, das einem anderen Benutzer gehört, DANN liefert das System die Datei ohne Eigentümerprüfung aus

### Erwartetes Verhalten (Korrekt)

2.1 WENN ein nicht-authentifizierter Benutzer eine GET-Anfrage an `/api/uploads/audio/{dateiname}` sendet, DANN SOLL das System mit HTTP 401 (Nicht authentifiziert) antworten

2.2 WENN ein nicht-authentifizierter Benutzer eine GET-Anfrage an `/api/uploads/covers/{dateiname}` sendet, DANN SOLL das System mit HTTP 401 (Nicht authentifiziert) antworten

2.3 WENN ein nicht-authentifizierter Benutzer eine HEAD-Anfrage an `/api/uploads/audio/{dateiname}` sendet, DANN SOLL das System mit HTTP 401 (Nicht authentifiziert) antworten

2.4 WENN ein authentifizierter Benutzer eine GET-Anfrage an `/api/uploads/audio/{dateiname}` für eine Audio-Datei sendet, die einem anderen Benutzer gehört und nicht über SongFreigabe freigegeben ist, DANN SOLL das System mit HTTP 403 (Zugriff verweigert) antworten

2.5 WENN ein authentifizierter Benutzer eine GET-Anfrage an `/api/uploads/covers/{dateiname}` für ein Cover-Bild sendet, das einem anderen Benutzer gehört und nicht über SongFreigabe freigegeben ist, DANN SOLL das System mit HTTP 403 (Zugriff verweigert) antworten

### Unverändertes Verhalten (Regressionsprävention)

3.1 WENN ein authentifizierter Benutzer eine GET-Anfrage an `/api/uploads/audio/{dateiname}` für eine eigene Audio-Datei sendet, DANN SOLL das System WEITERHIN die Audio-Datei korrekt ausliefern (inkl. Range-Requests)

3.2 WENN ein authentifizierter Benutzer eine GET-Anfrage an `/api/uploads/covers/{dateiname}` für ein eigenes Cover-Bild sendet, DANN SOLL das System WEITERHIN das Cover-Bild korrekt ausliefern

3.3 WENN ein authentifizierter Benutzer eine HEAD-Anfrage an `/api/uploads/audio/{dateiname}` für eine eigene Audio-Datei sendet, DANN SOLL das System WEITERHIN die Datei-Metadaten korrekt zurückgeben

3.4 WENN ein authentifizierter Benutzer eine GET-Anfrage an `/api/uploads/audio/{dateiname}` für eine Audio-Datei sendet, die über SongFreigabe freigegeben wurde, DANN SOLL das System WEITERHIN die Audio-Datei korrekt ausliefern

3.5 WENN ein authentifizierter Benutzer eine GET-Anfrage an `/api/uploads/covers/{dateiname}` für ein Cover-Bild sendet, das über SongFreigabe freigegeben wurde, DANN SOLL das System WEITERHIN das Cover-Bild korrekt ausliefern

3.6 WENN ein authentifizierter Benutzer eine Audio-Datei über POST `/api/songs/[id]/audio-quellen/upload` hochlädt, DANN SOLL das System WEITERHIN die Datei korrekt speichern und die AudioQuelle erstellen

3.7 WENN ein authentifizierter Benutzer ein Cover-Bild über POST `/api/songs/[id]/cover/upload` hochlädt, DANN SOLL das System WEITERHIN die Datei korrekt speichern und die coverUrl aktualisieren

3.8 WENN eine Anfrage an eine nicht-existierende Datei unter `/api/uploads/audio/` oder `/api/uploads/covers/` gesendet wird, DANN SOLL das System WEITERHIN mit HTTP 404 antworten (nach Authentifizierungsprüfung)

---

## Bug-Bedingung (Formale Definition)

### Bug-Bedingungsfunktion

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type UploadRequest (method, path, session, fileOwnerUserId)
  OUTPUT: boolean

  // Der Bug tritt auf, wenn ein Upload-Abruf-Endpunkt ohne
  // Authentifizierung oder ohne Eigentümerprüfung aufgerufen wird
  isUploadEndpoint ← X.path STARTS WITH "/api/uploads/audio/" OR X.path STARTS WITH "/api/uploads/covers/"
  isUnauthenticated ← X.session = NULL
  isNotOwnerOrShared ← X.session ≠ NULL AND X.fileOwnerUserId ≠ X.session.userId AND NOT hasFreigabe(X.songId, X.session.userId)

  RETURN isUploadEndpoint AND (isUnauthenticated OR isNotOwnerOrShared)
END FUNCTION
```

### Fix-Checking-Eigenschaft

```pascal
// Eigenschaft: Fix-Checking – Unauthentifizierte/Unbefugte Anfragen werden abgelehnt
FOR ALL X WHERE isBugCondition(X) DO
  result ← handleUploadRequest'(X)
  IF X.session = NULL THEN
    ASSERT result.status = 401
  ELSE
    ASSERT result.status = 403
  END IF
  ASSERT result.body DOES NOT CONTAIN file_content
END FOR
```

### Preservation-Checking-Eigenschaft

```pascal
// Eigenschaft: Preservation-Checking – Berechtigte Anfragen funktionieren weiterhin
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT handleUploadRequest(X) = handleUploadRequest'(X)
END FOR
```
