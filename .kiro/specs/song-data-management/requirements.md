# Anforderungsdokument: Song-Datenverwaltung

## Einleitung

Dieses Dokument beschreibt die Anforderungen für die Song-Datenverwaltung der Songtext-Lern-Webanwendung "Lyco". Das Feature umfasst das Datenmodell für Songs, Sets, Strophen, Zeilen, Markups, Sessions, Fortschritt und Notizen sowie die zugehörigen CRUD-Operationen. Es bildet die Datengrundlage, auf der alle Lernmethoden (Lückentext, Spaced Repetition, Zeile-für-Zeile etc.) aufbauen. Das Markup-System ermöglicht Annotationen für Pausen, Wiederholungen, Gesangstechnik und Timecodes auf Strophen-, Zeilen- und Wort-Ebene. Das bestehende Prisma-Schema (User, LoginAttempt) wird um die neuen Modelle erweitert. Die API-Routen folgen dem bestehenden Next.js App Router-Muster.

## Glossar

- **Anwendung**: Die Songtext-Lern-Webanwendung "Lyco" als Gesamtsystem
- **Song_Service**: Die serverseitige Komponente, die CRUD-Operationen für Songs, Sets und zugehörige Entitäten verarbeitet
- **Set**: Eine benannte Sammlung von Songs (z.B. "Konzert März 2025"), die einem Benutzer gehört
- **Song**: Ein Songtext mit Metadaten (Titel, Künstler, Sprache), bestehend aus Strophen
- **Strophe**: Ein benannter Textabschnitt eines Songs (z.B. Verse 1, Chorus, Bridge) mit einer definierten Reihenfolge
- **Zeile**: Eine einzelne Textzeile innerhalb einer Strophe, optional mit Übersetzung
- **Session**: Eine abgeschlossene Lerneinheit eines Benutzers an einem Song
- **Fortschritt**: Der prozentuale Lernstand eines Benutzers je Strophe (0–100)
- **Notiz**: Eine persönliche Anmerkung eines Benutzers zu einer Strophe
- **Emotions_Tag**: Ein Stimmungs-Label für einen Song (z.B. Melancholie, Sehnsucht), das für emotionales Lernen verwendet wird
- **API_Route**: Ein serverseitiger Endpunkt in Next.js App Router, der Anfragen verarbeitet und Antworten zurückgibt
- **Dashboard**: Die Hauptseite der Anwendung, die Sets und Songs mit Fortschritt anzeigt
- **Song_Detail**: Die Detailansicht eines Songs mit Strophen, Zeilen und Metadaten
- **Markup**: Eine Annotation an einer Strophe, Zeile oder einem Wort innerhalb einer Zeile, die zusätzliche Informationen wie Pausen, Wiederholungen, Gesangstechnik oder Timecodes enthält
- **Markup_Typ**: Die Kategorie eines Markups (z.B. PAUSE, WIEDERHOLUNG, ATMUNG, KOPFSTIMME, BRUSTSTIMME, TIMECODE)
- **Markup_Ziel**: Die Ebene, auf der ein Markup angebracht ist (STROPHE, ZEILE oder WORT)
- **Timecode**: Ein Zeitstempel in Millisekunden, der eine Position in einer Audio-Datei oder einem Streaming-Player referenziert

## Anforderungen

### Anforderung 1: Prisma-Schema-Erweiterung (Datenmodell)

**User Story:** Als Entwickler möchte ich ein vollständiges Datenmodell für Songs, Sets und zugehörige Entitäten haben, damit alle Lernmethoden auf einer konsistenten Datenstruktur aufbauen können.

#### Akzeptanzkriterien

1. THE Anwendung SHALL das bestehende Prisma-Schema um die Modelle Set, Song, Strophe, Zeile, Session, Fortschritt und Notiz erweitern, ohne die bestehenden Modelle User und LoginAttempt zu verändern.
2. THE Anwendung SHALL eine Many-to-Many-Beziehung zwischen Set und Song über eine explizite Zwischentabelle abbilden, sodass ein Song mehreren Sets zugeordnet werden kann.
3. THE Anwendung SHALL für jeden Song die Felder Titel, Künstler, Sprache und eine Liste von Emotions_Tags speichern.
4. THE Anwendung SHALL für jede Strophe einen Namen (z.B. "Verse 1", "Chorus"), eine Reihenfolge-Nummer und eine Referenz zum zugehörigen Song speichern.
5. THE Anwendung SHALL für jede Zeile den Originaltext, eine optionale Übersetzung, eine Reihenfolge-Nummer und eine Referenz zur zugehörigen Strophe speichern.
6. THE Anwendung SHALL für jede Session den Benutzer, den Song, den Zeitpunkt und die verwendete Lernmethode speichern.
7. THE Anwendung SHALL für jeden Fortschritt den Benutzer, die Strophe und den prozentualen Lernstand (0–100) speichern.
8. THE Anwendung SHALL für jede Notiz den Benutzer, die Strophe und den Notiztext speichern.
9. THE Anwendung SHALL Cascade-Delete konfigurieren, sodass beim Löschen eines Songs alle zugehörigen Strophen, Zeilen, Markups, Sessions, Fortschritte und Notizen automatisch entfernt werden.
10. THE Anwendung SHALL für jedes Set eine Referenz zum besitzenden Benutzer speichern, sodass Sets benutzerspezifisch sind.
11. THE Anwendung SHALL ein Markup-Modell bereitstellen, das einen Markup_Typ (Enum: PAUSE, WIEDERHOLUNG, ATMUNG, KOPFSTIMME, BRUSTSTIMME, BELT, FALSETT, TIMECODE), ein Markup_Ziel (Enum: STROPHE, ZEILE, WORT), eine optionale Referenz zur Strophe, eine optionale Referenz zur Zeile, einen optionalen Wort-Index innerhalb der Zeile, einen optionalen Freitext-Wert und einen optionalen Timecode-Wert in Millisekunden speichert.
12. THE Anwendung SHALL sicherstellen, dass je nach Markup_Ziel die korrekte Referenz gesetzt ist: bei STROPHE eine Strophen-Referenz, bei ZEILE eine Zeilen-Referenz, bei WORT eine Zeilen-Referenz plus Wort-Index.
13. THE Anwendung SHALL Cascade-Delete für Markups konfigurieren, sodass beim Löschen einer Strophe oder Zeile alle zugehörigen Markups automatisch entfernt werden.

### Anforderung 2: Set-Verwaltung (CRUD)

**User Story:** Als Benutzer möchte ich Sets erstellen, anzeigen, bearbeiten und löschen können, damit ich meine Songs thematisch organisieren kann.

#### Akzeptanzkriterien

1. WHEN ein authentifizierter Benutzer ein neues Set mit einem Namen erstellt, THE Song_Service SHALL das Set in der Datenbank anlegen und dem Benutzer zuordnen.
2. WHEN ein authentifizierter Benutzer seine Sets abruft, THE Song_Service SHALL alle Sets des Benutzers mit der Anzahl enthaltener Songs und dem Datum der letzten Aktivität zurückgeben.
3. WHEN ein authentifizierter Benutzer den Namen eines eigenen Sets ändert, THE Song_Service SHALL den Namen in der Datenbank aktualisieren.
4. WHEN ein authentifizierter Benutzer ein eigenes Set löscht, THE Song_Service SHALL das Set aus der Datenbank entfernen, ohne die darin enthaltenen Songs zu löschen.
5. IF ein Benutzer versucht, ein Set eines anderen Benutzers zu bearbeiten oder zu löschen, THEN THE Song_Service SHALL die Anfrage mit HTTP-Statuscode 403 ablehnen.
6. IF ein Benutzer versucht, ein Set ohne Namen zu erstellen, THEN THE Song_Service SHALL die Anfrage mit einer Fehlermeldung ablehnen.
7. WHEN ein authentifizierter Benutzer einen Song zu einem eigenen Set hinzufügt, THE Song_Service SHALL die Zuordnung in der Zwischentabelle erstellen.
8. WHEN ein authentifizierter Benutzer einen Song aus einem eigenen Set entfernt, THE Song_Service SHALL die Zuordnung in der Zwischentabelle entfernen, ohne den Song selbst zu löschen.

### Anforderung 3: Song-Verwaltung (CRUD)

**User Story:** Als Benutzer möchte ich Songs mit Titel, Künstler und Sprache erstellen, anzeigen, bearbeiten und löschen können, damit ich meine Songtexte in der Anwendung verwalten kann.

#### Akzeptanzkriterien

1. WHEN ein authentifizierter Benutzer einen neuen Song mit Titel, Künstler und Sprache erstellt, THE Song_Service SHALL den Song in der Datenbank anlegen und dem Benutzer zuordnen.
2. WHEN ein authentifizierter Benutzer seine Songs abruft, THE Song_Service SHALL alle Songs des Benutzers mit Titel, Künstler, Sprache und Gesamtfortschritt zurückgeben.
3. WHEN ein authentifizierter Benutzer die Metadaten eines eigenen Songs ändert, THE Song_Service SHALL die geänderten Felder in der Datenbank aktualisieren.
4. WHEN ein authentifizierter Benutzer einen eigenen Song löscht, THE Song_Service SHALL den Song und alle zugehörigen Strophen, Zeilen, Sessions, Fortschritte und Notizen aus der Datenbank entfernen.
5. IF ein Benutzer versucht, einen Song eines anderen Benutzers zu bearbeiten oder zu löschen, THEN THE Song_Service SHALL die Anfrage mit HTTP-Statuscode 403 ablehnen.
6. IF ein Benutzer versucht, einen Song ohne Titel zu erstellen, THEN THE Song_Service SHALL die Anfrage mit einer Fehlermeldung ablehnen.
7. WHEN ein authentifizierter Benutzer Emotions_Tags für einen eigenen Song setzt, THE Song_Service SHALL die Tags als Array am Song speichern.

### Anforderung 4: Song-Import (Strophen und Zeilen)

**User Story:** Als Benutzer möchte ich einen Song mit allen Strophen und Zeilen in einem Schritt importieren können, damit ich nicht jede Zeile einzeln anlegen muss.

#### Akzeptanzkriterien

1. WHEN ein authentifizierter Benutzer einen Song mit Strophen und Zeilen importiert, THE Song_Service SHALL den Song, alle Strophen und alle Zeilen in einer einzigen Datenbanktransaktion anlegen.
2. THE Song_Service SHALL für jede Strophe die Reihenfolge-Nummer basierend auf der Position im Import-Payload automatisch vergeben.
3. THE Song_Service SHALL für jede Zeile die Reihenfolge-Nummer basierend auf der Position innerhalb der Strophe automatisch vergeben.
4. WHEN eine Zeile im Import-Payload eine Übersetzung enthält, THE Song_Service SHALL die Übersetzung zusammen mit dem Originaltext speichern.
5. WHEN eine Zeile im Import-Payload keine Übersetzung enthält, THE Song_Service SHALL das Übersetzungsfeld leer lassen.
6. IF der Import-Payload keine Strophen enthält, THEN THE Song_Service SHALL die Anfrage mit einer Fehlermeldung ablehnen.
7. IF eine Strophe im Import-Payload keine Zeilen enthält, THEN THE Song_Service SHALL die Anfrage mit einer Fehlermeldung ablehnen.
8. THE Song_Service SHALL den Import-Payload validieren und bei ungültigen Daten eine beschreibende Fehlermeldung mit den betroffenen Feldern zurückgeben.
9. WHEN der Import-Payload Markups für Strophen, Zeilen oder Wörter enthält, THE Song_Service SHALL die Markups zusammen mit dem Song in derselben Transaktion anlegen.

### Anforderung 5: Song-Detailansicht

**User Story:** Als Benutzer möchte ich einen Song mit allen Strophen, Zeilen und Metadaten sehen können, damit ich den vollständigen Songtext vor dem Lernen überprüfen kann.

#### Akzeptanzkriterien

1. WHEN ein authentifizierter Benutzer die Detailansicht eines eigenen Songs aufruft, THE Song_Service SHALL den Song mit allen Strophen (sortiert nach Reihenfolge), allen Zeilen je Strophe (sortiert nach Reihenfolge), Metadaten, Emotions_Tags und zugehörigen Markups zurückgeben.
2. WHEN ein authentifizierter Benutzer die Detailansicht eines eigenen Songs aufruft, THE Song_Service SHALL den Gesamtfortschritt und den Fortschritt je Strophe für den Benutzer mitliefern.
3. WHEN ein authentifizierter Benutzer die Detailansicht eines eigenen Songs aufruft, THE Song_Service SHALL die Anzahl abgeschlossener Sessions für den Song mitliefern.
4. IF ein Benutzer versucht, die Detailansicht eines Songs eines anderen Benutzers aufzurufen, THEN THE Song_Service SHALL die Anfrage mit HTTP-Statuscode 403 ablehnen.
5. IF ein Benutzer einen Song aufruft, der nicht existiert, THEN THE Song_Service SHALL die Anfrage mit HTTP-Statuscode 404 ablehnen.

### Anforderung 6: Notizen-Verwaltung

**User Story:** Als Benutzer möchte ich persönliche Notizen zu einzelnen Strophen speichern und bearbeiten können, damit ich meine Gedanken und emotionalen Verbindungen zum Text festhalten kann.

#### Akzeptanzkriterien

1. WHEN ein authentifizierter Benutzer eine Notiz zu einer Strophe erstellt, THE Song_Service SHALL die Notiz mit Referenz zum Benutzer und zur Strophe in der Datenbank speichern.
2. WHEN ein authentifizierter Benutzer eine bestehende Notiz bearbeitet, THE Song_Service SHALL den Notiztext in der Datenbank aktualisieren.
3. WHEN ein authentifizierter Benutzer eine Notiz löscht, THE Song_Service SHALL die Notiz aus der Datenbank entfernen.
4. THE Song_Service SHALL pro Benutzer und Strophe maximal eine Notiz zulassen.
5. IF ein Benutzer versucht, eine Notiz zu einer Strophe eines fremden Songs zu erstellen, THEN THE Song_Service SHALL die Anfrage mit HTTP-Statuscode 403 ablehnen.

### Anforderung 7: Session-Tracking

**User Story:** Als Benutzer möchte ich, dass meine abgeschlossenen Lernsessions erfasst werden, damit mein Lernfortschritt nachvollziehbar ist und Gamification-Elemente (Streak, Session-Zähler) korrekt funktionieren.

#### Akzeptanzkriterien

1. WHEN ein authentifizierter Benutzer eine Lernsession abschließt, THE Song_Service SHALL eine neue Session mit Benutzer-ID, Song-ID, Zeitstempel und Lernmethode in der Datenbank anlegen.
2. WHEN ein authentifizierter Benutzer die Session-Anzahl eines Songs abruft, THE Song_Service SHALL die Gesamtanzahl der Sessions des Benutzers für den Song zurückgeben.
3. THE Song_Service SHALL die Lernmethode als Enum-Wert speichern (EMOTIONAL, LUECKENTEXT, ZEILE_FUER_ZEILE, RUECKWAERTS, SPACED_REPETITION, QUIZ).

### Anforderung 8: Fortschritts-Verwaltung

**User Story:** Als Benutzer möchte ich meinen Lernfortschritt pro Strophe und pro Song sehen können, damit ich weiß, welche Teile ich noch üben muss.

#### Akzeptanzkriterien

1. WHEN ein authentifizierter Benutzer den Fortschritt einer Strophe aktualisiert, THE Song_Service SHALL den prozentualen Lernstand (0–100) für die Kombination Benutzer und Strophe in der Datenbank speichern.
2. WHEN ein authentifizierter Benutzer den Gesamtfortschritt eines Songs abruft, THE Song_Service SHALL den gewichteten Durchschnitt aller Strophen-Fortschritte des Benutzers für den Song berechnen und zurückgeben.
3. THE Song_Service SHALL den Fortschrittswert auf den Bereich 0 bis 100 begrenzen.
4. IF ein Benutzer versucht, den Fortschritt einer Strophe eines fremden Songs zu aktualisieren, THEN THE Song_Service SHALL die Anfrage mit HTTP-Statuscode 403 ablehnen.
5. WHEN ein authentifizierter Benutzer den Durchschnittsfortschritt über alle eigenen Songs abruft, THE Song_Service SHALL das arithmetische Mittel aller Song-Fortschritte berechnen und zurückgeben.

### Anforderung 9: API-Absicherung für Song-Routen

**User Story:** Als Systembetreiber möchte ich sicherstellen, dass alle Song-bezogenen API-Endpunkte nur authentifizierten Benutzern zugänglich sind und Benutzer nur auf eigene Daten zugreifen können.

#### Akzeptanzkriterien

1. WHEN eine Song-bezogene API_Route eine Anfrage ohne gültige Session erhält, THE API_Route SHALL die Anfrage mit HTTP-Statuscode 401 ablehnen.
2. THE Song_Service SHALL bei jeder Datenoperation prüfen, ob der authentifizierte Benutzer der Eigentümer der betroffenen Ressource ist.
3. IF ein Benutzer versucht, auf eine Ressource zuzugreifen, die einem anderen Benutzer gehört, THEN THE API_Route SHALL die Anfrage mit HTTP-Statuscode 403 ablehnen.
4. THE API_Route SHALL alle Eingabedaten validieren und bei ungültigen Daten HTTP-Statuscode 400 mit einer beschreibenden Fehlermeldung zurückgeben.

### Anforderung 10: Dashboard-Daten

**User Story:** Als Benutzer möchte ich auf dem Dashboard alle meine Sets und Songs mit aktuellem Lernfortschritt sehen, damit ich schnell entscheiden kann, welchen Song ich heute üben möchte.

#### Akzeptanzkriterien

1. WHEN ein authentifizierter Benutzer das Dashboard aufruft, THE Song_Service SHALL alle Sets des Benutzers mit den enthaltenen Songs, dem Fortschrittsbalken je Song und der Session-Anzahl je Song zurückgeben.
2. WHEN ein authentifizierter Benutzer das Dashboard aufruft, THE Song_Service SHALL den Durchschnittsfortschritt über alle Songs, die Gesamtanzahl aktiver Songs und die Gesamtanzahl aller Sessions berechnen und zurückgeben.
3. THE Song_Service SHALL die Dashboard-Daten bei bis zu 50 Songs innerhalb von 1 Sekunde zurückgeben.
4. THE Song_Service SHALL für jeden Song einen Status-Punkt zurückgeben: "neu" (0% Fortschritt), "aktiv" (1–99% Fortschritt) oder "gelernt" (100% Fortschritt).

### Anforderung 11: Responsive Song-Darstellung

**User Story:** Als Benutzer möchte ich Songs und Sets auf allen Geräten (Desktop, Tablet, Smartphone) komfortabel sehen und verwalten können, damit ich flexibel lernen kann.

#### Akzeptanzkriterien

1. THE Song_Detail SHALL auf Bildschirmbreiten von 320px bis 1440px korrekt dargestellt werden.
2. WHILE die Bildschirmbreite kleiner als 768px ist, THE Song_Detail SHALL ein einspaltiges Layout verwenden.
3. THE Song_Detail SHALL alle interaktiven Elemente mit einer Mindestgröße von 44x44 Pixeln für Touch-Eingaben darstellen.
4. THE Song_Detail SHALL einen Farbkontrast von mindestens 4.5:1 für normalen Text einhalten.
5. THE Song_Detail SHALL alle Formularfelder und interaktiven Elemente mit korrekten ARIA-Labels versehen.
6. THE Song_Detail SHALL alle interaktiven Elemente per Tastatur erreichbar machen.

### Anforderung 12: Markup-System (Datenmodell und Verwaltung)

**User Story:** Als Benutzer möchte ich Markups (Pausen, Wiederholungen, Gesangstechnik, Timecodes) an Strophen, Zeilen oder einzelnen Wörtern setzen können, damit ich den Songtext mit Aufführungshinweisen und Audio-Referenzen anreichern kann.

#### Akzeptanzkriterien

1. WHEN ein authentifizierter Benutzer ein Markup an einer Strophe, Zeile oder einem Wort erstellt, THE Song_Service SHALL das Markup mit dem korrekten Markup_Typ, Markup_Ziel und der zugehörigen Referenz in der Datenbank speichern.
2. THE Song_Service SHALL folgende Markup_Typen unterstützen: PAUSE, WIEDERHOLUNG, ATMUNG, KOPFSTIMME, BRUSTSTIMME, BELT, FALSETT und TIMECODE.
3. WHEN ein Markup vom Typ TIMECODE erstellt wird, THE Song_Service SHALL einen Timecode-Wert in Millisekunden speichern, der eine Position in einer Audio-Datei oder einem Streaming-Player referenziert.
4. WHEN ein Markup vom Typ WIEDERHOLUNG erstellt wird, THE Song_Service SHALL einen optionalen Freitext-Wert speichern, der die Anzahl oder Art der Wiederholung beschreibt.
5. WHEN ein authentifizierter Benutzer ein bestehendes Markup bearbeitet, THE Song_Service SHALL die geänderten Felder in der Datenbank aktualisieren.
6. WHEN ein authentifizierter Benutzer ein Markup löscht, THE Song_Service SHALL das Markup aus der Datenbank entfernen.
7. WHEN ein authentifizierter Benutzer die Markups eines Songs abruft, THE Song_Service SHALL alle Markups des Songs gruppiert nach Strophe und Zeile zurückgeben.
8. IF ein Benutzer versucht, ein Markup an einem Song eines anderen Benutzers zu erstellen oder zu bearbeiten, THEN THE Song_Service SHALL die Anfrage mit HTTP-Statuscode 403 ablehnen.
9. WHEN ein authentifizierter Benutzer die Song-Detailansicht aufruft, THE Song_Service SHALL die Markups zusammen mit den Strophen und Zeilen mitliefern, sodass sie im Text angezeigt werden können.
10. THE Song_Service SHALL bei einem Wort-Markup validieren, dass der Wort-Index innerhalb des gültigen Bereichs der Zeile liegt.
