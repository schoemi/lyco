# Tag-Save-Server-Error Bugfix Design

## Übersicht

Beim Erstellen eines neuen Tags über den POST-Endpoint `/api/tag-definitions` tritt ein HTTP 500 Serverfehler auf. Die `createTagDefinition`-Funktion ruft `prisma.tagDefinition.create()` über den PrismaPg-Driver-Adapter (Prisma 7.x) auf, wobei der geworfene Fehler nicht als `Error`-Instanz erkannt wird und im generischen Catch-Block landet. Der Fix zielt darauf ab, das Error-Handling im Route-Handler und ggf. im Service robuster zu gestalten, sodass sowohl Standard-`Error`-Objekte als auch Adapter-spezifische Fehlerformate korrekt behandelt werden.

## Glossar

- **Bug_Condition (C)**: Die Bedingung, die den Bug auslöst — ein POST-Request mit gültigen Tag-Daten, bei dem `prisma.tagDefinition.create()` über den PrismaPg-Adapter einen Fehler wirft, der nicht `instanceof Error` ist
- **Property (P)**: Das gewünschte Verhalten — ein POST mit gültigen Daten erstellt den Tag erfolgreich (HTTP 201) oder gibt einen spezifischen, verständlichen Fehler zurück
- **Preservation**: Bestehendes Verhalten (Auth-Checks, Validierung, Duplikat-Erkennung, GET/PUT/DELETE), das durch den Fix unverändert bleiben muss
- **createTagDefinition**: Die Service-Funktion in `src/lib/services/tag-definition-service.ts`, die einen neuen Tag-Datensatz über Prisma anlegt
- **PrismaPg-Adapter**: Der `@prisma/adapter-pg` Driver-Adapter (v7.5.0), der Prisma-Operationen über eine direkte PostgreSQL-Verbindung ausführt
- **Route-Handler**: Die POST-Funktion in `src/app/api/tag-definitions/route.ts`, die Requests entgegennimmt und an den Service delegiert

## Bug-Details

### Bug Condition

Der Bug manifestiert sich, wenn ein authentifizierter Admin-User einen POST-Request mit gültigen Tag-Daten an `/api/tag-definitions` sendet. Die `createTagDefinition`-Funktion führt `prisma.tagDefinition.create()` aus, wobei der PrismaPg-Adapter einen Fehler wirft, der im Catch-Block des Route-Handlers nicht als bekannter Fehlertyp erkannt wird.

**Formale Spezifikation:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { method: string, body: CreateTagDefinitionInput, session: Session }
  OUTPUT: boolean

  RETURN input.method == "POST"
         AND input.session.user != null
         AND input.session.user.role == "ADMIN"
         AND isValid(input.body)  // alle Pflichtfelder vorhanden und korrekt typisiert
         AND NOT tagAlreadyExists(input.body.tag)
         AND prismaCreateThrowsNonErrorObject(input.body)
END FUNCTION
```

### Beispiele

- **Beispiel 1**: Admin sendet `{ tag: "belt", label: "Belting", icon: "fa-solid fa-microphone", color: "#ef4444", indexNr: 1 }` → Erwartet: HTTP 201 mit erstelltem Tag. Tatsächlich: HTTP 500 `{ error: "Interner Serverfehler" }`
- **Beispiel 2**: Admin sendet `{ tag: "vibrato", label: "Vibrato", icon: "fa-solid fa-wave-square", color: "#3b82f6", indexNr: 2 }` → Erwartet: HTTP 201. Tatsächlich: HTTP 500
- **Beispiel 3**: Admin sendet Tag mit Icon-Klasse mit Leerzeichen `"fa-solid fa-volume-high"` → Erwartet: HTTP 201. Tatsächlich: HTTP 500
- **Edge Case**: Admin sendet `{ tag: "test", ..., indexNr: 0 }` mit indexNr=0 → Erwartet: HTTP 201 (0 ist gültig). Tatsächlich: HTTP 500

## Erwartetes Verhalten

### Preservation Requirements

**Unverändertes Verhalten:**
- Nicht-authentifizierte Requests müssen weiterhin HTTP 401 zurückgeben
- Requests von Usern mit Rolle "USER" müssen weiterhin HTTP 403 zurückgeben
- Fehlende oder leere Pflichtfelder müssen weiterhin HTTP 400 mit feldspezifischer Meldung zurückgeben
- Duplikat-Tags (gleicher `tag`-Wert) müssen weiterhin HTTP 409 zurückgeben
- GET `/api/tag-definitions` muss weiterhin alle Definitionen sortiert nach indexNr zurückgeben
- PUT `/api/tag-definitions/[id]` muss weiterhin korrekt aktualisieren
- DELETE `/api/tag-definitions/[id]` muss weiterhin korrekt löschen

**Scope:**
Alle Inputs, die NICHT die `prisma.tagDefinition.create()`-Operation im POST-Handler betreffen, sollen durch den Fix vollständig unberührt bleiben. Dies umfasst:
- Alle GET-Requests
- Alle PUT- und DELETE-Requests
- POST-Requests mit fehlender Authentifizierung
- POST-Requests mit fehlender Autorisierung
- POST-Requests mit ungültigen Daten (Validierungsfehler)
- POST-Requests mit Duplikat-Tags

## Hypothese zur Ursache

Basierend auf der Bug-Analyse sind die wahrscheinlichsten Ursachen:

1. **PrismaPg-Adapter wirft Nicht-Error-Objekte**: Der `@prisma/adapter-pg` Driver-Adapter in Prisma 7.x kann bei Datenbankfehlern Objekte werfen, die nicht `instanceof Error` sind (z.B. Plain Objects mit `message`-Property, oder Strings). Der Catch-Block im Route-Handler prüft `error instanceof Error`, was für solche Objekte `false` ergibt — der Duplikat-Check wird übersprungen und der generische 500-Fehler zurückgegeben.

2. **Verbindungsproblem im Next.js-Kontext**: Der PrismaPg-Adapter erstellt die Verbindung mit `new PrismaPg({ connectionString })`. Im Next.js-Server-Kontext könnte die Verbindung zwischen dem `findUnique`-Check und dem `create`-Aufruf in einen ungültigen Zustand geraten, besonders bei Hot-Reload oder Edge-Runtime-Wechseln.

3. **Fehlende Fehlerbehandlung für Adapter-spezifische Fehlertypen**: Prisma 7.x mit Driver-Adaptern verwendet möglicherweise andere Fehlerklassen als das klassische `PrismaClientKnownRequestError`. Der Code behandelt nur `Error`-Instanzen, nicht aber Prisma-spezifische Fehlertypen.

4. **Sequentielle Operationen verursachen Adapter-Zustandsfehler**: Die `createTagDefinition`-Funktion führt erst `findUnique` und dann `create` aus. Der PrismaPg-Adapter könnte bei dieser Sequenz einen internen Zustandsfehler haben, der zu einem nicht-standardmäßigen Fehler führt.

## Correctness Properties

Property 1: Bug Condition - Tag-Erstellung mit gültigen Daten

_For any_ POST-Request mit gültigen Tag-Daten (tag, label, icon, color, indexNr), gesendet von einem authentifizierten Admin-User, wobei kein Tag mit dem gleichen Kürzel existiert, SHALL der fixierte POST-Handler den Tag erfolgreich in der Datenbank erstellen und HTTP 201 mit dem vollständigen Tag-Objekt (id, tag, label, icon, color, indexNr) zurückgeben.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Bestehende Fehlerbehandlung und Endpunkte

_For any_ Input, der NICHT die Bug-Condition erfüllt (nicht-authentifizierte Requests, nicht-autorisierte Requests, ungültige Daten, Duplikat-Tags, GET/PUT/DELETE-Requests), SHALL der fixierte Code exakt das gleiche Verhalten wie der ursprüngliche Code produzieren, einschließlich identischer HTTP-Statuscodes und Fehlermeldungen.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix-Implementierung

### Erforderliche Änderungen

Angenommen unsere Ursachenanalyse ist korrekt:

**Datei**: `src/app/api/tag-definitions/route.ts`

**Funktion**: `POST`

**Spezifische Änderungen**:
1. **Robusteres Error-Handling im Catch-Block**: Die Prüfung `error instanceof Error` durch eine breitere Fehlerextraktion ersetzen, die auch Nicht-Error-Objekte behandelt (z.B. über `String(error)` oder Prüfung auf `message`-Property)
2. **Fehler-Message-Extraktion verbessern**: Eine Hilfsfunktion einführen, die die Fehlermeldung aus verschiedenen Fehlerformaten extrahiert (`Error`-Instanzen, Plain Objects mit `message`, Strings)
3. **Duplikat-Check auf Message-String statt instanceof**: Den Duplikat-Fehler-Check so anpassen, dass er die Fehlermeldung unabhängig vom Fehlertyp prüft
4. **Verbessertes Logging**: Die `console.error`-Ausgabe um den Fehlertyp (`typeof error`, `error?.constructor?.name`) erweitern, um zukünftige Debugging-Probleme zu vermeiden

**Datei**: `src/lib/services/tag-definition-service.ts`

**Funktion**: `createTagDefinition`

**Spezifische Änderungen**:
5. **Try-Catch um prisma.create wrappen**: Die `prisma.tagDefinition.create()`-Operation in einen eigenen Try-Catch einschließen, der Adapter-Fehler abfängt und als Standard-`Error` re-throwt
6. **Alternativ: findUnique-Check entfernen**: Statt erst `findUnique` und dann `create` auszuführen, direkt `create` aufrufen und den Unique-Constraint-Fehler der Datenbank abfangen — dies reduziert die Anzahl der Adapter-Aufrufe und vermeidet potenzielle Zustandsprobleme

## Teststrategie

### Validierungsansatz

Die Teststrategie folgt einem zweiphasigen Ansatz: Zuerst Gegenbeispiele finden, die den Bug auf dem unfixierten Code demonstrieren, dann verifizieren, dass der Fix korrekt funktioniert und bestehendes Verhalten bewahrt.

### Exploratory Bug Condition Checking

**Ziel**: Gegenbeispiele finden, die den Bug VOR der Implementierung des Fixes demonstrieren. Die Ursachenanalyse bestätigen oder widerlegen. Bei Widerlegung muss neu hypothetisiert werden.

**Testplan**: Tests schreiben, die den POST-Handler mit gültigen Tag-Daten aufrufen und prüfen, ob HTTP 201 zurückkommt. Diese Tests auf dem UNFIXIERTEN Code ausführen, um Fehler zu beobachten und die Ursache zu verstehen.

**Testfälle**:
1. **Einfacher Tag-Erstellen-Test**: POST mit `{ tag: "test", label: "Test", icon: "fa-solid fa-star", color: "#000", indexNr: 1 }` (wird auf unfixiertem Code fehlschlagen)
2. **Icon mit Leerzeichen**: POST mit `icon: "fa-solid fa-microphone"` (wird auf unfixiertem Code fehlschlagen)
3. **Verschiedene indexNr-Werte**: POST mit indexNr=0, indexNr=99 (wird auf unfixiertem Code fehlschlagen)
4. **Mehrere Tags nacheinander**: Zwei verschiedene Tags erstellen (wird auf unfixiertem Code fehlschlagen)

**Erwartete Gegenbeispiele**:
- HTTP 500 statt HTTP 201 bei gültigen Inputs
- Mögliche Ursachen: PrismaPg-Adapter wirft Nicht-Error-Objekt, Verbindungsproblem, Adapter-Zustandsfehler

### Fix Checking

**Ziel**: Verifizieren, dass für alle Inputs, bei denen die Bug-Condition gilt, die fixierte Funktion das erwartete Verhalten produziert.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := POST_fixed("/api/tag-definitions", input)
  ASSERT result.status == 201
  ASSERT result.body.definition.id IS NOT NULL
  ASSERT result.body.definition.tag == input.tag
  ASSERT result.body.definition.label == input.label
  ASSERT result.body.definition.icon == input.icon
  ASSERT result.body.definition.color == input.color
  ASSERT result.body.definition.indexNr == input.indexNr
END FOR
```

### Preservation Checking

**Ziel**: Verifizieren, dass für alle Inputs, bei denen die Bug-Condition NICHT gilt, die fixierte Funktion das gleiche Ergebnis wie die ursprüngliche Funktion produziert.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT POST_original(input) = POST_fixed(input)
END FOR
```

**Testansatz**: Property-Based Testing wird für Preservation Checking empfohlen, weil:
- Es automatisch viele Testfälle über den Input-Bereich generiert
- Es Edge Cases findet, die manuelle Unit-Tests übersehen könnten
- Es starke Garantien bietet, dass das Verhalten für alle nicht-buggy Inputs unverändert ist

**Testplan**: Verhalten auf UNFIXIERTEM Code zuerst für Auth-Checks, Validierung und Duplikat-Erkennung beobachten, dann Property-Based Tests schreiben, die dieses Verhalten erfassen.

**Testfälle**:
1. **Auth-Preservation**: Verifizieren, dass nicht-authentifizierte Requests weiterhin HTTP 401 zurückgeben
2. **Rollen-Preservation**: Verifizieren, dass USER-Rolle weiterhin HTTP 403 zurückgibt
3. **Validierungs-Preservation**: Verifizieren, dass fehlende Pflichtfelder weiterhin HTTP 400 zurückgeben
4. **Duplikat-Preservation**: Verifizieren, dass Duplikat-Tags weiterhin HTTP 409 zurückgeben

### Unit Tests

- Test der POST-Route mit gültigen Daten → HTTP 201
- Test des Error-Handlings mit verschiedenen Fehlertypen (Error, Plain Object, String)
- Test der verbesserten Fehler-Message-Extraktion
- Test der createTagDefinition-Funktion mit gemocktem Prisma-Client

### Property-Based Tests

- Generiere zufällige gültige CreateTagDefinitionInput-Objekte und verifiziere, dass die Erstellung erfolgreich ist
- Generiere zufällige ungültige Inputs (fehlende Felder, falsche Typen) und verifiziere, dass die Validierung greift
- Generiere zufällige Fehlertypen (Error, Object, String) und verifiziere, dass das Error-Handling alle korrekt behandelt

### Integration Tests

- Vollständiger Flow: Tag erstellen → Tag in GET-Liste finden → Tag aktualisieren → Tag löschen
- Tag erstellen mit allen möglichen Icon-Klassen (mit Leerzeichen)
- Duplikat-Erkennung nach erfolgreicher Erstellung
