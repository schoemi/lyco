# Bugfix-Anforderungen

## Einleitung

Die PDF-Import-Funktion (`POST /api/songs/parse-pdf`) ist seit dem Upgrade auf Next.js 16.1.6 mit Turbopack vollständig defekt. Die Bibliothek `pdf-parse` stellt in ihrem ESM-Build keinen Default-Export bereit, was zum Build-Fehler "Export default doesn't exist in target module" führt. Dadurch können Nutzer keine PDF-Dateien hochladen und Songtexte extrahieren lassen.

## Fehleranalyse

### Aktuelles Verhalten (Defekt)

1.1 WENN die Route `src/app/api/songs/parse-pdf/route.ts` mit `import pdf from "pdf-parse"` importiert wird, DANN schlägt der Build mit dem Fehler "Export default doesn't exist in target module" fehl, da `pdf-parse` in seinem ESM-Build (`dist/pdf-parse/esm/index.js`) keinen Default-Export bereitstellt.

1.2 WENN ein Nutzer versucht, eine PDF-Datei über die Import-Funktion hochzuladen, DANN ist die gesamte Route nicht erreichbar, da der Build-Fehler die Kompilierung der Route verhindert.

### Erwartetes Verhalten (Korrekt)

2.1 WENN die Route `src/app/api/songs/parse-pdf/route.ts` die `pdf-parse`-Bibliothek importiert, DANN SOLL der Import ESM-kompatibel sein (z.B. über einen Named Import oder Namespace-Import), sodass der Build unter Next.js 16.1.6 mit Turbopack fehlerfrei durchläuft.

2.2 WENN ein Nutzer eine gültige PDF-Datei über die Import-Funktion hochlädt, DANN SOLL die Route den PDF-Text erfolgreich extrahieren und das Ergebnis als JSON zurückgeben — identisch zum bisherigen Verhalten vor dem Build-Fehler.

### Unverändertes Verhalten (Regressionsprävention)

3.1 WENN ein nicht-authentifizierter Nutzer die Route aufruft, DANN SOLL das System WEITERHIN mit Status 401 und der Fehlermeldung "Nicht authentifiziert" antworten.

3.2 WENN keine Datei im FormData enthalten ist, DANN SOLL das System WEITERHIN mit Status 400 und der Fehlermeldung "Keine Datei hochgeladen" antworten.

3.3 WENN eine Nicht-PDF-Datei hochgeladen wird, DANN SOLL das System WEITERHIN mit Status 400 und einer Fehlermeldung antworten, die auf das PDF-Format hinweist.

3.4 WENN eine Datei größer als 5MB hochgeladen wird, DANN SOLL das System WEITERHIN mit Status 400 und der Fehlermeldung "Datei darf maximal 5MB groß sein" antworten.

3.5 WENN die PDF-Datei keinen extrahierbaren Text enthält, DANN SOLL das System WEITERHIN mit Status 400 und der Fehlermeldung "PDF enthält keinen extrahierbaren Text" antworten.

3.6 WENN die OpenAI-Antwort kein gültiges JSON ist oder ein ungültiges Format hat, DANN SOLL das System WEITERHIN mit Status 500 und einer entsprechenden Fehlermeldung antworten.

3.7 WENN der bestehende Test (`__tests__/songs/parse-pdf-api.test.ts`) ausgeführt wird, DANN SOLL er WEITERHIN erfolgreich durchlaufen (ggf. mit angepasstem Mock für den neuen Import-Stil).
