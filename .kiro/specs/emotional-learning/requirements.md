# Anforderungsdokument: Emotionales Lernen

## Einleitung

Dieses Dokument beschreibt die Anforderungen für die Lernmethode „Emotionales Lernen" der Songtext-Lern-Webanwendung „Lyco". Das Feature ermöglicht es Benutzern, einen Song über Bedeutung und emotionalen Gehalt zu erschließen, bevor der Text auswendig gelernt wird. Übersetzungen sind zunächst verborgen und werden aktiv aufgedeckt. Interpretationen und persönliche Notizen vertiefen die emotionale Verankerung.

Das Feature baut auf dem bestehenden Datenmodell (Song, Strophe, Zeile, Notiz, Session, Fortschritt) aus der Spec „song-data-management" auf und fügt eine neue Frontend-Ansicht mit drei Tabs (Übersetzung, Interpretation, Meine Notizen) sowie eine Interpretation-Datenschicht hinzu.

Referenz: [Planungsdokument](../../.planning/key_features.md) Kapitel 4, User Stories US-010 und US-011.

## Glossar

- **Anwendung**: Die Songtext-Lern-Webanwendung „Lyco" als Gesamtsystem
- **Emotional_Lernen_Ansicht**: Die Frontend-Seite für die Lernmethode „Emotionales Lernen", erreichbar über eine Song-spezifische Route
- **Übersetzungs_Tab**: Der erste Tab der Emotional_Lernen_Ansicht, der Strophen-Karten mit verborgenen Übersetzungen anzeigt
- **Interpretations_Tab**: Der zweite Tab der Emotional_Lernen_Ansicht, der pro Strophe eine Interpretations-Box mit Freitext-Erklärung anzeigt
- **Notizen_Tab**: Der dritte Tab der Emotional_Lernen_Ansicht, der pro Strophe ein Notizfeld für persönliche Verbindungen anzeigt
- **Aufdecken_Interaktion**: Die Benutzeraktion, bei der eine verborgene Übersetzungszeile durch Tippen sichtbar gemacht wird
- **Strophen_Karte**: Eine UI-Karte, die eine Strophe mit Header (Strophen-Name + „Alle aufdecken"-Button) und Zeilen-Paaren darstellt
- **Zeilen_Paar**: Die Darstellung einer Zeile bestehend aus Original-Text und darunter liegender Übersetzungszeile
- **Emotions_Tag**: Ein Stimmungs-Label für einen Song (z.B. Melancholie, Sehnsucht), das als nicht-editierbare Pill in der Emotional_Lernen_Ansicht angezeigt wird
- **Interpretation**: Eine Freitext-Erklärung zur Bedeutung einer Strophe, die vom Benutzer pro Strophe gespeichert wird
- **Interpretation_Service**: Die serverseitige Komponente, die CRUD-Operationen für Interpretationen verarbeitet
- **Song_Service**: Die bestehende serverseitige Komponente für Song-bezogene Operationen (aus song-data-management)
- **Session_Service**: Die bestehende serverseitige Komponente für Session-Tracking (aus song-data-management)
- **Navigationsleiste**: Die obere Leiste der Emotional_Lernen_Ansicht mit Zurück-Button, Song-Titel und Methoden-Label

## Anforderungen

### Anforderung 1: Interpretation-Datenmodell

**User Story:** Als Entwickler möchte ich ein Datenmodell für Interpretationen haben, damit Benutzer pro Strophe eine Freitext-Erklärung zur Bedeutung speichern können.

#### Akzeptanzkriterien

1. THE Anwendung SHALL das Prisma-Schema um ein Interpretation-Modell erweitern, das die Felder Benutzer-Referenz, Strophen-Referenz und Freitext speichert.
2. THE Anwendung SHALL pro Benutzer und Strophe maximal eine Interpretation zulassen (Unique-Constraint auf der Kombination userId und stropheId).
3. THE Anwendung SHALL Cascade-Delete für Interpretationen konfigurieren, sodass beim Löschen einer Strophe oder eines Benutzers alle zugehörigen Interpretationen automatisch entfernt werden.
4. THE Anwendung SHALL einen Zeitstempel für die letzte Aktualisierung jeder Interpretation speichern.

### Anforderung 2: Interpretation-Verwaltung (CRUD)

**User Story:** Als Benutzer möchte ich Interpretationen zu einzelnen Strophen erstellen, bearbeiten und löschen können, damit ich die Bedeutung des Textes in eigenen Worten festhalten kann.

#### Akzeptanzkriterien

1. WHEN ein authentifizierter Benutzer eine Interpretation zu einer Strophe eines eigenen Songs erstellt, THE Interpretation_Service SHALL die Interpretation mit Referenz zum Benutzer und zur Strophe in der Datenbank speichern.
2. WHEN ein authentifizierter Benutzer eine bestehende Interpretation aktualisiert, THE Interpretation_Service SHALL den Interpretationstext in der Datenbank aktualisieren (Upsert-Verhalten: Erstellen falls nicht vorhanden, Aktualisieren falls vorhanden).
3. WHEN ein authentifizierter Benutzer eine Interpretation löscht, THE Interpretation_Service SHALL die Interpretation aus der Datenbank entfernen.
4. IF ein Benutzer versucht, eine Interpretation zu einer Strophe eines fremden Songs zu erstellen oder zu bearbeiten, THEN THE Interpretation_Service SHALL die Anfrage mit HTTP-Statuscode 403 ablehnen.
5. IF ein Benutzer versucht, eine Interpretation mit leerem Text zu erstellen, THEN THE Interpretation_Service SHALL die Anfrage mit einer Fehlermeldung ablehnen.
6. WHEN ein authentifizierter Benutzer die Interpretationen eines eigenen Songs abruft, THE Interpretation_Service SHALL alle Interpretationen des Benutzers für den Song zurückgeben.

### Anforderung 3: Interpretation-API-Endpunkte

**User Story:** Als Frontend-Entwickler möchte ich API-Endpunkte für Interpretationen haben, damit die Emotional_Lernen_Ansicht Interpretationen laden und speichern kann.

#### Akzeptanzkriterien

1. THE Anwendung SHALL einen POST-Endpunkt unter `/api/interpretations` bereitstellen, der eine Interpretation erstellt oder aktualisiert (Upsert).
2. THE Anwendung SHALL einen DELETE-Endpunkt unter `/api/interpretations/[id]` bereitstellen, der eine Interpretation löscht.
3. THE Anwendung SHALL einen GET-Endpunkt unter `/api/interpretations?songId=X` bereitstellen, der alle Interpretationen eines Songs für den authentifizierten Benutzer zurückgibt.
4. WHEN eine Interpretation-API_Route eine Anfrage ohne gültige Session erhält, THE API_Route SHALL die Anfrage mit HTTP-Statuscode 401 ablehnen.
5. THE API_Route SHALL alle Eingabedaten validieren und bei ungültigen Daten HTTP-Statuscode 400 mit einer beschreibenden Fehlermeldung zurückgeben.

### Anforderung 4: Emotional-Lernen-Seitenstruktur

**User Story:** Als Benutzer möchte ich eine dedizierte Seite für die Lernmethode „Emotionales Lernen" aufrufen können, damit ich einen Song über Bedeutung und Emotion erschließen kann.

#### Akzeptanzkriterien

1. THE Emotional_Lernen_Ansicht SHALL unter der Route `/songs/[id]/emotional` erreichbar sein.
2. THE Emotional_Lernen_Ansicht SHALL eine Navigationsleiste mit einem Zurück-Button (links), dem Song-Titel (Mitte) und dem Methoden-Label „Emotionales Lernen" (rechts) anzeigen.
3. THE Emotional_Lernen_Ansicht SHALL unterhalb der Navigationsleiste eine horizontale Pill-Reihe mit den Emotions_Tags des Songs anzeigen.
4. WHILE der Benutzer die Emotional_Lernen_Ansicht im Lernmodus nutzt, THE Emotional_Lernen_Ansicht SHALL die Emotions_Tags als nicht-editierbare Pills darstellen.
5. THE Emotional_Lernen_Ansicht SHALL drei Modus-Tabs anzeigen: „Übersetzung", „Interpretation" und „Meine Notizen".
6. THE Emotional_Lernen_Ansicht SHALL den aktiven Tab mit lila Hintergrundfarbe hervorheben.
7. IF ein Benutzer versucht, die Emotional_Lernen_Ansicht eines Songs eines anderen Benutzers aufzurufen, THEN THE Anwendung SHALL den Benutzer zur Dashboard-Seite weiterleiten.
8. IF ein Benutzer die Emotional_Lernen_Ansicht ohne gültige Session aufruft, THEN THE Anwendung SHALL den Benutzer zur Login-Seite weiterleiten.

### Anforderung 5: Übersetzungs-Tab mit Aufdecken-Interaktion

**User Story:** Als Benutzer möchte ich die Übersetzung jeder Zeile durch Antippen aufdecken, damit ich den emotionalen Inhalt aktiv erschließe statt ihn passiv zu lesen.

#### Akzeptanzkriterien

1. WHILE der Übersetzungs_Tab aktiv ist, THE Emotional_Lernen_Ansicht SHALL pro Strophe eine Strophen_Karte mit Header (Strophen-Name und „Alle aufdecken"-Button) und Zeilen_Paaren anzeigen.
2. THE Emotional_Lernen_Ansicht SHALL jede Original-Zeile mit einer Schriftgröße von 15px und primärer Textfarbe darstellen.
3. THE Emotional_Lernen_Ansicht SHALL jede Übersetzungszeile mit einer Schriftgröße von 13px, kursiver Schrift und sekundärer Textfarbe darstellen.
4. THE Emotional_Lernen_Ansicht SHALL alle Übersetzungszeilen initial als verborgene graue Balken darstellen (Textfarbe transparent, Hintergrund grau).
5. WHEN ein Benutzer auf eine verborgene Übersetzungszeile tippt, THE Emotional_Lernen_Ansicht SHALL die Übersetzung dieser einen Zeile sichtbar machen (Textfarbe sichtbar, Hintergrund entfernt) mit einer CSS-Transition von 200 Millisekunden.
6. WHEN ein Benutzer auf den „Alle aufdecken"-Button einer Strophen_Karte tippt, THE Emotional_Lernen_Ansicht SHALL alle Übersetzungszeilen dieser Strophe sichtbar machen.
7. THE Emotional_Lernen_Ansicht SHALL den aufgedeckten Zustand jeder Zeile während der gesamten Browser-Session beibehalten (kein Zurücksetzen bei Tab-Wechsel innerhalb der Ansicht).
8. WHEN eine Zeile keine Übersetzung besitzt, THE Emotional_Lernen_Ansicht SHALL keinen grauen Balken und keinen Platzhalter für diese Zeile anzeigen.

### Anforderung 6: Interpretations-Tab

**User Story:** Als Benutzer möchte ich pro Strophe eine Interpretation der Bedeutung sehen und bearbeiten können, damit ich den emotionalen Gehalt des Textes besser verstehe.

#### Akzeptanzkriterien

1. WHILE der Interpretations_Tab aktiv ist, THE Emotional_Lernen_Ansicht SHALL pro Strophe eine Strophen_Karte mit den Zeilen_Paaren und darunter eine Interpretations-Box anzeigen.
2. THE Emotional_Lernen_Ansicht SHALL die Interpretations-Box mit lila Hintergrundfarbe (#EEEDFE) und dem Label „Bedeutung dieser Strophe" darstellen.
3. THE Emotional_Lernen_Ansicht SHALL in der Interpretations-Box den gespeicherten Interpretationstext als editierbares Textfeld anzeigen.
4. WHEN ein Benutzer den Interpretationstext ändert und das Textfeld verlässt (Blur-Event), THE Emotional_Lernen_Ansicht SHALL die Interpretation automatisch über die API speichern (Auto-Save).
5. WHILE der Übersetzungs_Tab oder der Notizen_Tab aktiv ist, THE Emotional_Lernen_Ansicht SHALL die Interpretations-Box ausblenden.

### Anforderung 7: Notizen-Tab

**User Story:** Als Benutzer möchte ich eigene Gedanken und Assoziationen zu einer Strophe notieren, damit meine persönliche emotionale Verbindung zum Song festgehalten wird.

#### Akzeptanzkriterien

1. WHILE der Notizen_Tab aktiv ist, THE Emotional_Lernen_Ansicht SHALL pro Strophe eine Strophen_Karte mit den Zeilen_Paaren und darunter ein Notizfeld anzeigen.
2. THE Emotional_Lernen_Ansicht SHALL das Notizfeld als Textarea mit dem Placeholder „Meine persönliche Verbindung zu diesem Abschnitt..." darstellen.
3. THE Emotional_Lernen_Ansicht SHALL im Notizfeld den gespeicherten Notiztext anzeigen, falls eine Notiz für die Strophe existiert.
4. WHEN ein Benutzer den Notiztext ändert und das Textfeld verlässt (Blur-Event), THE Emotional_Lernen_Ansicht SHALL die Notiz automatisch über die bestehende Notiz-API speichern (Auto-Save).
5. WHILE der Übersetzungs_Tab oder der Interpretations_Tab aktiv ist, THE Emotional_Lernen_Ansicht SHALL das Notizfeld ausblenden.

### Anforderung 8: Session-Tracking für Emotionales Lernen

**User Story:** Als Benutzer möchte ich, dass meine Emotionales-Lernen-Sessions erfasst werden, damit mein Lernfortschritt nachvollziehbar ist.

#### Akzeptanzkriterien

1. WHEN ein Benutzer die Emotional_Lernen_Ansicht eines Songs öffnet, THE Anwendung SHALL eine neue Session mit der Lernmethode EMOTIONAL über den bestehenden Session_Service anlegen.
2. THE Anwendung SHALL die Lernmethode EMOTIONAL aus dem bestehenden Lernmethode-Enum verwenden (bereits im Prisma-Schema definiert).

### Anforderung 9: Aktions-Buttons

**User Story:** Als Benutzer möchte ich am Ende der Emotional-Lernen-Ansicht Aktions-Buttons sehen, damit ich zur nächsten Lernmethode wechseln oder die Symbolik vertiefen kann.

#### Akzeptanzkriterien

1. THE Emotional_Lernen_Ansicht SHALL am unteren Rand zwei Aktions-Buttons in einem 2-Spalten-Raster anzeigen: „Symbolik vertiefen" (sekundärer Button) und „Zum Lückentext" (primärer Button, lila Hintergrund).
2. WHEN ein Benutzer auf den Button „Zum Lückentext" tippt, THE Emotional_Lernen_Ansicht SHALL den Benutzer zur Lückentext-Lernmethode des aktuellen Songs navigieren.
3. WHEN ein Benutzer auf den Button „Symbolik vertiefen" tippt, THE Emotional_Lernen_Ansicht SHALL den Interpretations_Tab aktivieren und zum ersten Strophen-Abschnitt scrollen.

### Anforderung 10: Responsive Darstellung

**User Story:** Als Benutzer möchte ich die Emotional-Lernen-Ansicht auf allen Geräten komfortabel nutzen können, damit ich flexibel lernen kann.

#### Akzeptanzkriterien

1. THE Emotional_Lernen_Ansicht SHALL auf Bildschirmbreiten von 320px bis 1440px korrekt dargestellt werden.
2. WHILE die Bildschirmbreite kleiner als 768px ist, THE Emotional_Lernen_Ansicht SHALL ein einspaltiges Layout für die Aktions-Buttons verwenden (Buttons untereinander statt nebeneinander).
3. THE Emotional_Lernen_Ansicht SHALL alle interaktiven Elemente (Tabs, Buttons, Aufdecken-Bereiche) mit einer Mindestgröße von 44x44 Pixeln für Touch-Eingaben darstellen.
4. THE Emotional_Lernen_Ansicht SHALL einen Farbkontrast von mindestens 4.5:1 für normalen Text einhalten.

### Anforderung 11: Barrierefreiheit

**User Story:** Als Benutzer mit Einschränkungen möchte ich die Emotional-Lernen-Ansicht mit Tastatur und Screenreader bedienen können.

#### Akzeptanzkriterien

1. THE Emotional_Lernen_Ansicht SHALL alle Modus-Tabs per Tastatur erreichbar und aktivierbar machen (Tab-Navigation und Enter/Space-Aktivierung).
2. THE Emotional_Lernen_Ansicht SHALL die Modus-Tabs mit `role="tablist"` und `role="tab"` sowie `aria-selected`-Attributen versehen.
3. THE Emotional_Lernen_Ansicht SHALL jeden „Alle aufdecken"-Button mit einem `aria-label` versehen, das den Strophen-Namen enthält (z.B. „Alle Übersetzungen in Verse 1 aufdecken").
4. THE Emotional_Lernen_Ansicht SHALL jede verborgene Übersetzungszeile mit `aria-hidden="true"` markieren und nach dem Aufdecken auf `aria-hidden="false"` setzen.
5. THE Emotional_Lernen_Ansicht SHALL alle Textfelder (Interpretation, Notiz) mit korrekten `aria-label`-Attributen versehen.
6. THE Emotional_Lernen_Ansicht SHALL alle interaktiven Elemente per Tastatur erreichbar machen.
