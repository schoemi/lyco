# Anforderungsdokument: Automatische Songtext-Übersetzung

## Einleitung

Dieses Dokument beschreibt die Anforderungen für die LLM-basierte automatische Übersetzung von Songtexten in der Songtext-Lern-Webanwendung „Lyco". Das Feature nutzt den bestehenden LLM-Client, um Songtexte zeilenweise in eine konfigurierbare Zielsprache zu übersetzen. Die Übersetzungen werden an den einzelnen Zeilen (Feld `uebersetzung` im Zeile-Modell) gespeichert und stehen der bestehenden Emotional-Lernen-Ansicht (Übersetzungs-Tab mit Aufdecken-Interaktion) als Datengrundlage zur Verfügung.

Das Feature folgt dem bestehenden Architekturmuster der Smart-Song-Analysis: API-Route → Service → LLM-Client → Prisma. Der bestehende LLM-Client (`src/lib/services/llm-client.ts`) wird wiederverwendet.

## Glossar

- **Anwendung**: Die Songtext-Lern-Webanwendung „Lyco" als Gesamtsystem
- **Uebersetzungs_Service**: Die serverseitige Komponente, die LLM-Anfragen für die Songtext-Übersetzung orchestriert und die Ergebnisse zeilenweise speichert
- **LLM_Client**: Die bestehende Komponente, die HTTP-Anfragen an die LLM-API sendet und Antworten empfängt (aus `src/lib/services/llm-client.ts`)
- **Zielsprache**: Die Sprache, in die der Songtext übersetzt werden soll (z.B. „Deutsch" für englische Songs)
- **Zeile**: Eine einzelne Textzeile innerhalb einer Strophe, die ein optionales Feld `uebersetzung` besitzt
- **Uebersetzungs_Prompt**: Die strukturierte Eingabeaufforderung, die an das LLM gesendet wird, um eine zeilenweise Übersetzung zu erzeugen
- **Song_Sprache**: Die Originalsprache des Songs, gespeichert im optionalen Feld `sprache` des Song-Modells

## Anforderungen

### Anforderung 1: Zeilenweise Übersetzung generieren

**User Story:** Als Benutzer möchte ich eine automatische Übersetzung meines Songtextes erhalten, damit ich den Inhalt fremdsprachiger Songs besser verstehen und lernen kann.

#### Akzeptanzkriterien

1. WHEN ein authentifizierter Benutzer eine Übersetzung für einen eigenen Song anfordert, THE Uebersetzungs_Service SHALL den vollständigen Songtext (alle Strophen und Zeilen) zusammenstellen und als Uebersetzungs_Prompt an den LLM_Client senden.
2. THE Uebersetzungs_Service SHALL die Übersetzung zeilenweise vom LLM anfordern, sodass jede Originalzeile genau einer Übersetzungszeile zugeordnet ist.
3. WHEN der LLM_Client eine gültige Antwort zurückgibt, THE Uebersetzungs_Service SHALL die Übersetzung jeder Zeile im Feld `uebersetzung` des Zeile-Modells speichern.
4. IF der Song keine Strophen oder Zeilen enthält, THEN THE Uebersetzungs_Service SHALL die Anfrage mit einer beschreibenden Fehlermeldung ablehnen.
5. IF bereits Übersetzungen für die Zeilen existieren, THEN THE Uebersetzungs_Service SHALL die bestehenden Übersetzungen überschreiben (Neuübersetzung ermöglichen).

### Anforderung 2: Konfigurierbare Zielsprache

**User Story:** Als Benutzer möchte ich die Zielsprache der Übersetzung angeben können, damit ich Songtexte in meine bevorzugte Sprache übersetzen lassen kann.

#### Akzeptanzkriterien

1. THE Uebersetzungs_Service SHALL eine Zielsprache als Parameter beim Auslösen der Übersetzung akzeptieren.
2. IF keine Zielsprache angegeben wird, THEN THE Uebersetzungs_Service SHALL „Deutsch" als Standard-Zielsprache verwenden.
3. THE Uebersetzungs_Service SHALL die angegebene Zielsprache im Uebersetzungs_Prompt an das LLM übergeben.
4. IF die angegebene Zielsprache ein leerer String ist, THEN THE Uebersetzungs_Service SHALL die Anfrage mit einer beschreibenden Fehlermeldung ablehnen.

### Anforderung 3: Prompt-Struktur und Antwort-Validierung

**User Story:** Als Entwickler möchte ich eine klar definierte Prompt-Struktur und Antwort-Validierung haben, damit die LLM-Übersetzungen konsistent und zeilenweise zuordenbar sind.

#### Akzeptanzkriterien

1. THE Uebersetzungs_Service SHALL den Uebersetzungs_Prompt als strukturierte Nachricht mit System-Prompt und User-Prompt zusammenstellen.
2. THE Uebersetzungs_Service SHALL im System-Prompt die Rolle des LLM als professionellen Songtext-Übersetzer definieren, der den poetischen Charakter und die emotionale Bedeutung des Textes bewahrt.
3. THE Uebersetzungs_Service SHALL im User-Prompt den Songtitel, den Künstler (falls vorhanden), die Zielsprache und den vollständigen Songtext mit Strophen-Struktur übergeben.
4. THE Uebersetzungs_Service SHALL das LLM anweisen, die Antwort als JSON-Objekt zurückzugeben, das für jede Strophe ein Array von Übersetzungszeilen enthält, wobei die Reihenfolge der Übersetzungszeilen exakt der Reihenfolge der Originalzeilen entspricht.
5. WHEN die LLM-Antwort nicht dem erwarteten JSON-Schema entspricht, THE Uebersetzungs_Service SHALL die Antwort verwerfen und eine beschreibende Fehlermeldung zurückgeben.
6. WHEN die Anzahl der Übersetzungszeilen in der LLM-Antwort nicht mit der Anzahl der Originalzeilen pro Strophe übereinstimmt, THE Uebersetzungs_Service SHALL die Antwort verwerfen und eine beschreibende Fehlermeldung zurückgeben.
7. FOR ALL gültige Song-Objekte mit Strophen und Zeilen, das Formatieren als Prompt und anschließende Parsen der LLM-Antwort SHALL ein konsistentes Ergebnisobjekt liefern, bei dem jede Originalzeile genau einer nicht-leeren Übersetzungszeile zugeordnet ist (Round-Trip-Eigenschaft der Prompt-Formatierung und Antwort-Validierung).

### Anforderung 4: Übersetzungs-API-Endpunkt

**User Story:** Als Frontend-Entwickler möchte ich einen API-Endpunkt haben, über den die Songtext-Übersetzung ausgelöst und der Übersetzungsstatus abgerufen werden kann.

#### Akzeptanzkriterien

1. THE Anwendung SHALL einen POST-Endpunkt unter `/api/songs/[id]/translate` bereitstellen, der die LLM-basierte Übersetzung für den angegebenen Song auslöst.
2. THE POST-Endpunkt SHALL einen optionalen Parameter `zielsprache` im Request-Body akzeptieren.
3. WHEN die Übersetzung erfolgreich abgeschlossen ist, THE API_Route SHALL die gespeicherten Übersetzungen als JSON-Antwort zurückgeben, gruppiert nach Strophen mit den zugehörigen Zeilen-Übersetzungen.
4. THE Anwendung SHALL einen GET-Endpunkt unter `/api/songs/[id]/translate` bereitstellen, der die gespeicherten Übersetzungen des Songs zurückgibt, ohne eine neue LLM-Anfrage auszulösen.
5. WHEN eine API_Route eine Anfrage ohne gültige Session erhält, THE API_Route SHALL die Anfrage mit HTTP-Statuscode 401 ablehnen.
6. IF ein Benutzer versucht, die Übersetzung eines Songs eines anderen Benutzers auszulösen oder abzurufen, THEN THE API_Route SHALL die Anfrage mit HTTP-Statuscode 403 ablehnen.
7. THE API_Route SHALL bei ungültiger Song-ID HTTP-Statuscode 404 zurückgeben.

### Anforderung 5: Fehlerbehandlung und Resilienz

**User Story:** Als Benutzer möchte ich bei Fehlern der LLM-Übersetzung eine verständliche Rückmeldung erhalten, damit ich weiß, dass die Übersetzung nicht erfolgreich war.

#### Akzeptanzkriterien

1. IF der LLM_Client einen Timeout-Fehler zurückgibt, THEN THE Uebersetzungs_Service SHALL die Fehlermeldung „Die Übersetzung konnte nicht abgeschlossen werden. Bitte versuche es später erneut." an den Aufrufer zurückgeben.
2. IF der LLM_Client einen Rate-Limit-Fehler (HTTP 429) zurückgibt, THEN THE Uebersetzungs_Service SHALL die Fehlermeldung „Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut." an den Aufrufer zurückgeben.
3. IF die LLM-Antwort nicht als gültiges JSON geparst werden kann, THEN THE Uebersetzungs_Service SHALL die Fehlermeldung „Die Übersetzung konnte nicht verarbeitet werden. Bitte versuche es erneut." an den Aufrufer zurückgeben.
4. WHILE eine Übersetzung für einen Song bereits läuft, THE Uebersetzungs_Service SHALL weitere Übersetzungs-Anfragen für denselben Song mit HTTP-Statuscode 409 und der Meldung „Eine Übersetzung läuft bereits für diesen Song." ablehnen.
5. THE Uebersetzungs_Service SHALL alle LLM-Fehler mit Zeitstempel, Song-ID und Fehlerdetails protokollieren.

### Anforderung 6: Integration mit bestehendem Datenmodell

**User Story:** Als Entwickler möchte ich, dass die Übersetzungen im bestehenden Feld `uebersetzung` der Zeile gespeichert werden, damit die Emotional-Lernen-Ansicht die Übersetzungen ohne Änderungen anzeigen kann.

#### Akzeptanzkriterien

1. THE Uebersetzungs_Service SHALL die Übersetzungen im bestehenden optionalen Feld `uebersetzung` des Zeile-Modells speichern.
2. THE Uebersetzungs_Service SHALL keine Änderungen am Prisma-Schema erfordern, da das Feld `uebersetzung` bereits existiert.
3. WHEN Übersetzungen gespeichert werden, THE Uebersetzungs_Service SHALL die bestehende Aufdecken-Interaktion im Emotional-Lernen-Tab ohne Anpassungen unterstützen (die UI liest das Feld `uebersetzung` bereits aus).
