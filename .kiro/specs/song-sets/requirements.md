# Anforderungsdokument: Song-Sets

## Einleitung

Das Feature „Song-Sets" erweitert den SongTextTrainer um eine vollständige Verwaltung von Song-Sammlungen (Sets). Nutzer sollen Sets erstellen, umbenennen, löschen und Songs flexibel zwischen Sets verschieben können. Aktuell existiert eine grundlegende Set-Struktur (Datenmodell `Set` → `SetSong` → `Song`), jedoch fehlen wesentliche Verwaltungsfunktionen wie Set-Beschreibung, Sortierung der Songs innerhalb eines Sets, Mehrfachzuweisung von Songs zu Sets über die UI, und eine dedizierte Set-Detailansicht. Dieses Feature bildet die Grundlage für die geplanten Folge-Features „Sharing" und „Song-Export".

## Glossar

- **Set**: Eine benannte Sammlung von Songs, die einem Nutzer gehört (z.B. „Konzert März 2025")
- **Song**: Ein Songtext mit Metadaten (Titel, Künstler, Sprache), der zu einem oder mehreren Sets gehören kann
- **Set_Verwaltung**: Die Gesamtheit der CRUD-Operationen für Sets (Erstellen, Lesen, Aktualisieren, Löschen)
- **Set_Detail_Ansicht**: Eine dedizierte Seite, die alle Songs eines Sets mit Fortschritt und Metadaten anzeigt
- **Song_Zuordnung**: Die Verknüpfung eines Songs mit einem Set über die Zwischentabelle SetSong
- **Dashboard**: Die Hauptübersichtsseite der Anwendung, die Sets und Songs anzeigt
- **Nutzer**: Ein authentifizierter Benutzer der Anwendung mit der Rolle USER oder ADMIN
- **Fortschrittsbalken**: Visuelle Anzeige des prozentualen Lernstands eines Songs (0–100%)

## Anforderungen

### Anforderung 1: Set erstellen

**User Story:** Als Nutzer möchte ich ein neues Set mit einem Namen und einer optionalen Beschreibung erstellen, damit ich meine Songs thematisch gruppieren kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer das Formular zum Erstellen eines Sets absendet, THE Set_Verwaltung SHALL ein neues Set mit dem angegebenen Namen und der optionalen Beschreibung erstellen und dem angemeldeten Nutzer zuordnen
2. IF der Nutzer einen leeren oder nur aus Leerzeichen bestehenden Namen eingibt, THEN THE Set_Verwaltung SHALL eine Fehlermeldung „Name ist erforderlich" anzeigen und das Set nicht erstellen
3. THE Set_Verwaltung SHALL den Set-Namen auf maximal 100 Zeichen begrenzen
4. WHEN ein Set erfolgreich erstellt wurde, THE Dashboard SHALL das neue Set in der Set-Liste anzeigen, ohne dass die Seite neu geladen werden muss

### Anforderung 2: Set bearbeiten

**User Story:** Als Nutzer möchte ich den Namen und die Beschreibung eines bestehenden Sets ändern, damit ich meine Sets aktuell halten kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer den Namen oder die Beschreibung eines Sets ändert und speichert, THE Set_Verwaltung SHALL die Änderungen persistieren und die aktualisierte Ansicht anzeigen
2. IF ein anderer Nutzer versucht, ein Set zu bearbeiten, das dem Nutzer nicht gehört, THEN THE Set_Verwaltung SHALL den Zugriff verweigern und den HTTP-Statuscode 403 zurückgeben
3. IF das zu bearbeitende Set nicht existiert, THEN THE Set_Verwaltung SHALL den HTTP-Statuscode 404 zurückgeben

### Anforderung 3: Set löschen

**User Story:** Als Nutzer möchte ich ein Set löschen können, damit ich nicht mehr benötigte Sammlungen entfernen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer ein Set löscht, THE Set_Verwaltung SHALL das Set und alle zugehörigen Song-Zuordnungen entfernen, die Songs selbst jedoch beibehalten
2. WHEN der Nutzer die Löschaktion auslöst, THE Set_Verwaltung SHALL einen Bestätigungsdialog anzeigen, bevor das Set endgültig gelöscht wird
3. IF ein anderer Nutzer versucht, ein Set zu löschen, das dem Nutzer nicht gehört, THEN THE Set_Verwaltung SHALL den Zugriff verweigern und den HTTP-Statuscode 403 zurückgeben

### Anforderung 4: Songs zu einem Set hinzufügen

**User Story:** Als Nutzer möchte ich einen oder mehrere Songs zu einem Set hinzufügen, damit ich meine Sammlungen zusammenstellen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer einen Song zu einem Set hinzufügt, THE Song_Zuordnung SHALL die Verknüpfung zwischen Song und Set erstellen
2. IF der Song bereits im Set enthalten ist, THEN THE Song_Zuordnung SHALL eine Fehlermeldung „Song ist bereits im Set" anzeigen und keine doppelte Zuordnung erstellen
3. THE Song_Zuordnung SHALL es ermöglichen, denselben Song mehreren Sets zuzuordnen
4. WHEN der Nutzer Songs zu einem Set hinzufügt, THE Set_Detail_Ansicht SHALL die Song-Liste aktualisieren, ohne dass die Seite neu geladen werden muss

### Anforderung 5: Songs aus einem Set entfernen

**User Story:** Als Nutzer möchte ich Songs aus einem Set entfernen, damit ich meine Sammlungen anpassen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer einen Song aus einem Set entfernt, THE Song_Zuordnung SHALL die Verknüpfung zwischen Song und Set löschen, den Song selbst jedoch beibehalten
2. IF ein anderer Nutzer versucht, einen Song aus einem fremden Set zu entfernen, THEN THE Song_Zuordnung SHALL den Zugriff verweigern
3. WHEN ein Song aus einem Set entfernt wird, THE Set_Detail_Ansicht SHALL die Song-Liste sofort aktualisieren

### Anforderung 6: Song-Reihenfolge innerhalb eines Sets

**User Story:** Als Nutzer möchte ich die Reihenfolge der Songs innerhalb eines Sets per Drag-and-Drop ändern, damit ich die Songs in meiner gewünschten Reihenfolge anordnen kann (z.B. Setlist-Reihenfolge für ein Konzert).

#### Akzeptanzkriterien

1. THE Song_Zuordnung SHALL für jeden Song innerhalb eines Sets einen Sortierindex (orderIndex) speichern
2. WHEN der Nutzer die Reihenfolge der Songs per Drag-and-Drop ändert, THE Song_Zuordnung SHALL die neuen Sortierindizes persistieren
3. WHEN die Set_Detail_Ansicht geladen wird, THE Set_Detail_Ansicht SHALL die Songs in der gespeicherten Reihenfolge (aufsteigend nach orderIndex) anzeigen
4. WHEN ein neuer Song zu einem Set hinzugefügt wird, THE Song_Zuordnung SHALL den Song am Ende der Liste einfügen (höchster orderIndex + 1)

### Anforderung 7: Set-Detailansicht

**User Story:** Als Nutzer möchte ich eine dedizierte Detailansicht für ein Set sehen, damit ich alle Songs des Sets mit ihrem Lernfortschritt überblicken und verwalten kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer auf ein Set im Dashboard klickt, THE Set_Detail_Ansicht SHALL eine Seite mit dem Set-Namen, der Beschreibung, der Anzahl der Songs und der Liste aller Songs anzeigen
2. THE Set_Detail_Ansicht SHALL für jeden Song den Titel, den Künstler, den Fortschrittsbalken, die Session-Anzahl und den Status-Punkt (neu/aktiv/gelernt) anzeigen
3. THE Set_Detail_Ansicht SHALL Aktionen zum Hinzufügen und Entfernen von Songs sowie zum Bearbeiten und Löschen des Sets bereitstellen
4. WHEN der Nutzer auf einen Song in der Set_Detail_Ansicht klickt, THE Set_Detail_Ansicht SHALL zur Song-Detailseite navigieren

### Anforderung 8: Set-Beschreibung

**User Story:** Als Nutzer möchte ich einem Set eine optionale Beschreibung hinzufügen, damit ich den Zweck oder Kontext des Sets dokumentieren kann.

#### Akzeptanzkriterien

1. THE Set_Verwaltung SHALL ein optionales Beschreibungsfeld für Sets unterstützen, das maximal 500 Zeichen lang sein darf
2. WHEN der Nutzer ein Set erstellt oder bearbeitet, THE Set_Verwaltung SHALL die Beschreibung zusammen mit dem Namen speichern
3. WHEN die Set_Detail_Ansicht geladen wird, THE Set_Detail_Ansicht SHALL die Beschreibung unterhalb des Set-Namens anzeigen, sofern eine Beschreibung vorhanden ist

### Anforderung 9: Dashboard-Integration

**User Story:** Als Nutzer möchte ich meine Sets auf dem Dashboard sehen und von dort aus direkt zur Set-Detailansicht navigieren, damit ich schnell auf meine Sammlungen zugreifen kann.

#### Akzeptanzkriterien

1. THE Dashboard SHALL alle Sets des angemeldeten Nutzers in einer Liste anzeigen, sortiert nach dem letzten Aktualisierungsdatum (neueste zuerst)
2. THE Dashboard SHALL für jedes Set den Namen, die Anzahl der Songs und die letzte Aktivität anzeigen
3. WHEN der Nutzer auf eine Set-Karte im Dashboard klickt, THE Dashboard SHALL zur Set_Detail_Ansicht navigieren
4. THE Dashboard SHALL einen Button „+ Neues Set" bereitstellen, der das Formular zum Erstellen eines Sets öffnet

### Anforderung 10: Zugriffskontrolle

**User Story:** Als Nutzer möchte ich sicher sein, dass nur ich meine eigenen Sets sehen und verwalten kann, damit meine Daten geschützt sind.

#### Akzeptanzkriterien

1. THE Set_Verwaltung SHALL sicherstellen, dass ein Nutzer ausschließlich Sets sehen kann, die dem Nutzer selbst gehören
2. IF ein nicht authentifizierter Benutzer auf die Set-API zugreift, THEN THE Set_Verwaltung SHALL den HTTP-Statuscode 401 zurückgeben
3. THE Set_Verwaltung SHALL bei allen Schreiboperationen (Erstellen, Bearbeiten, Löschen, Songs hinzufügen/entfernen) die Eigentümerschaft des Sets prüfen
