# Anforderungsdokument — Song CRUD UI

## Einleitung

Dieses Dokument beschreibt die Anforderungen für vollständigen CRUD-Support (Create, Read, Update, Delete) von Songs inklusive Strophen und Zeilen in der SongText Trainer UI. Die bestehende API-Schicht deckt Song-Metadaten-CRUD bereits ab (GET, POST, PUT, DELETE). Für Strophen und Zeilen existieren noch keine API-Endpunkte — diese müssen zusammen mit den UI-Komponenten erstellt werden. Alle UI-Elemente sollen sich nahtlos in die bestehenden Seiten (Dashboard, Song-Detail) integrieren und die deutsche Sprache der App beibehalten.

## Glossar

- **Dashboard**: Die Hauptübersichtsseite unter `/dashboard`, die alle Songs des Nutzers auflistet
- **Song_Detail_Seite**: Die Detailseite unter `/songs/[id]`, die einen einzelnen Song mit Strophen und Zeilen anzeigt
- **Song_Erstellen_Dialog**: Ein modaler Dialog zum Anlegen eines neuen Songs mit Metadaten
- **Song_Bearbeiten_Formular**: Ein Inline-Formular oder Dialog auf der Song_Detail_Seite zum Bearbeiten der Song-Metadaten
- **Lösch_Bestätigungsdialog**: Ein modaler Bestätigungsdialog vor dem endgültigen Löschen
- **Song_Metadaten**: Die Felder Titel (Pflicht), Künstler, Sprache und Emotions-Tags eines Songs
- **Strophe**: Ein benannter Textabschnitt eines Songs (z.B. Verse 1, Chorus, Bridge) mit einer Reihenfolge (orderIndex)
- **Zeile**: Eine einzelne Textzeile innerhalb einer Strophe, mit optionaler Übersetzung und einer Reihenfolge (orderIndex)
- **Strophen_Editor**: Der Bereich auf der Song_Detail_Seite, in dem Strophen hinzugefügt, bearbeitet, gelöscht und umsortiert werden können
- **Zeilen_Editor**: Der Bereich innerhalb einer Strophe, in dem Zeilen hinzugefügt, bearbeitet, gelöscht und umsortiert werden können
- **Strophen_API**: Die API-Endpunkte unter `/api/songs/[id]/strophen` für CRUD-Operationen auf Strophen
- **Zeilen_API**: Die API-Endpunkte unter `/api/songs/[id]/strophen/[stropheId]/zeilen` für CRUD-Operationen auf Zeilen
- **orderIndex**: Ein ganzzahliger Wert, der die Reihenfolge von Strophen innerhalb eines Songs bzw. Zeilen innerhalb einer Strophe bestimmt

## Anforderungen

### Anforderung 1: Song erstellen

**User Story:** Als Nutzer möchte ich einen neuen Song mit Metadaten anlegen können, damit ich Songs auch ohne vollständigen Strophentext in meiner Bibliothek erfassen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer auf dem Dashboard den „+ Neuer Song"-Button betätigt, THE Dashboard SHALL einen Song_Erstellen_Dialog anzeigen.
2. THE Song_Erstellen_Dialog SHALL ein Formular mit den Feldern Titel (Pflichtfeld), Künstler, Sprache und Emotions-Tags (kommagetrennt) anzeigen.
3. WHEN der Nutzer das Formular mit einem gültigen Titel absendet, THE Song_Erstellen_Dialog SHALL eine POST-Anfrage an `/api/songs` mit den eingegebenen Song_Metadaten senden.
4. WHEN die API eine erfolgreiche Antwort (201) zurückgibt, THE Song_Erstellen_Dialog SHALL sich schließen und das Dashboard SHALL die Song-Liste mit dem neuen Song aktualisieren.
5. WHEN der Nutzer das Formular ohne Titel absendet, THE Song_Erstellen_Dialog SHALL eine Validierungsfehlermeldung „Titel ist erforderlich" am Titel-Feld anzeigen.
6. IF die API einen Fehler zurückgibt, THEN THE Song_Erstellen_Dialog SHALL die Fehlermeldung der API im Dialog anzeigen.
7. WHILE die API-Anfrage läuft, THE Song_Erstellen_Dialog SHALL den Absende-Button deaktivieren und einen Ladezustand anzeigen.
8. WHEN der Nutzer den Dialog abbricht, THE Song_Erstellen_Dialog SHALL sich schließen, ohne Daten zu senden.

### Anforderung 2: Song-Metadaten bearbeiten

**User Story:** Als Nutzer möchte ich die Metadaten eines Songs (Titel, Künstler, Sprache, Emotions-Tags) bearbeiten können, damit ich Fehler korrigieren oder Informationen ergänzen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer auf der Song_Detail_Seite den Bearbeiten-Button betätigt, THE Song_Detail_Seite SHALL ein Song_Bearbeiten_Formular mit den aktuellen Song_Metadaten anzeigen.
2. THE Song_Bearbeiten_Formular SHALL die Felder Titel, Künstler, Sprache und Emotions-Tags vorausgefüllt mit den aktuellen Werten anzeigen.
3. WHEN der Nutzer das Formular mit gültigen Daten absendet, THE Song_Bearbeiten_Formular SHALL eine PUT-Anfrage an `/api/songs/[id]` mit den geänderten Song_Metadaten senden.
4. WHEN die API eine erfolgreiche Antwort zurückgibt, THE Song_Detail_Seite SHALL die angezeigten Song_Metadaten mit den neuen Werten aktualisieren und das Song_Bearbeiten_Formular ausblenden.
5. WHEN der Nutzer den Titel leer lässt und das Formular absendet, THE Song_Bearbeiten_Formular SHALL eine Validierungsfehlermeldung „Titel ist erforderlich" anzeigen.
6. IF die API einen Fehler zurückgibt, THEN THE Song_Bearbeiten_Formular SHALL die Fehlermeldung im Formular anzeigen.
7. WHILE die API-Anfrage läuft, THE Song_Bearbeiten_Formular SHALL den Speichern-Button deaktivieren und einen Ladezustand anzeigen.
8. WHEN der Nutzer die Bearbeitung abbricht, THE Song_Bearbeiten_Formular SHALL sich schließen und die ursprünglichen Song_Metadaten unverändert anzeigen.

### Anforderung 3: Song löschen

**User Story:** Als Nutzer möchte ich einen Song löschen können, damit ich nicht mehr benötigte Songs aus meiner Bibliothek entfernen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer auf der Song_Detail_Seite den Löschen-Button betätigt, THE Song_Detail_Seite SHALL einen Lösch_Bestätigungsdialog anzeigen.
2. THE Lösch_Bestätigungsdialog SHALL den Titel des zu löschenden Songs und einen Warnhinweis anzeigen, dass alle zugehörigen Daten (Strophen, Zeilen, Fortschritt, Sessions) unwiderruflich gelöscht werden.
3. WHEN der Nutzer das Löschen im Lösch_Bestätigungsdialog bestätigt, THE Lösch_Bestätigungsdialog SHALL eine DELETE-Anfrage an `/api/songs/[id]` senden.
4. WHEN die API eine erfolgreiche Antwort zurückgibt, THE Song_Detail_Seite SHALL den Nutzer zum Dashboard weiterleiten.
5. IF die API einen Fehler zurückgibt, THEN THE Lösch_Bestätigungsdialog SHALL die Fehlermeldung im Dialog anzeigen.
6. WHILE die API-Anfrage läuft, THE Lösch_Bestätigungsdialog SHALL den Bestätigen-Button deaktivieren und einen Ladezustand anzeigen.
7. WHEN der Nutzer das Löschen abbricht, THE Lösch_Bestätigungsdialog SHALL sich schließen, ohne Daten zu senden.

### Anforderung 4: Strophe hinzufügen

**User Story:** Als Nutzer möchte ich eine neue Strophe zu einem Song hinzufügen können, damit ich den Songtext schrittweise aufbauen oder erweitern kann.

#### Akzeptanzkriterien

1. THE Song_Detail_Seite SHALL im Strophen_Editor einen „+ Strophe hinzufügen"-Button unterhalb der bestehenden Strophen anzeigen.
2. WHEN der Nutzer den „+ Strophe hinzufügen"-Button betätigt, THE Strophen_Editor SHALL ein Eingabeformular für den Strophen-Namen (z.B. „Verse 3", „Bridge") anzeigen.
3. WHEN der Nutzer einen gültigen Strophen-Namen eingibt und bestätigt, THE Strophen_Editor SHALL eine POST-Anfrage an die Strophen_API senden, wobei der orderIndex automatisch auf den nächsten verfügbaren Wert gesetzt wird.
4. WHEN die API eine erfolgreiche Antwort zurückgibt, THE Strophen_Editor SHALL die neue Strophe in der Strophen-Liste an der korrekten Position anzeigen.
5. WHEN der Nutzer den Strophen-Namen leer lässt und bestätigt, THE Strophen_Editor SHALL eine Validierungsfehlermeldung „Name ist erforderlich" anzeigen.
6. IF die API einen Fehler zurückgibt, THEN THE Strophen_Editor SHALL die Fehlermeldung anzeigen.

### Anforderung 5: Strophe bearbeiten

**User Story:** Als Nutzer möchte ich den Namen einer Strophe bearbeiten können, damit ich Tippfehler korrigieren oder die Bezeichnung anpassen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer auf den Bearbeiten-Button einer Strophe klickt, THE Strophen_Editor SHALL den Strophen-Namen in ein editierbares Textfeld umwandeln.
2. WHEN der Nutzer den geänderten Namen bestätigt, THE Strophen_Editor SHALL eine PUT-Anfrage an die Strophen_API mit dem neuen Namen senden.
3. WHEN die API eine erfolgreiche Antwort zurückgibt, THE Strophen_Editor SHALL den aktualisierten Strophen-Namen anzeigen.
4. WHEN der Nutzer den Namen leer lässt und bestätigt, THE Strophen_Editor SHALL eine Validierungsfehlermeldung „Name ist erforderlich" anzeigen.
5. WHEN der Nutzer die Bearbeitung abbricht, THE Strophen_Editor SHALL den ursprünglichen Strophen-Namen unverändert anzeigen.

### Anforderung 6: Strophe löschen

**User Story:** Als Nutzer möchte ich eine Strophe löschen können, damit ich nicht mehr benötigte Abschnitte aus dem Song entfernen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer auf den Löschen-Button einer Strophe klickt, THE Strophen_Editor SHALL einen Lösch_Bestätigungsdialog anzeigen.
2. THE Lösch_Bestätigungsdialog SHALL den Namen der zu löschenden Strophe und einen Warnhinweis anzeigen, dass alle zugehörigen Zeilen und Markups unwiderruflich gelöscht werden.
3. WHEN der Nutzer das Löschen bestätigt, THE Strophen_Editor SHALL eine DELETE-Anfrage an die Strophen_API senden.
4. WHEN die API eine erfolgreiche Antwort zurückgibt, THE Strophen_Editor SHALL die gelöschte Strophe aus der Liste entfernen und die orderIndex-Werte der verbleibenden Strophen aktualisieren.
5. IF die API einen Fehler zurückgibt, THEN THE Strophen_Editor SHALL die Fehlermeldung anzeigen.

### Anforderung 7: Strophen umsortieren

**User Story:** Als Nutzer möchte ich die Reihenfolge der Strophen ändern können, damit ich die Songstruktur nach meinen Wünschen anpassen kann.

#### Akzeptanzkriterien

1. THE Strophen_Editor SHALL für jede Strophe Hoch- und Runter-Buttons zum Verschieben anzeigen.
2. WHEN der Nutzer den Hoch-Button einer Strophe betätigt, THE Strophen_Editor SHALL die Strophe mit der darüberliegenden Strophe tauschen und eine PUT-Anfrage an die Strophen_API mit den aktualisierten orderIndex-Werten senden.
3. WHEN der Nutzer den Runter-Button einer Strophe betätigt, THE Strophen_Editor SHALL die Strophe mit der darunterliegenden Strophe tauschen und eine PUT-Anfrage an die Strophen_API mit den aktualisierten orderIndex-Werten senden.
4. THE Strophen_Editor SHALL den Hoch-Button der ersten Strophe deaktivieren.
5. THE Strophen_Editor SHALL den Runter-Button der letzten Strophe deaktivieren.
6. WHEN die API eine erfolgreiche Antwort zurückgibt, THE Strophen_Editor SHALL die Strophen in der neuen Reihenfolge anzeigen.

### Anforderung 8: Zeile hinzufügen

**User Story:** Als Nutzer möchte ich eine neue Zeile zu einer Strophe hinzufügen können, damit ich den Text einer Strophe erweitern kann.

#### Akzeptanzkriterien

1. THE Zeilen_Editor SHALL innerhalb jeder Strophe einen „+ Zeile hinzufügen"-Button unterhalb der bestehenden Zeilen anzeigen.
2. WHEN der Nutzer den „+ Zeile hinzufügen"-Button betätigt, THE Zeilen_Editor SHALL ein Eingabeformular mit den Feldern Text (Pflichtfeld) und Übersetzung (optional) anzeigen.
3. WHEN der Nutzer einen gültigen Text eingibt und bestätigt, THE Zeilen_Editor SHALL eine POST-Anfrage an die Zeilen_API senden, wobei der orderIndex automatisch auf den nächsten verfügbaren Wert gesetzt wird.
4. WHEN die API eine erfolgreiche Antwort zurückgibt, THE Zeilen_Editor SHALL die neue Zeile in der Zeilen-Liste an der korrekten Position anzeigen.
5. WHEN der Nutzer den Text leer lässt und bestätigt, THE Zeilen_Editor SHALL eine Validierungsfehlermeldung „Text ist erforderlich" anzeigen.
6. IF die API einen Fehler zurückgibt, THEN THE Zeilen_Editor SHALL die Fehlermeldung anzeigen.

### Anforderung 9: Zeile bearbeiten

**User Story:** Als Nutzer möchte ich den Text und die Übersetzung einer Zeile bearbeiten können, damit ich Fehler korrigieren oder Übersetzungen ergänzen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer auf den Bearbeiten-Button einer Zeile klickt, THE Zeilen_Editor SHALL die Zeile in ein editierbares Formular mit den Feldern Text und Übersetzung umwandeln, vorausgefüllt mit den aktuellen Werten.
2. WHEN der Nutzer die geänderten Werte bestätigt, THE Zeilen_Editor SHALL eine PUT-Anfrage an die Zeilen_API mit den neuen Werten senden.
3. WHEN die API eine erfolgreiche Antwort zurückgibt, THE Zeilen_Editor SHALL die aktualisierte Zeile anzeigen.
4. WHEN der Nutzer den Text leer lässt und bestätigt, THE Zeilen_Editor SHALL eine Validierungsfehlermeldung „Text ist erforderlich" anzeigen.
5. WHEN der Nutzer die Bearbeitung abbricht, THE Zeilen_Editor SHALL die ursprünglichen Werte unverändert anzeigen.

### Anforderung 10: Zeile löschen

**User Story:** Als Nutzer möchte ich eine Zeile aus einer Strophe löschen können, damit ich nicht mehr benötigte Textzeilen entfernen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer auf den Löschen-Button einer Zeile klickt, THE Zeilen_Editor SHALL eine Lösch-Bestätigung anzeigen.
2. WHEN der Nutzer das Löschen bestätigt, THE Zeilen_Editor SHALL eine DELETE-Anfrage an die Zeilen_API senden.
3. WHEN die API eine erfolgreiche Antwort zurückgibt, THE Zeilen_Editor SHALL die gelöschte Zeile aus der Liste entfernen und die orderIndex-Werte der verbleibenden Zeilen aktualisieren.
4. IF die API einen Fehler zurückgibt, THEN THE Zeilen_Editor SHALL die Fehlermeldung anzeigen.

### Anforderung 11: Zeilen umsortieren

**User Story:** Als Nutzer möchte ich die Reihenfolge der Zeilen innerhalb einer Strophe ändern können, damit ich den Textfluss anpassen kann.

#### Akzeptanzkriterien

1. THE Zeilen_Editor SHALL für jede Zeile Hoch- und Runter-Buttons zum Verschieben anzeigen.
2. WHEN der Nutzer den Hoch-Button einer Zeile betätigt, THE Zeilen_Editor SHALL die Zeile mit der darüberliegenden Zeile tauschen und eine PUT-Anfrage an die Zeilen_API mit den aktualisierten orderIndex-Werten senden.
3. WHEN der Nutzer den Runter-Button einer Zeile betätigt, THE Zeilen_Editor SHALL die Zeile mit der darunterliegenden Zeile tauschen und eine PUT-Anfrage an die Zeilen_API mit den aktualisierten orderIndex-Werten senden.
4. THE Zeilen_Editor SHALL den Hoch-Button der ersten Zeile deaktivieren.
5. THE Zeilen_Editor SHALL den Runter-Button der letzten Zeile deaktivieren.
6. WHEN die API eine erfolgreiche Antwort zurückgibt, THE Zeilen_Editor SHALL die Zeilen in der neuen Reihenfolge anzeigen.

### Anforderung 12: Strophen- und Zeilen-API

**User Story:** Als Entwickler möchte ich API-Endpunkte für Strophen- und Zeilen-CRUD haben, damit die UI-Komponenten die Daten persistent verwalten können.

#### Akzeptanzkriterien

1. THE Strophen_API SHALL einen POST-Endpunkt `/api/songs/[id]/strophen` bereitstellen, der eine neue Strophe mit Name und automatischem orderIndex erstellt.
2. THE Strophen_API SHALL einen PUT-Endpunkt `/api/songs/[id]/strophen/[stropheId]` bereitstellen, der den Namen und/oder orderIndex einer Strophe aktualisiert.
3. THE Strophen_API SHALL einen DELETE-Endpunkt `/api/songs/[id]/strophen/[stropheId]` bereitstellen, der eine Strophe mit allen zugehörigen Zeilen und Markups löscht (Cascade Delete).
4. THE Strophen_API SHALL einen PUT-Endpunkt `/api/songs/[id]/strophen/reorder` bereitstellen, der die orderIndex-Werte mehrerer Strophen in einer Anfrage aktualisiert.
5. THE Zeilen_API SHALL einen POST-Endpunkt `/api/songs/[id]/strophen/[stropheId]/zeilen` bereitstellen, der eine neue Zeile mit Text, optionaler Übersetzung und automatischem orderIndex erstellt.
6. THE Zeilen_API SHALL einen PUT-Endpunkt `/api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId]` bereitstellen, der Text und/oder Übersetzung einer Zeile aktualisiert.
7. THE Zeilen_API SHALL einen DELETE-Endpunkt `/api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId]` bereitstellen, der eine Zeile mit allen zugehörigen Markups löscht (Cascade Delete).
8. THE Zeilen_API SHALL einen PUT-Endpunkt `/api/songs/[id]/strophen/[stropheId]/zeilen/reorder` bereitstellen, der die orderIndex-Werte mehrerer Zeilen in einer Anfrage aktualisiert.
9. WHEN ein nicht-authentifizierter Nutzer einen Strophen_API- oder Zeilen_API-Endpunkt aufruft, THE Strophen_API SHALL eine 401-Antwort mit der Meldung „Nicht authentifiziert" zurückgeben.
10. WHEN ein Nutzer auf eine Strophe oder Zeile eines fremden Songs zugreift, THE Strophen_API SHALL eine 403-Antwort mit der Meldung „Zugriff verweigert" zurückgeben.
11. IF eine referenzierte Song-ID, Strophen-ID oder Zeilen-ID nicht existiert, THEN THE Strophen_API SHALL eine 404-Antwort zurückgeben.

### Anforderung 13: Dashboard-Integration

**User Story:** Als Nutzer möchte ich vom Dashboard aus schnell einen neuen Song anlegen können, damit der Workflow zum Hinzufügen von Songs reibungslos ist.

#### Akzeptanzkriterien

1. THE Dashboard SHALL einen sichtbaren Button „+ Neuer Song" im Bereich der Song-Liste anzeigen.
2. WHEN keine Songs vorhanden sind, THE Dashboard SHALL neben dem bestehenden „Song importieren"-Link auch den „+ Neuer Song"-Button im leeren Zustand anzeigen.
3. WHEN der Nutzer den „+ Neuer Song"-Button betätigt, THE Dashboard SHALL den Song_Erstellen_Dialog öffnen.

### Anforderung 14: Barrierefreiheit

**User Story:** Als Nutzer mit Hilfstechnologien möchte ich alle CRUD-Funktionen vollständig bedienen können, damit die App für alle zugänglich ist.

#### Akzeptanzkriterien

1. THE Song_Erstellen_Dialog SHALL den Fokus beim Öffnen auf das erste Eingabefeld setzen und beim Schließen den Fokus auf den auslösenden Button zurücksetzen.
2. THE Lösch_Bestätigungsdialog SHALL den Fokus beim Öffnen auf den Abbrechen-Button setzen und beim Schließen den Fokus auf den auslösenden Button zurücksetzen.
3. THE Song_Erstellen_Dialog SHALL mit der Escape-Taste geschlossen werden können.
4. THE Lösch_Bestätigungsdialog SHALL mit der Escape-Taste geschlossen werden können.
5. THE Song_Bearbeiten_Formular SHALL alle Formularfelder mit zugehörigen Labels und `aria-required` für Pflichtfelder versehen.
6. WHEN ein Validierungsfehler auftritt, THE Song_Erstellen_Dialog SHALL das fehlerhafte Feld mit `aria-invalid="true"` und einer per `aria-describedby` verknüpften Fehlermeldung kennzeichnen.
7. WHEN ein Validierungsfehler auftritt, THE Song_Bearbeiten_Formular SHALL das fehlerhafte Feld mit `aria-invalid="true"` und einer per `aria-describedby` verknüpften Fehlermeldung kennzeichnen.
8. THE Strophen_Editor SHALL die Hoch- und Runter-Buttons mit beschreibenden `aria-label`-Attributen versehen (z.B. „Strophe Verse 1 nach oben verschieben").
9. THE Zeilen_Editor SHALL die Hoch- und Runter-Buttons mit beschreibenden `aria-label`-Attributen versehen (z.B. „Zeile 1 nach oben verschieben").
10. WHEN eine Strophe oder Zeile erfolgreich hinzugefügt, gelöscht oder umsortiert wird, THE Song_Detail_Seite SHALL eine `aria-live="polite"` Statusmeldung ausgeben.
