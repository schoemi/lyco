# Anforderungsdokument: Genius Song-Import

## Einleitung

Dieses Feature ermöglicht es Nutzern der Lyco-App, Songs über die Genius-API zu suchen und zu importieren. Anstatt Songtexte manuell einzugeben oder als Text einzufügen, können Nutzer nach einem Song suchen, ein Ergebnis auswählen und den Songtext automatisch abrufen und importieren lassen. Die Genius-API liefert Metadaten (Titel, Künstler, Album-Art), während die Lyrics über Web-Scraping (via `genius-lyrics-api`) bezogen werden. Der bestehende Songtext-Parser und Noise-Filter werden wiederverwendet, da Genius-Lyrics bereits im `[Section]`-Format vorliegen.

## Glossar

- **Genius_API**: Die REST-API von Genius (genius.com), die Song-Suche und Metadaten bereitstellt. Erfordert Authentifizierung via Client Access Token.
- **Genius_Client**: Das serverseitige Modul in Lyco, das die Kommunikation mit der Genius-API und das Lyrics-Scraping über das npm-Paket `genius-lyrics-api` kapselt.
- **Such_Endpunkt**: Die serverseitige API-Route (`POST /api/songs/genius/search`), die Suchanfragen an die Genius-API weiterleitet.
- **Import_Endpunkt**: Die serverseitige API-Route (`POST /api/songs/genius/import`), die einen Song anhand seiner Genius-ID abruft und importiert.
- **Songtext_Parser**: Das bestehende Modul `parseSongtext()`, das Rohtext mit `[Section]`-Markern in strukturierte Strophen zerlegt.
- **Noise_Filter**: Das bestehende Modul `isNoiseLine()`, das Genius-spezifische Artefakte (z.B. "You might also like") herausfiltert.
- **Such_UI**: Die Benutzeroberfläche im Genius-Tab der Import-Seite, bestehend aus Suchfeld, Ergebnisliste und Song-Auswahl.
- **Import_Seite**: Die bestehende Seite `/songs/import` mit den Tabs Manuell, Text einfügen und PDF Upload.
- **Genius_Suchergebnis**: Ein einzelnes Ergebnis der Genius-Suche mit Feldern: id, title, artist, url, albumArt.
- **API_Key_Speicher**: Das serverseitige Modul, das den Genius-API-Schlüssel eines Nutzers verschlüsselt in der Datenbank speichert und bei Bedarf entschlüsselt.
- **Profil_Endpunkt**: Die bestehende API-Route (`PUT /api/profile`), über die Nutzer ihre Profildaten einschließlich des Genius-API-Schlüssels aktualisieren können.

## Anforderungen

### Anforderung 1: Genius-Tab in der Import-Seite

**User Story:** Als Nutzer möchte ich einen "Genius"-Tab auf der Import-Seite sehen, damit ich Songs direkt über Genius suchen und importieren kann.

#### Akzeptanzkriterien

1. THE Import_Seite SHALL einen vierten Tab mit der Bezeichnung "Genius" anzeigen.
2. WHEN der Nutzer den Genius-Tab auswählt, THE Import_Seite SHALL das Such_UI-Panel mit einem Suchfeld anzeigen.
3. THE ImportMode-Typ SHALL den Wert "genius" als gültige Option enthalten.

### Anforderung 2: Song-Suche über Genius

**User Story:** Als Nutzer möchte ich nach Songs suchen können, indem ich einen Suchbegriff (Titel und/oder Künstler) eingebe, damit ich den gewünschten Song finde.

#### Akzeptanzkriterien

1. WHEN der Nutzer einen Suchbegriff eingibt und die Suche auslöst, THE Such_UI SHALL eine Ladeanzeige darstellen.
2. WHEN der Nutzer einen Suchbegriff mit mindestens 2 Zeichen eingibt und die Suche auslöst, THE Such_Endpunkt SHALL die Suchanfrage an den Genius_Client weiterleiten und eine Liste von Genius_Suchergebnissen zurückgeben.
3. WHEN die Genius-API Ergebnisse liefert, THE Such_UI SHALL für jedes Genius_Suchergebnis den Titel, den Künstler und das Album-Cover anzeigen.
4. WHEN die Genius-API keine Ergebnisse liefert, THE Such_UI SHALL die Meldung "Keine Ergebnisse gefunden" anzeigen.
5. IF der Suchbegriff weniger als 2 Zeichen enthält, THEN THE Such_UI SHALL die Suche nicht auslösen und keine Fehlermeldung anzeigen.

### Anforderung 3: Song-Auswahl und Lyrics-Abruf

**User Story:** Als Nutzer möchte ich ein Suchergebnis auswählen und den Songtext automatisch abrufen lassen, damit ich den Song ohne manuelles Kopieren importieren kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer ein Genius_Suchergebnis auswählt, THE Such_UI SHALL eine Ladeanzeige für den Lyrics-Abruf darstellen.
2. WHEN der Nutzer ein Genius_Suchergebnis auswählt, THE Import_Endpunkt SHALL die Lyrics über den Genius_Client abrufen.
3. WHEN der Genius_Client die Lyrics erfolgreich abruft, THE Import_Endpunkt SHALL die Lyrics durch den Noise_Filter und den Songtext_Parser verarbeiten.
4. WHEN der Songtext_Parser die Lyrics erfolgreich in Strophen zerlegt, THE Import_Endpunkt SHALL den Song mit Titel, Künstler und den geparsten Strophen in der Datenbank speichern.
5. WHEN der Import erfolgreich abgeschlossen ist, THE Import_Seite SHALL den Nutzer zur Song-Detailseite des importierten Songs weiterleiten.

### Anforderung 4: Serverseitige API-Sicherheit

**User Story:** Als Entwickler möchte ich sicherstellen, dass der Genius-API-Schlüssel serverseitig geschützt bleibt und nur authentifizierte Nutzer die Genius-Funktionen nutzen können.

#### Akzeptanzkriterien

1. THE Genius_Client SHALL den API-Schlüssel aus dem verschlüsselten Profil-Feld des authentifizierten Nutzers über den API_Key_Speicher lesen.
2. THE Such_Endpunkt SHALL nur authentifizierte Anfragen verarbeiten und bei fehlender Authentifizierung den HTTP-Status 401 zurückgeben.
3. THE Import_Endpunkt SHALL nur authentifizierte Anfragen verarbeiten und bei fehlender Authentifizierung den HTTP-Status 401 zurückgeben.
4. IF der authentifizierte Nutzer keinen Genius-API-Schlüssel in seinem Profil hinterlegt hat, THEN THE Genius_Client SHALL den HTTP-Status 400 mit der Meldung "Kein Genius-API-Schlüssel hinterlegt. Bitte in den Profileinstellungen konfigurieren." zurückgeben.

### Anforderung 5: Fehlerbehandlung

**User Story:** Als Nutzer möchte ich bei Problemen mit der Genius-Suche oder dem Lyrics-Abruf verständliche Fehlermeldungen erhalten, damit ich weiß, was schiefgelaufen ist.

#### Akzeptanzkriterien

1. IF die Genius-API bei der Suche einen Fehler zurückgibt, THEN THE Such_Endpunkt SHALL den HTTP-Status 502 mit der Meldung "Genius-Suche fehlgeschlagen" zurückgeben.
2. IF der Lyrics-Abruf für einen ausgewählten Song fehlschlägt, THEN THE Import_Endpunkt SHALL den HTTP-Status 502 mit der Meldung "Lyrics konnten nicht abgerufen werden" zurückgeben.
3. IF die abgerufenen Lyrics leer sind oder keine gültigen Strophen ergeben, THEN THE Import_Endpunkt SHALL den HTTP-Status 422 mit der Meldung "Keine gültigen Lyrics gefunden" zurückgeben.
4. IF ein Netzwerkfehler bei der Kommunikation mit der Genius-API auftritt, THEN THE Such_UI SHALL die Meldung "Verbindung zu Genius fehlgeschlagen. Bitte versuche es erneut." anzeigen.
5. WHEN ein Fehler auftritt, THE Such_UI SHALL die Fehlermeldung in einem sichtbaren Alert-Bereich anzeigen.

### Anforderung 6: Lyrics-Parsing und Noise-Filterung

**User Story:** Als Nutzer möchte ich, dass importierte Genius-Lyrics sauber in Strophen aufgeteilt werden und keine Website-Artefakte enthalten, damit der Songtext sofort zum Lernen bereit ist.

#### Akzeptanzkriterien

1. WHEN Lyrics vom Genius_Client abgerufen werden, THE Noise_Filter SHALL Genius-spezifische Artefakte (z.B. "You might also like", Embed-Zähler) entfernen.
2. WHEN die gefilterten Lyrics `[Section]`-Marker enthalten, THE Songtext_Parser SHALL die Lyrics anhand der Marker in benannte Strophen aufteilen.
3. WHEN die gefilterten Lyrics keine `[Section]`-Marker enthalten, THE Songtext_Parser SHALL die Lyrics anhand von Leerzeilen in automatisch benannte Strophen aufteilen.
4. FOR ALL gültige Genius-Lyrics, das Parsen und anschließende Zusammenfügen der Strophen-Zeilen SHALL einen Text ergeben, der semantisch dem gefilterten Original entspricht (Round-Trip-Eigenschaft).

### Anforderung 7: Genius-Client-Modul

**User Story:** Als Entwickler möchte ich ein gekapseltes Modul für die Genius-API-Kommunikation, damit die Logik wiederverwendbar und testbar ist.

#### Akzeptanzkriterien

1. THE Genius_Client SHALL eine Funktion `searchSongs(query: string)` bereitstellen, die eine Liste von Genius_Suchergebnissen zurückgibt.
2. THE Genius_Client SHALL eine Funktion `fetchLyrics(geniusId: number)` bereitstellen, die den Liedtext als Rohtext zurückgibt.
3. THE Genius_Client SHALL das npm-Paket `genius-lyrics-api` für API-Aufrufe und Lyrics-Scraping verwenden.
4. WHEN die Funktion `searchSongs` aufgerufen wird, THE Genius_Client SHALL maximal 10 Ergebnisse zurückgeben.

### Anforderung 8: Genius-API-Schlüssel im Nutzerprofil speichern

**User Story:** Als Nutzer möchte ich meinen eigenen Genius-API-Schlüssel sicher in meinem Profil speichern können, damit ich die Genius-Import-Funktion mit meinem persönlichen Zugang nutzen kann.

#### Akzeptanzkriterien

1. THE Profil_Endpunkt SHALL ein optionales Feld `geniusApiKey` zur Aktualisierung des Genius-API-Schlüssels akzeptieren.
2. WHEN der Nutzer einen Genius-API-Schlüssel über den Profil_Endpunkt sendet, THE API_Key_Speicher SHALL den Schlüssel vor dem Speichern in der Datenbank symmetrisch verschlüsseln.
3. WHEN der Genius_Client den API-Schlüssel eines Nutzers benötigt, THE API_Key_Speicher SHALL den verschlüsselten Schlüssel aus der Datenbank lesen und entschlüsseln.
4. THE API_Key_Speicher SHALL den Verschlüsselungsschlüssel ausschließlich aus einer serverseitigen Umgebungsvariable lesen.
5. THE Profil_Endpunkt SHALL den gespeicherten Genius-API-Schlüssel in API-Antworten maskiert zurückgeben (z.B. "••••••abcd"), sodass der vollständige Schlüssel nicht im Klartext übertragen wird.
6. WHEN der Nutzer einen leeren Wert für `geniusApiKey` sendet, THE Profil_Endpunkt SHALL den gespeicherten Schlüssel aus der Datenbank entfernen.
7. FOR ALL gültige API-Schlüssel, das Verschlüsseln und anschließende Entschlüsseln SHALL den ursprünglichen Klartext-Schlüssel ergeben (Round-Trip-Eigenschaft).
