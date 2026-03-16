# PDF-Import ESM-Fix — Bugfix-Design

## Übersicht

Die `pdf-parse`-Bibliothek stellt in ihrem ESM-Build keinen Default-Export bereit. Seit dem Upgrade auf Next.js 16.1.6 mit Turbopack erzwingt der Bundler strikte ESM-Modulauflösung, wodurch `import pdf from "pdf-parse"` mit dem Fehler "Export default doesn't exist in target module" fehlschlägt. Der Fix besteht darin, den Default-Import durch einen Namespace-Import (`import * as pdfParse from "pdf-parse"`) zu ersetzen und den Aufruf entsprechend anzupassen. Der bestehende Test-Mock muss ebenfalls aktualisiert werden.

## Glossar

- **Bug_Condition (C)**: Der Zustand, in dem `import pdf from "pdf-parse"` als Default-Import verwendet wird, was unter strikter ESM-Auflösung (Turbopack) zum Build-Fehler führt.
- **Property (P)**: Das gewünschte Verhalten — der Import ist ESM-kompatibel, der Build läuft fehlerfrei durch, und die PDF-Parsing-Funktionalität arbeitet identisch wie zuvor.
- **Preservation**: Alle bestehenden Validierungen (Auth, Dateityp, Dateigröße, leerer Text, LLM-Fehler) und das Antwortformat müssen unverändert bleiben.
- **`POST`-Handler**: Die Funktion in `src/app/api/songs/parse-pdf/route.ts`, die PDF-Dateien entgegennimmt, parst und via OpenAI strukturiert zurückgibt.
- **`pdf-parse`**: Die Bibliothek zum Extrahieren von Text aus PDF-Buffern. Stellt in ESM nur Named/Namespace-Exports bereit.

## Fehlerdetails

### Bug Condition

Der Bug tritt auf, wenn die Route `src/app/api/songs/parse-pdf/route.ts` mit `import pdf from "pdf-parse"` kompiliert wird. Turbopack (Next.js 16.1.6) erzwingt strikte ESM-Auflösung und erkennt, dass `pdf-parse` keinen `export default` in seinem ESM-Entry-Point hat.

**Formale Spezifikation:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { importStatement: string, bundler: string }
  OUTPUT: boolean

  RETURN input.importStatement MATCHES "import <identifier> from 'pdf-parse'"
         AND input.bundler == "turbopack"
         AND pdfParseModule HAS NO default export
END FUNCTION
```

### Beispiele

- **Beispiel 1**: `import pdf from "pdf-parse"` unter Turbopack → Build-Fehler "Export default doesn't exist in target module". Erwartet: Build läuft fehlerfrei.
- **Beispiel 2**: `import * as pdfParse from "pdf-parse"` unter Turbopack → Build erfolgreich, `pdfParse.default(buffer)` oder `pdfParse(buffer)` funktioniert. Erwartet: PDF-Text wird korrekt extrahiert.
- **Beispiel 3**: Test-Mock mit `vi.mock("pdf-parse", () => ({ default: ... }))` → Mock greift nicht korrekt, wenn der Produktionscode keinen Default-Import mehr nutzt. Erwartet: Mock muss zum neuen Import-Stil passen.

## Erwartetes Verhalten

### Preservation-Anforderungen

**Unveränderte Verhaltensweisen:**
- Nicht-authentifizierte Anfragen erhalten weiterhin Status 401 mit "Nicht authentifiziert"
- Fehlende Datei im FormData ergibt weiterhin Status 400 mit "Keine Datei hochgeladen"
- Nicht-PDF-Dateien ergeben weiterhin Status 400 mit Hinweis auf PDF-Format
- Dateien > 5MB ergeben weiterhin Status 400 mit "Datei darf maximal 5MB groß sein"
- PDFs ohne extrahierbaren Text ergeben weiterhin Status 400 mit "PDF enthält keinen extrahierbaren Text"
- Ungültige LLM-Antworten ergeben weiterhin Status 500 mit entsprechender Fehlermeldung
- Das JSON-Antwortformat `{ titel, kuenstler, text }` bleibt identisch

**Scope:**
Alle Eingaben, die NICHT den `pdf-parse`-Import betreffen, sind von diesem Fix vollständig unbeeinflusst. Das umfasst:
- Authentifizierungsprüfung
- FormData-Validierung (Datei vorhanden, Typ, Größe)
- OpenAI-Aufruf und Antwortverarbeitung
- Fehlerbehandlung und HTTP-Statuscodes

## Hypothetische Ursache

Basierend auf der Fehleranalyse ist die Ursache eindeutig:

1. **Fehlender Default-Export in `pdf-parse` ESM-Build**: Die Bibliothek `pdf-parse` (v2.4.5) stellt in ihrem ESM-Entry-Point (`dist/pdf-parse/esm/index.js`) keinen `export default` bereit. Unter CommonJS funktionierte `module.exports = function(...)` als impliziter Default-Export, aber unter strikter ESM-Auflösung (Turbopack) ist dies nicht der Fall.

2. **Turbopack erzwingt strikte ESM-Semantik**: Im Gegensatz zu Webpack, das CJS-Module mit synthetischen Default-Exports wrappen kann, behandelt Turbopack ESM-Module strikt. Ein `import x from "module"` erfordert einen expliziten `export default` im Zielmodul.

3. **Test-Mock spiegelt alten Import-Stil**: Der Mock in `__tests__/songs/parse-pdf-api.test.ts` exportiert `{ default: fn }`, was zum Default-Import passt. Nach dem Fix auf Namespace-Import muss der Mock die Funktion direkt als Modul-Export bereitstellen.

## Correctness Properties

Property 1: Bug Condition — ESM-kompatibler Import ermöglicht PDF-Parsing

_For any_ Eingabe, bei der eine gültige PDF-Datei von einem authentifizierten Nutzer hochgeladen wird, SOLL die gefixte Route den PDF-Text erfolgreich über `pdf-parse` extrahieren und das strukturierte Ergebnis als JSON zurückgeben — identisch zum Verhalten vor dem ESM-Fehler.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Validierungen und Fehlerbehandlung bleiben unverändert

_For any_ Eingabe, bei der die Bug Condition NICHT zutrifft (d.h. alle Anfragen, die nicht den PDF-Parsing-Pfad erreichen: fehlende Auth, fehlende Datei, falscher Dateityp, zu große Datei, leerer PDF-Text, LLM-Fehler), SOLL die gefixte Route exakt dasselbe Verhalten wie die ursprüngliche Route zeigen — gleiche Statuscodes, gleiche Fehlermeldungen.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix-Implementierung

### Erforderliche Änderungen

Da die Ursache eindeutig im Import-Statement liegt:

**Datei**: `src/app/api/songs/parse-pdf/route.ts`

**Funktion**: `POST` (gesamte Route)

**Konkrete Änderungen**:
1. **Import-Statement ändern**: `import pdf from "pdf-parse"` ersetzen durch `import * as pdfParse from "pdf-parse"`
2. **Aufruf anpassen**: `pdf(buffer)` ersetzen durch `pdfParse.default(buffer)` (da der Namespace-Import das CJS-`module.exports` als `.default` Property bereitstellt) — alternativ direkt `pdfParse(buffer)` falls die Bibliothek als callable exportiert wird. Die genaue Aufrufform muss beim Implementieren geprüft werden.

**Datei**: `__tests__/songs/parse-pdf-api.test.ts`

**Konkrete Änderungen**:
3. **Mock anpassen**: Den `vi.mock("pdf-parse", ...)` Block aktualisieren, sodass er zum neuen Namespace-Import-Stil passt. Statt `{ default: fn }` muss der Mock so strukturiert sein, dass `import * as pdfParse from "pdf-parse"` korrekt aufgelöst wird.

## Teststrategie

### Validierungsansatz

Die Teststrategie folgt einem zweiphasigen Ansatz: Zuerst Gegenbeispiele aufdecken, die den Bug im ungefixten Code demonstrieren, dann verifizieren, dass der Fix korrekt funktioniert und bestehendes Verhalten bewahrt.

### Explorative Bug-Condition-Prüfung

**Ziel**: Gegenbeispiele aufdecken, die den Bug VOR der Implementierung des Fixes demonstrieren. Die Ursachenanalyse bestätigen oder widerlegen.

**Testplan**: Den Build mit dem aktuellen Default-Import ausführen und den Turbopack-Fehler reproduzieren. Alternativ einen Unit-Test schreiben, der den Import simuliert und das Fehlen des Default-Exports verifiziert.

**Testfälle**:
1. **Build-Fehler-Reproduktion**: `next build` mit aktuellem Code ausführen (wird mit "Export default doesn't exist" fehlschlagen)
2. **Import-Auflösungstest**: Prüfen, dass `pdf-parse` ESM-Entry keinen Default-Export hat (wird auf ungefixtem Code fehlschlagen)

**Erwartete Gegenbeispiele**:
- Build schlägt mit "Export default doesn't exist in target module" fehl
- Ursache: `pdf-parse` ESM-Build hat keinen `export default`

### Fix-Prüfung

**Ziel**: Verifizieren, dass für alle Eingaben, bei denen die Bug Condition zutrifft, die gefixte Funktion das erwartete Verhalten zeigt.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := POST_fixed(input)
  ASSERT result.status == 200
  ASSERT result.body HAS { titel: string, kuenstler: string, text: string }
END FOR
```

### Preservation-Prüfung

**Ziel**: Verifizieren, dass für alle Eingaben, bei denen die Bug Condition NICHT zutrifft, die gefixte Funktion dasselbe Ergebnis wie die ursprüngliche Funktion liefert.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT POST_original(input) = POST_fixed(input)
END FOR
```

**Testansatz**: Property-Based Testing wird für die Preservation-Prüfung empfohlen, da:
- Es automatisch viele Testfälle über den Eingabebereich generiert
- Es Randfälle abdeckt, die manuelle Unit-Tests übersehen könnten
- Es starke Garantien bietet, dass das Verhalten für alle nicht-betroffenen Eingaben unverändert bleibt

**Testplan**: Verhalten auf UNGEFIXTEM Code zuerst für Validierungspfade beobachten, dann Property-Based Tests schreiben, die dieses Verhalten festhalten.

**Testfälle**:
1. **Auth-Preservation**: Verifizieren, dass nicht-authentifizierte Anfragen weiterhin 401 erhalten
2. **Validierungs-Preservation**: Verifizieren, dass fehlende Datei, falscher Typ und Größenüberschreitung weiterhin korrekte 400-Fehler liefern
3. **Leerer-Text-Preservation**: Verifizieren, dass PDFs ohne Text weiterhin 400 ergeben
4. **LLM-Fehler-Preservation**: Verifizieren, dass ungültige LLM-Antworten weiterhin 500 ergeben

### Unit Tests

- Test des erfolgreichen PDF-Parsing-Flows mit Namespace-Import
- Test aller Validierungspfade (Auth, Datei, Typ, Größe, leerer Text)
- Test der LLM-Fehlerbehandlung (kein Content, ungültiges JSON, ungültiges Format)

### Property-Based Tests

- Generierung zufälliger Dateigrößen und -typen zur Verifikation der Validierungslogik
- Generierung zufälliger LLM-Antworten zur Verifikation der Fehlerbehandlung
- Verifikation, dass alle Nicht-PDF-Parsing-Pfade identisches Verhalten zeigen

### Integration Tests

- Vollständiger Flow: PDF hochladen → Text extrahieren → LLM-Verarbeitung → JSON-Antwort
- Verifikation, dass der bestehende Test (`parse-pdf-api.test.ts`) mit angepasstem Mock weiterhin besteht
- Build-Verifikation: `next build` läuft fehlerfrei mit dem neuen Import-Stil durch
