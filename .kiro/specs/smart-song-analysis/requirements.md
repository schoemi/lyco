# Anforderungsdokument: Smarte Song-Analyse

## Einleitung

Dieses Dokument beschreibt die Anforderungen für die LLM-basierte automatische Song-Analyse der Songtext-Lern-Webanwendung „Lyco". Das Feature nutzt ein Large Language Model, um sowohl eine allgemeine Song-Analyse (Emotion, Botschaft, Hintergrund) als auch strophenweise Analysen (emotionale Bedeutung pro Strophe) zu generieren. Zusätzlich werden Emotions-Tags automatisch erzeugt. Die Analyseergebnisse werden am Song und an den Strophen gespeichert und stehen der bestehenden Emotional-Lernen-Ansicht als Datengrundlage zur Verfügung.

Dieses Feature ergänzt die bestehende Spec „emotional-learning", die die UI-Seite (Tabs, Aufdecken-Interaktion, manuelle Interpretationen) abdeckt. Die vorliegende Spec konzentriert sich ausschließlich auf die serverseitige LLM-Integration, Datenmodell-Erweiterungen und die Speicherung der Analyseergebnisse.

Referenz: [Planungsdokument](../../.planning/emotional_learning.md)

## Glossar

- **Anwendung**: Die Songtext-Lern-Webanwendung „Lyco" als Gesamtsystem
- **Analyse_Service**: Die serverseitige Komponente, die LLM-Anfragen für Song- und Strophen-Analysen orchestriert und die Ergebnisse speichert
- **LLM_Client**: Die Komponente, die HTTP-Anfragen an die LLM-API sendet und Antworten empfängt
- **Song_Analyse**: Die vom LLM generierte allgemeine Analyse eines Songs, bestehend aus emotionalem Hintergrund, zentraler Botschaft und Stimmungsbeschreibung
- **Strophen_Analyse**: Die vom LLM generierte Analyse einer einzelnen Strophe, die die emotionale Bedeutung und den Beitrag zur Gesamtbotschaft beschreibt
- **Emotions_Tags**: Automatisch vom LLM generierte Stimmungs-Labels für einen Song (z.B. „Melancholie", „Sehnsucht", „Rebellion")
- **Analyse_Prompt**: Die strukturierte Eingabeaufforderung, die an das LLM gesendet wird, um eine Song- oder Strophen-Analyse zu erzeugen
- **Song_Service**: Die bestehende serverseitige Komponente für Song-bezogene Operationen (aus song-data-management)

## Anforderungen

### Anforderung 1: Datenmodell-Erweiterung für Song-Analyse

**User Story:** Als Entwickler möchte ich ein Feld für die allgemeine Song-Analyse am Song-Modell haben, damit die LLM-generierte Analyse persistent gespeichert werden kann.

#### Akzeptanzkriterien

1. THE Anwendung SHALL das Song-Modell im Prisma-Schema um ein optionales Textfeld `analyse` erweitern, das die allgemeine Song-Analyse speichert.
2. THE Anwendung SHALL das bestehende Feld `emotionsTags` am Song-Modell für die LLM-generierten Emotions-Tags verwenden.
3. THE Anwendung SHALL das Strophe-Modell im Prisma-Schema um ein optionales Textfeld `analyse` erweitern, das die strophenspezifische Analyse speichert.
4. THE Anwendung SHALL bei Migration der neuen Felder bestehende Songs und Strophen ohne Datenverlust beibehalten (Felder sind optional mit Standardwert null).

### Anforderung 2: LLM-Client-Konfiguration

**User Story:** Als Entwickler möchte ich einen konfigurierbaren LLM-Client haben, damit die Anwendung mit verschiedenen LLM-Anbietern kommunizieren kann.

#### Akzeptanzkriterien

1. THE LLM_Client SHALL die LLM-API-URL, den API-Schlüssel und den Modellnamen aus Umgebungsvariablen lesen.
2. THE LLM_Client SHALL HTTP-Anfragen mit dem konfigurierten API-Schlüssel im Authorization-Header an die LLM-API senden.
3. THE LLM_Client SHALL ein Timeout von 30 Sekunden pro Anfrage einhalten.
4. IF die LLM-API einen Fehler zurückgibt, THEN THE LLM_Client SHALL den Fehler mit HTTP-Statuscode und Fehlermeldung protokollieren und eine beschreibende Fehlermeldung an den Aufrufer zurückgeben.
5. IF die LLM-API nicht erreichbar ist, THEN THE LLM_Client SHALL nach maximal 2 Wiederholungsversuchen mit exponentiellem Backoff abbrechen und eine Fehlermeldung zurückgeben.
6. THE LLM_Client SHALL die Antwort des LLM als strukturiertes JSON-Objekt parsen und validieren.

### Anforderung 3: Song-Analyse generieren

**User Story:** Als Benutzer möchte ich eine automatische Analyse meines Songs erhalten, damit ich den emotionalen Hintergrund und die Botschaft des Textes besser verstehe.

#### Akzeptanzkriterien

1. WHEN ein authentifizierter Benutzer eine Song-Analyse für einen eigenen Song anfordert, THE Analyse_Service SHALL den vollständigen Songtext (alle Strophen und Zeilen) zusammenstellen und als Analyse_Prompt an den LLM_Client senden.
2. THE Analyse_Prompt für die Song-Analyse SHALL das LLM anweisen, folgende Bestandteile zu liefern: emotionaler Hintergrund des Songs, zentrale Botschaft, Stimmungsbeschreibung und eine Liste von Emotions-Tags.
3. THE Analyse_Prompt SHALL den Fokus auf die emotionale Bedeutung des Textes legen und das LLM anweisen, die Analyse in der Sprache des Songs zu verfassen.
4. WHEN der LLM_Client eine gültige Antwort zurückgibt, THE Analyse_Service SHALL die Song-Analyse im Feld `analyse` des Song-Modells speichern.
5. WHEN der LLM_Client eine gültige Antwort mit Emotions-Tags zurückgibt, THE Analyse_Service SHALL die generierten Emotions-Tags im Feld `emotionsTags` des Song-Modells speichern.
6. IF der Song keine Strophen oder Zeilen enthält, THEN THE Analyse_Service SHALL die Anfrage mit einer beschreibenden Fehlermeldung ablehnen.
7. IF bereits eine Song-Analyse existiert, THEN THE Analyse_Service SHALL die bestehende Analyse überschreiben (Neuanalyse ermöglichen).

### Anforderung 4: Strophen-Analyse generieren

**User Story:** Als Benutzer möchte ich für jede Strophe eine automatische Analyse der emotionalen Bedeutung erhalten, damit ich den Text strophenweise besser verstehen kann.

#### Akzeptanzkriterien

1. WHEN ein authentifizierter Benutzer eine Song-Analyse anfordert, THE Analyse_Service SHALL zusätzlich zur Song-Analyse für jede Strophe des Songs eine individuelle Strophen-Analyse vom LLM anfordern.
2. THE Analyse_Prompt für die Strophen-Analyse SHALL den vollständigen Songtext als Kontext sowie die spezifische Strophe enthalten, damit das LLM die Strophe im Gesamtkontext analysieren kann.
3. THE Analyse_Prompt für die Strophen-Analyse SHALL das LLM anweisen, die emotionale Bedeutung der Strophe, ihren Beitrag zur Gesamtbotschaft und relevante Stilmittel zu beschreiben.
4. WHEN der LLM_Client eine gültige Strophen-Analyse zurückgibt, THE Analyse_Service SHALL die Analyse im Feld `analyse` der jeweiligen Strophe speichern.
5. IF eine Strophe keine Zeilen enthält, THEN THE Analyse_Service SHALL diese Strophe bei der Analyse überspringen.
6. IF bereits eine Strophen-Analyse existiert, THEN THE Analyse_Service SHALL die bestehende Analyse überschreiben.

### Anforderung 5: Analyse-API-Endpunkt

**User Story:** Als Frontend-Entwickler möchte ich einen API-Endpunkt haben, über den die Song-Analyse ausgelöst und abgerufen werden kann.

#### Akzeptanzkriterien

1. THE Anwendung SHALL einen POST-Endpunkt unter `/api/songs/[id]/analyze` bereitstellen, der die LLM-basierte Song- und Strophen-Analyse für den angegebenen Song auslöst.
2. WHEN der POST-Endpunkt aufgerufen wird, THE Analyse_Service SHALL die Song-Analyse und alle Strophen-Analysen generieren und speichern.
3. WHEN die Analyse erfolgreich abgeschlossen ist, THE API_Route SHALL die gespeicherte Song-Analyse, die Strophen-Analysen und die Emotions-Tags als JSON-Antwort zurückgeben.
4. THE Anwendung SHALL einen GET-Endpunkt unter `/api/songs/[id]/analyze` bereitstellen, der die gespeicherte Song-Analyse, die Strophen-Analysen und die Emotions-Tags zurückgibt, ohne eine neue LLM-Anfrage auszulösen.
5. WHEN eine API_Route eine Anfrage ohne gültige Session erhält, THE API_Route SHALL die Anfrage mit HTTP-Statuscode 401 ablehnen.
6. IF ein Benutzer versucht, die Analyse eines Songs eines anderen Benutzers auszulösen oder abzurufen, THEN THE API_Route SHALL die Anfrage mit HTTP-Statuscode 403 ablehnen.
7. THE API_Route SHALL alle Eingabedaten validieren und bei ungültiger Song-ID HTTP-Statuscode 404 zurückgeben.

### Anforderung 6: Prompt-Struktur und Antwort-Validierung

**User Story:** Als Entwickler möchte ich eine klar definierte Prompt-Struktur und Antwort-Validierung haben, damit die LLM-Antworten konsistent und verarbeitbar sind.

#### Akzeptanzkriterien

1. THE Analyse_Service SHALL den Analyse_Prompt als strukturierte Nachricht mit System-Prompt und User-Prompt zusammenstellen.
2. THE Analyse_Service SHALL im System-Prompt die Rolle des LLM als Songtext-Analyst mit Fokus auf emotionale Bedeutung definieren.
3. THE Analyse_Service SHALL im User-Prompt den Songtitel, den Künstler (falls vorhanden) und den vollständigen Songtext übergeben.
4. THE Analyse_Service SHALL das LLM anweisen, die Antwort als JSON-Objekt mit definierten Feldern zurückzugeben (songAnalyse, emotionsTags, strophenAnalysen).
5. WHEN die LLM-Antwort nicht dem erwarteten JSON-Schema entspricht, THE Analyse_Service SHALL die Antwort verwerfen und eine beschreibende Fehlermeldung zurückgeben.
6. FOR ALL gültige Song-Objekte mit Strophen und Zeilen, das Formatieren als Prompt und anschließende Parsen der LLM-Antwort SHALL ein konsistentes Ergebnisobjekt mit songAnalyse (String), emotionsTags (String-Array) und strophenAnalysen (Array mit stropheId und Text) liefern (Round-Trip-Eigenschaft der Prompt-Formatierung und Antwort-Validierung).

### Anforderung 7: Fehlerbehandlung und Resilienz

**User Story:** Als Benutzer möchte ich bei Fehlern der LLM-Analyse eine verständliche Rückmeldung erhalten, damit ich weiß, dass die Analyse nicht erfolgreich war.

#### Akzeptanzkriterien

1. IF der LLM_Client einen Timeout-Fehler zurückgibt, THEN THE Analyse_Service SHALL die Fehlermeldung „Die Analyse konnte nicht abgeschlossen werden. Bitte versuche es später erneut." an den Aufrufer zurückgeben.
2. IF der LLM_Client einen Rate-Limit-Fehler (HTTP 429) zurückgibt, THEN THE Analyse_Service SHALL die Fehlermeldung „Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut." an den Aufrufer zurückgeben.
3. IF die LLM-Antwort nicht als gültiges JSON geparst werden kann, THEN THE Analyse_Service SHALL die Fehlermeldung „Die Analyse konnte nicht verarbeitet werden. Bitte versuche es erneut." an den Aufrufer zurückgeben.
4. WHILE eine Analyse für einen Song bereits läuft, THE Analyse_Service SHALL weitere Analyse-Anfragen für denselben Song mit HTTP-Statuscode 409 und der Meldung „Eine Analyse läuft bereits für diesen Song." ablehnen.
5. THE Analyse_Service SHALL alle LLM-Fehler mit Zeitstempel, Song-ID und Fehlerdetails protokollieren.
