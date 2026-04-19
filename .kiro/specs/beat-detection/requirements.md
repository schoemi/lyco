# Anforderungsdokument: Takt-Erkennung (Beat Detection)

## Einleitung

Die Takt-Erkennung erweitert den Song Text Trainer um die Fähigkeit, das Tempo (BPM) eines Songs zu ermitteln und Beat-Positionen zu berechnen. Der Nutzer kann entweder die BPM automatisch aus der Instrumental-Spur erkennen lassen oder manuell eingeben. Bei automatischer Erkennung stehen Frequenzbereich-Controls zur Verfügung, um die Analyse auf den relevanten Frequenzbereich (z.B. Bassdrum) einzuschränken. Bei manueller Eingabe wird geprüft, ob der eingegebene BPM-Wert mit den detektierbaren Beats im Audio übereinstimmt. Die erkannten Beat-Positionen können in Zukunft für Metronom-Funktionen, rhythmische Lernhilfen und synchronisierte Textanzeige genutzt werden.

## Glossar

- **Beat_Detektor**: Das clientseitige Modul (Web Worker), das die Frequenzanalyse der Audio-Daten durchführt und Beat-Positionen erkennt
- **BPM**: Beats Per Minute – die Anzahl der Schläge pro Minute, die das Tempo eines Songs beschreibt
- **BPM_Eingabe**: Die UI-Komponente zur manuellen Eingabe eines BPM-Werts
- **BPM_Validierung**: Das Modul, das einen manuell eingegebenen BPM-Wert gegen die detektierten Beats prüft
- **Frequenzbereich_Regler**: Die UI-Komponente mit zwei Slidern (Untergrenze und Obergrenze) zur Definition des Frequenzbereichs für die Beat-Erkennung
- **Beat_Ergebnis**: Das Datenobjekt, das den erkannten BPM-Wert, die Konfidenz und die Liste der Beat-Positionen (in Millisekunden) enthält
- **Instrumental_Spur**: Die AudioQuelle mit der Rolle INSTRUMENTAL eines Songs
- **Konfidenz**: Ein Prozentwert (0–100%), der angibt, wie sicher die automatische BPM-Erkennung ist
- **Beat_Anzeige**: Die UI-Komponente, die das Ergebnis der Beat-Erkennung (BPM, Konfidenz, Beat-Positionen) visualisiert
- **Song_Detail_Seite**: Die bestehende Detailansicht eines Songs, auf der der Audio-Player und die Strophen angezeigt werden
- **Beat_Einstellungen**: Der UI-Bereich auf der Song_Detail_Seite, in dem der Nutzer zwischen automatischer und manueller BPM-Ermittlung wählt

## Anforderungen

### Anforderung 1: BPM-Modus-Auswahl

**User Story:** Als Nutzer möchte ich zwischen automatischer BPM-Erkennung und manueller BPM-Eingabe wählen können, damit ich die für meinen Song passende Methode nutzen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer die Beat_Einstellungen eines Songs öffnet, THE Beat_Einstellungen SHALL zwei Modi als auswählbare Optionen anzeigen: „Automatisch erkennen" und „Manuell eingeben"
2. THE Beat_Einstellungen SHALL den Modus „Automatisch erkennen" als Standard vorauswählen, wenn eine Instrumental_Spur vorhanden ist
3. THE Beat_Einstellungen SHALL den Modus „Manuell eingeben" als Standard vorauswählen, wenn keine Instrumental_Spur vorhanden ist
4. WHILE keine Instrumental_Spur für den Song vorhanden ist, THE Beat_Einstellungen SHALL den Modus „Automatisch erkennen" deaktivieren und einen Hinweis anzeigen, dass eine Instrumental-Spur erforderlich ist
5. WHEN der Nutzer den Modus wechselt, THE Beat_Einstellungen SHALL die zugehörigen Controls (Frequenzbereich_Regler oder BPM_Eingabe) anzeigen und die Controls des anderen Modus ausblenden

### Anforderung 2: Automatische BPM-Erkennung

**User Story:** Als Nutzer möchte ich die BPM automatisch aus der Instrumental-Spur erkennen lassen, damit ich das Tempo nicht manuell ermitteln muss.

#### Akzeptanzkriterien

1. WHEN der Nutzer die automatische Erkennung startet, THE Beat_Detektor SHALL die Instrumental_Spur im definierten Frequenzbereich analysieren und ein Beat_Ergebnis mit BPM-Wert, Konfidenz und Beat-Positionen berechnen
2. THE Beat_Detektor SHALL die Analyse in einem Web Worker ausführen, damit die Benutzeroberfläche während der Berechnung nicht blockiert wird
3. WHILE die Analyse läuft, THE Beat_Anzeige SHALL einen Fortschrittsindikator anzeigen
4. WHEN die Analyse abgeschlossen ist, THE Beat_Anzeige SHALL den erkannten BPM-Wert und die Konfidenz anzeigen
5. IF die Konfidenz unter 50% liegt, THEN THE Beat_Anzeige SHALL eine Warnung anzeigen, dass das Ergebnis unsicher ist, und dem Nutzer empfehlen, den Frequenzbereich anzupassen oder den BPM-Wert manuell einzugeben
6. THE Beat_Detektor SHALL BPM-Werte im Bereich von 40 bis 240 erkennen können
7. IF die Instrumental_Spur nicht geladen werden kann, THEN THE Beat_Detektor SHALL eine verständliche Fehlermeldung anzeigen

### Anforderung 3: Frequenzbereich-Steuerung

**User Story:** Als Nutzer möchte ich den Frequenzbereich für die Beat-Erkennung definieren können, damit ich die Analyse auf den relevanten Bereich (z.B. Bassdrum) einschränken und die Erkennungsqualität verbessern kann.

#### Akzeptanzkriterien

1. WHILE der Modus „Automatisch erkennen" aktiv ist, THE Frequenzbereich_Regler SHALL zwei Slider anzeigen: einen für die Untergrenze und einen für die Obergrenze des Frequenzbereichs in Hertz
2. THE Frequenzbereich_Regler SHALL den einstellbaren Bereich auf 20 Hz bis 20.000 Hz begrenzen
3. THE Frequenzbereich_Regler SHALL die Untergrenze initial auf 60 Hz und die Obergrenze initial auf 200 Hz setzen (typischer Bassdrum-Bereich)
4. IF der Nutzer die Untergrenze über die Obergrenze schiebt, THEN THE Frequenzbereich_Regler SHALL die Obergrenze automatisch auf den Wert der Untergrenze plus 10 Hz setzen
5. IF der Nutzer die Obergrenze unter die Untergrenze schiebt, THEN THE Frequenzbereich_Regler SHALL die Untergrenze automatisch auf den Wert der Obergrenze minus 10 Hz setzen
6. THE Frequenzbereich_Regler SHALL die aktuellen Werte in Hz neben den Slidern numerisch anzeigen
7. WHEN der Nutzer den Frequenzbereich ändert und die Erkennung erneut startet, THE Beat_Detektor SHALL die Analyse mit dem neuen Frequenzbereich durchführen

### Anforderung 4: Manuelle BPM-Eingabe

**User Story:** Als Nutzer möchte ich den BPM-Wert manuell eingeben können, damit ich das Tempo auch ohne automatische Erkennung festlegen kann.

#### Akzeptanzkriterien

1. WHILE der Modus „Manuell eingeben" aktiv ist, THE BPM_Eingabe SHALL ein numerisches Eingabefeld für den BPM-Wert anzeigen
2. THE BPM_Eingabe SHALL nur ganzzahlige Werte im Bereich von 20 bis 300 akzeptieren
3. IF der Nutzer einen Wert außerhalb des gültigen Bereichs eingibt, THEN THE BPM_Eingabe SHALL eine Fehlermeldung anzeigen und den Wert nicht übernehmen
4. IF der Nutzer einen nicht-numerischen Wert eingibt, THEN THE BPM_Eingabe SHALL die Eingabe ablehnen
5. WHEN der Nutzer einen gültigen BPM-Wert eingibt und bestätigt, THE BPM_Eingabe SHALL den Wert als aktuellen BPM-Wert des Songs übernehmen

### Anforderung 5: BPM-Validierung bei manueller Eingabe

**User Story:** Als Nutzer möchte ich bei manueller BPM-Eingabe prüfen lassen, ob mein Wert mit den detektierbaren Beats übereinstimmt, damit ich sicher sein kann, dass das Tempo korrekt ist.

#### Akzeptanzkriterien

1. WHEN der Nutzer einen manuellen BPM-Wert bestätigt und eine Instrumental_Spur vorhanden ist, THE BPM_Validierung SHALL die Instrumental_Spur analysieren und die detektierten Beats mit dem eingegebenen BPM-Wert vergleichen
2. WHEN die Abweichung zwischen eingegebenem BPM-Wert und detektiertem BPM-Wert kleiner als 5% ist, THE BPM_Validierung SHALL eine Bestätigung anzeigen, dass der Wert mit den erkannten Beats übereinstimmt
3. WHEN die Abweichung zwischen eingegebenem BPM-Wert und detektiertem BPM-Wert 5% oder mehr beträgt, THE BPM_Validierung SHALL eine Warnung anzeigen, die den detektierten BPM-Wert als Alternative vorschlägt
4. WHEN der Nutzer die Warnung sieht, THE BPM_Validierung SHALL dem Nutzer die Möglichkeit geben, den detektierten Wert zu übernehmen oder den manuell eingegebenen Wert beizubehalten
5. IF keine Instrumental_Spur vorhanden ist, THEN THE BPM_Validierung SHALL die Validierung überspringen und den manuellen Wert ohne Prüfung übernehmen

### Anforderung 6: Beat-Ergebnis persistieren

**User Story:** Als Nutzer möchte ich, dass der ermittelte BPM-Wert und die Beat-Positionen gespeichert werden, damit ich die Erkennung nicht bei jedem Öffnen des Songs wiederholen muss.

#### Akzeptanzkriterien

1. WHEN ein BPM-Wert (automatisch oder manuell) bestätigt wird, THE System SHALL den BPM-Wert, die Erkennungsmethode (automatisch/manuell) und die Beat-Positionen in der Datenbank zum Song speichern
2. WHEN der Nutzer die Beat_Einstellungen eines Songs öffnet und bereits ein gespeichertes Beat_Ergebnis existiert, THE Beat_Einstellungen SHALL den gespeicherten BPM-Wert und die Erkennungsmethode anzeigen
3. WHEN der Nutzer eine neue Erkennung durchführt oder einen neuen manuellen Wert eingibt, THE System SHALL das bestehende Beat_Ergebnis überschreiben
4. THE API SHALL einen GET-Endpunkt unter /api/songs/[id]/beat-ergebnis bereitstellen, der das gespeicherte Beat_Ergebnis zurückgibt
5. THE API SHALL einen PUT-Endpunkt unter /api/songs/[id]/beat-ergebnis bereitstellen, der ein Beat_Ergebnis erstellt oder aktualisiert
6. WHEN ein nicht-authentifizierter Request an die Beat-Ergebnis-API gesendet wird, THE API SHALL mit Status 401 antworten
7. WHEN ein Nutzer auf das Beat_Ergebnis eines fremden Songs zugreift, THE API SHALL mit Status 403 antworten

### Anforderung 7: Datenmodell-Erweiterung

**User Story:** Als Entwickler möchte ich das Datenmodell um ein Beat-Ergebnis-Modell erweitern, damit BPM-Werte und Beat-Positionen persistent gespeichert werden können.

#### Akzeptanzkriterien

1. THE Prisma-Schema SHALL ein neues Modell `BeatErgebnis` mit den Feldern `id`, `songId`, `bpm` (Int), `methode` (Enum: AUTOMATISCH, MANUELL), `konfidenz` (Int, nullable), `beatPositionenMs` (Int-Array), `frequenzUntergrenze` (Int, nullable), `frequenzObergrenze` (Int, nullable), `createdAt` und `updatedAt` enthalten
2. THE BeatErgebnis SHALL eine 1:1-Beziehung zum Song-Modell haben (ein Song hat maximal ein BeatErgebnis)
3. THE Prisma-Schema SHALL ein neues Enum `BeatMethode` mit den Werten `AUTOMATISCH` und `MANUELL` enthalten
4. THE TypeScript-Typen SHALL ein Interface `BeatErgebnisResponse` mit den Feldern `id`, `songId`, `bpm`, `methode`, `konfidenz`, `beatPositionenMs`, `frequenzUntergrenze` und `frequenzObergrenze` bereitstellen

### Anforderung 8: Beat-Visualisierung

**User Story:** Als Nutzer möchte ich die erkannten Beats visuell sehen, damit ich das Ergebnis der Erkennung nachvollziehen und überprüfen kann.

#### Akzeptanzkriterien

1. WHEN ein Beat_Ergebnis vorhanden ist, THE Beat_Anzeige SHALL den BPM-Wert prominent anzeigen
2. WHEN ein Beat_Ergebnis mit Methode AUTOMATISCH vorhanden ist, THE Beat_Anzeige SHALL die Konfidenz als Prozentwert anzeigen
3. WHEN ein Beat_Ergebnis vorhanden ist und der Audio-Player aktiv ist, THE Beat_Anzeige SHALL die Beat-Positionen als visuelle Marker auf dem Fortschrittsbalken des Audio-Players darstellen
4. WHEN der Audio-Player einen Beat-Zeitpunkt erreicht, THE Beat_Anzeige SHALL den aktuellen Beat visuell hervorheben (z.B. kurzes Aufleuchten)
5. THE Beat_Anzeige SHALL die Erkennungsmethode (automatisch/manuell) als Label anzeigen

### Anforderung 9: Voraussetzung Instrumental-Spur

**User Story:** Als Nutzer möchte ich klar erkennen, ob eine Instrumental-Spur für die automatische Beat-Erkennung verfügbar ist, damit ich weiß, welche Optionen mir zur Verfügung stehen.

#### Akzeptanzkriterien

1. WHEN der Nutzer die Beat_Einstellungen öffnet und eine AudioQuelle mit Rolle INSTRUMENTAL vorhanden ist, THE Beat_Einstellungen SHALL diese als Quelle für die automatische Erkennung verwenden
2. WHEN der Nutzer die Beat_Einstellungen öffnet und keine AudioQuelle mit Rolle INSTRUMENTAL vorhanden ist, THE Beat_Einstellungen SHALL einen Hinweis anzeigen, dass für die automatische Erkennung eine Instrumental-Spur unter den Audio-Quellen hinzugefügt werden muss
3. WHEN der Nutzer die Beat_Einstellungen öffnet und mehrere AudioQuellen mit Rolle INSTRUMENTAL vorhanden sind, THE Beat_Einstellungen SHALL die erste Instrumental-Quelle (nach orderIndex) verwenden

### Anforderung 10: Erneute Erkennung

**User Story:** Als Nutzer möchte ich die Beat-Erkennung erneut durchführen können, damit ich nach Anpassung des Frequenzbereichs oder bei einem neuen Instrumental ein aktualisiertes Ergebnis erhalte.

#### Akzeptanzkriterien

1. WHEN bereits ein Beat_Ergebnis vorhanden ist, THE Beat_Einstellungen SHALL einen Button „Erneut erkennen" anzeigen
2. WHEN der Nutzer „Erneut erkennen" klickt, THE Beat_Detektor SHALL die Analyse mit den aktuellen Frequenzbereich-Einstellungen erneut durchführen
3. WHEN die erneute Analyse abgeschlossen ist, THE System SHALL das bestehende Beat_Ergebnis mit dem neuen Ergebnis überschreiben
4. WHILE die erneute Analyse läuft, THE Beat_Einstellungen SHALL den „Erneut erkennen"-Button deaktivieren und einen Fortschrittsindikator anzeigen
