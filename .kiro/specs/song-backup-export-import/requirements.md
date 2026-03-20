# Anforderungsdokument: Song Backup — Export & Import

## Einleitung

Das Feature „Song Backup — Export & Import" ermöglicht es Nutzern, ihre Songs und Sets als ZIP-Archiv zu exportieren und auf demselben oder einem anderen System wieder zu importieren. Der Export umfasst alle relevanten Song-Daten: Songtext mit Strophen und Zeilen, Markups (Timecodes, Gesangstechnik, Pausen, Wiederholungen), Übersetzungen, Interpretationen, Notizen, Coaching-Inhalte (Analyse, Coach-Tipp, Strophen-Analysen), Emotions-Tags, Audio-Quellen-Metadaten sowie hochgeladene Dateien (Cover-Bilder, MP3-Audiodateien, Referenz-Daten). Beim Import wird geprüft, ob Song-IDs bereits existieren, und der Nutzer kann wählen, ob bestehende Songs überschrieben oder als neue Songs (mit neuen IDs) importiert werden sollen.

## Glossar

- **Export_Service**: Die serverseitige Komponente, die Song- und Set-Daten sammelt, als JSON serialisiert und zusammen mit Upload-Dateien in ein ZIP-Archiv verpackt
- **Import_Service**: Die serverseitige Komponente, die ein ZIP-Archiv entgegennimmt, die enthaltenen JSON-Daten und Dateien parst und in die Datenbank sowie das Dateisystem schreibt
- **Song_Manifest**: Eine JSON-Datei (`song.json`) innerhalb des ZIP-Archivs, die alle Metadaten und Inhalte eines Songs beschreibt (Titel, Künstler, Sprache, Emotions-Tags, Analyse, Coach-Tipp, Strophen mit Zeilen, Markups, Übersetzungen)
- **Set_Manifest**: Eine JSON-Datei (`set.json`) im Wurzelverzeichnis eines Set-Exports, die Set-Metadaten (Name, Beschreibung) und die geordnete Liste der enthaltenen Songs beschreibt
- **Upload_Dateien**: Binärdateien, die zu einem Song gehören — Cover-Bilder (aus `data/uploads/covers/`), MP3-Audiodateien (aus `data/uploads/audio/`) und Referenz-Daten-JSON (aus `data/uploads/referenz-daten/`)
- **Konflikt_Dialog**: Die UI-Komponente, die dem Nutzer beim Import angezeigt wird, wenn eine oder mehrere Song-IDs bereits in der Datenbank des Nutzers existieren
- **Überschreiben_Modus**: Import-Option, bei der ein bestehender Song mit den Daten aus dem Archiv ersetzt wird (gleiche ID bleibt erhalten)
- **Neu_Importieren_Modus**: Import-Option, bei der ein Song mit neuen IDs importiert wird, sodass der bestehende Song unverändert bleibt
- **ZIP_Archiv**: Das Dateiformat für den Export, das eine definierte Ordnerstruktur mit JSON-Manifesten und optionalen Upload-Dateien enthält
- **Nutzer**: Ein authentifizierter Benutzer der Anwendung
- **Eigentümer**: Der Nutzer, dem ein Song oder Set gehört (über `Song.userId` bzw. `Set.userId`)

## Anforderungen

### Anforderung 1: Einzelnen Song exportieren

**User Story:** Als Nutzer möchte ich einen einzelnen Song mit allen zugehörigen Daten als ZIP-Archiv exportieren, damit ich ein vollständiges Backup meines Songs erstellen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer den Export eines Songs auslöst, THE Export_Service SHALL ein ZIP_Archiv erstellen, das ein Song_Manifest mit folgenden Daten enthält: Titel, Künstler, Sprache, Emotions-Tags, Cover-URL, Analyse, Coach-Tipp, sowie alle Strophen mit Name, Reihenfolge, Strophen-Analyse, Zeilen (Text, Übersetzung, Reihenfolge), Markups (Typ, Ziel, Wert, Timecode, Wort-Index) und Audio-Quellen (URL, Typ, Label, Reihenfolge, Rolle)
2. WHEN der Song Interpretationen oder Notizen des Nutzers enthält, THE Export_Service SHALL diese pro Strophe im Song_Manifest einschließen
3. WHEN der Song ein lokal hochgeladenes Cover-Bild besitzt, THE Export_Service SHALL die Cover-Datei im Unterordner `uploads/covers/` des ZIP_Archivs einschließen
4. WHEN der Song lokal hochgeladene MP3-Audiodateien besitzt (AudioTyp MP3), THE Export_Service SHALL die Audio-Dateien im Unterordner `uploads/audio/` des ZIP_Archivs einschließen
5. WHEN für den Song Referenz-Daten existieren, THE Export_Service SHALL die Referenz-Daten-JSON-Datei im Unterordner `uploads/referenz-daten/` des ZIP_Archivs einschließen
6. THE Export_Service SHALL die Original-Song-ID im Song_Manifest speichern, damit beim Import ein Konflikt erkannt werden kann
7. IF der Nutzer nicht der Eigentümer des Songs ist, THEN THE Export_Service SHALL den Export verweigern und den HTTP-Statuscode 403 zurückgeben

### Anforderung 2: Set exportieren

**User Story:** Als Nutzer möchte ich ein komplettes Set mit allen enthaltenen Songs als ZIP-Archiv exportieren, damit ich ein Backup eines gesamten Sets erstellen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer den Export eines Sets auslöst, THE Export_Service SHALL ein ZIP_Archiv erstellen, das ein Set_Manifest im Wurzelverzeichnis enthält mit Set-Name, Beschreibung und der geordneten Liste der Song-Ordner
2. THE Export_Service SHALL für jeden Song im Set einen eigenen Unterordner im ZIP_Archiv erstellen, benannt nach einem bereinigten Song-Titel (z.B. `01_song-titel/`)
3. THE Export_Service SHALL in jedem Song-Unterordner ein vollständiges Song_Manifest und die zugehörigen Upload_Dateien gemäß Anforderung 1 einschließen
4. THE Export_Service SHALL die Reihenfolge der Songs im Set (orderIndex) im Set_Manifest beibehalten
5. IF der Nutzer nicht der Eigentümer des Sets ist, THEN THE Export_Service SHALL den Export verweigern und den HTTP-Statuscode 403 zurückgeben

### Anforderung 3: Song importieren — Grundfunktion

**User Story:** Als Nutzer möchte ich ein zuvor exportiertes ZIP-Archiv importieren, damit ich Songs aus einem Backup wiederherstellen oder auf ein anderes System übertragen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer ein gültiges ZIP_Archiv mit einem Song_Manifest hochlädt, THE Import_Service SHALL den Song mit allen Strophen, Zeilen, Markups, Übersetzungen, Interpretationen, Notizen, Analyse-Daten und Audio-Quellen-Metadaten in der Datenbank erstellen
2. WHEN das ZIP_Archiv Upload_Dateien enthält (Cover, Audio, Referenz-Daten), THE Import_Service SHALL diese Dateien in die entsprechenden Verzeichnisse auf dem Server kopieren (covers, audio, referenz-daten)
3. WHEN das ZIP_Archiv ein Set_Manifest enthält, THE Import_Service SHALL das Set erstellen und alle enthaltenen Songs dem Set in der korrekten Reihenfolge zuordnen
4. IF das ZIP_Archiv kein gültiges Song_Manifest oder Set_Manifest enthält, THEN THE Import_Service SHALL eine Fehlermeldung „Ungültiges Archiv-Format" zurückgeben
5. IF das ZIP_Archiv beschädigt ist oder nicht gelesen werden kann, THEN THE Import_Service SHALL eine Fehlermeldung „Archiv konnte nicht gelesen werden" zurückgeben
6. THE Import_Service SHALL den importierten Song dem aktuell authentifizierten Nutzer als Eigentümer zuordnen

### Anforderung 4: Import-Konflikterkennung

**User Story:** Als Nutzer möchte ich beim Import informiert werden, wenn Songs mit gleichen IDs bereits existieren, damit ich bewusst entscheiden kann, wie mit Konflikten umgegangen wird.

#### Akzeptanzkriterien

1. WHEN der Nutzer ein ZIP_Archiv importiert, THE Import_Service SHALL vor dem eigentlichen Import prüfen, ob Song-IDs aus dem Archiv bereits in der Datenbank des Nutzers vorhanden sind
2. WHEN mindestens ein Konflikt erkannt wird, THE Import_Service SHALL eine Liste der Konflikte zurückgeben mit Song-Titel, Song-ID und dem Hinweis, dass der Song bereits existiert
3. WHEN keine Konflikte erkannt werden, THE Import_Service SHALL den Import direkt durchführen ohne zusätzliche Rückfrage
4. THE Import_Service SHALL nur Songs des aktuell authentifizierten Nutzers als Konflikte erkennen (Songs anderer Nutzer mit gleicher ID stellen keinen Konflikt dar)

### Anforderung 5: Import-Konfliktauflösung — Überschreiben

**User Story:** Als Nutzer möchte ich bei einem Konflikt den bestehenden Song mit den importierten Daten überschreiben können, damit ich ein Backup wiederherstellen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer den Überschreiben_Modus für einen konflikthaften Song wählt, THE Import_Service SHALL alle bestehenden Strophen, Zeilen, Markups, Interpretationen und Notizen des Songs löschen und durch die Daten aus dem Archiv ersetzen
2. WHEN der Nutzer den Überschreiben_Modus wählt, THE Import_Service SHALL die Song-Metadaten (Titel, Künstler, Sprache, Emotions-Tags, Analyse, Coach-Tipp, Cover-URL) mit den Werten aus dem Archiv aktualisieren
3. WHEN der Nutzer den Überschreiben_Modus wählt, THE Import_Service SHALL die bestehenden Audio-Quellen des Songs löschen und durch die Audio-Quellen aus dem Archiv ersetzen
4. WHEN der Nutzer den Überschreiben_Modus wählt, THE Import_Service SHALL die Upload_Dateien (Cover, Audio, Referenz-Daten) aus dem Archiv in die entsprechenden Verzeichnisse kopieren und vorhandene Dateien überschreiben
5. WHEN der Nutzer den Überschreiben_Modus wählt, THE Import_Service SHALL die Song-ID beibehalten, sodass bestehende Set-Zuordnungen und Freigaben erhalten bleiben

### Anforderung 6: Import-Konfliktauflösung — Als neuen Song importieren

**User Story:** Als Nutzer möchte ich bei einem Konflikt den Song als neuen Song mit neuen IDs importieren können, damit der bestehende Song unverändert bleibt.

#### Akzeptanzkriterien

1. WHEN der Nutzer den Neu_Importieren_Modus für einen konflikthaften Song wählt, THE Import_Service SHALL neue IDs für den Song, alle Strophen, alle Zeilen, alle Markups, alle Interpretationen und alle Notizen generieren
2. WHEN der Nutzer den Neu_Importieren_Modus wählt, THE Import_Service SHALL die Upload_Dateien (Cover, Audio, Referenz-Daten) mit neuen Dateinamen speichern, die den neuen IDs entsprechen
3. WHEN der Nutzer den Neu_Importieren_Modus wählt, THE Import_Service SHALL die internen Referenzen (stropheId, zeileId in Markups; stropheId in Interpretationen und Notizen) auf die neuen IDs aktualisieren
4. WHEN der Nutzer den Neu_Importieren_Modus wählt und das Archiv ein Set_Manifest enthält, THE Import_Service SHALL den neuen Song dem importierten Set zuordnen

### Anforderung 7: Export-Format — Serialisierung und Deserialisierung

**User Story:** Als Entwickler möchte ich ein klar definiertes, versioniertes JSON-Format für den Export, damit die Kompatibilität zwischen verschiedenen Versionen sichergestellt ist.

#### Akzeptanzkriterien

1. THE Export_Service SHALL eine Versionsnummer im Song_Manifest und Set_Manifest speichern (Feld `exportVersion`)
2. THE Export_Service SHALL das Song_Manifest als valides JSON serialisieren, das alle Felder des Song-Datenmodells abbildet
3. THE Import_Service SHALL das Song_Manifest aus dem ZIP_Archiv deserialisieren und gegen das erwartete Schema validieren
4. FOR ALL gültigen Song-Daten, Exportieren und anschließendes Importieren (im Neu_Importieren_Modus) SHALL einen Song erzeugen, dessen Inhalte (Titel, Künstler, Sprache, Emotions-Tags, Strophen, Zeilen, Markups, Übersetzungen, Interpretationen, Notizen, Analyse, Coach-Tipp, Audio-Quellen) mit den Originaldaten übereinstimmen (Round-Trip-Eigenschaft)
5. IF das Song_Manifest eine unbekannte oder inkompatible exportVersion enthält, THEN THE Import_Service SHALL eine Fehlermeldung „Export-Version wird nicht unterstützt" zurückgeben

### Anforderung 8: Export/Import-UI

**User Story:** Als Nutzer möchte ich den Export und Import über die Benutzeroberfläche auslösen können, damit ich kein technisches Wissen benötige.

#### Akzeptanzkriterien

1. WHEN der Nutzer die Song-Detailansicht öffnet, THE Song-Detailansicht SHALL eine Export-Aktion (Button oder Menüeintrag) anzeigen, die den Download des ZIP_Archivs auslöst
2. WHEN der Nutzer die Set-Detailansicht öffnet, THE Set-Detailansicht SHALL eine Export-Aktion anzeigen, die den Download des Set-ZIP_Archivs auslöst
3. THE Dashboard SHALL eine Import-Aktion bereitstellen, über die der Nutzer ein ZIP_Archiv hochladen kann
4. WHEN beim Import Konflikte erkannt werden, THE Konflikt_Dialog SHALL für jeden konflikthaften Song die Optionen „Überschreiben" und „Als neuen Song importieren" anbieten
5. WHEN der Import erfolgreich abgeschlossen ist, THE Import_Service SHALL eine Erfolgsmeldung mit der Anzahl der importierten Songs anzeigen
6. WHILE ein Export oder Import läuft, THE Benutzeroberfläche SHALL einen Ladeindikator anzeigen, damit der Nutzer weiß, dass der Vorgang noch läuft

### Anforderung 9: Zugriffskontrolle

**User Story:** Als Nutzer möchte ich sicher sein, dass nur ich meine eigenen Songs und Sets exportieren kann, damit meine Daten geschützt sind.

#### Akzeptanzkriterien

1. IF ein nicht authentifizierter Benutzer auf die Export- oder Import-API zugreift, THEN THE Export_Service oder Import_Service SHALL den HTTP-Statuscode 401 zurückgeben
2. THE Export_Service SHALL sicherstellen, dass ein Nutzer nur Songs und Sets exportieren kann, deren Eigentümer der Nutzer ist
3. THE Import_Service SHALL importierte Songs und Sets dem authentifizierten Nutzer als Eigentümer zuordnen
4. IF ein Nutzer versucht, einen Song oder ein Set zu exportieren, dessen Eigentümer ein anderer Nutzer ist, THEN THE Export_Service SHALL den HTTP-Statuscode 403 zurückgeben

### Anforderung 10: Fehlerbehandlung und Validierung

**User Story:** Als Nutzer möchte ich bei Fehlern während des Exports oder Imports verständliche Fehlermeldungen erhalten, damit ich das Problem nachvollziehen und beheben kann.

#### Akzeptanzkriterien

1. IF beim Export eine Upload-Datei (Cover, Audio, Referenz-Daten) nicht gefunden wird, THEN THE Export_Service SHALL den Export fortsetzen und die fehlende Datei im Song_Manifest als nicht vorhanden markieren
2. IF beim Import eine referenzierte Upload-Datei im ZIP_Archiv fehlt, THEN THE Import_Service SHALL den Import des Songs fortsetzen und die fehlende Datei überspringen
3. IF das hochgeladene ZIP_Archiv die maximale Dateigröße überschreitet, THEN THE Import_Service SHALL eine Fehlermeldung „Datei zu groß" zurückgeben
4. IF beim Import ein Datenbankfehler auftritt, THEN THE Import_Service SHALL alle bereits durchgeführten Änderungen der aktuellen Import-Transaktion rückgängig machen und eine Fehlermeldung zurückgeben
5. THE Import_Service SHALL die Integrität der importierten Daten validieren (z.B. dass Strophen-Referenzen in Markups auf existierende Strophen verweisen)
