# Anforderungsdokument: Gamification & Fortschritt

## Einleitung

Das Gamification- und Fortschrittssystem motiviert Nutzer durch ein Streak-System und ein transparentes Fortschrittsmodell zum regelmäßigen Lernen. Ein Tages-Streak zählt aufeinanderfolgende Trainingstage und wird als orange Pill in der Topbar angezeigt. Das Fortschrittsmodell berechnet den Lernstand pro Song als gewichteten Durchschnitt aller Strophen, zeigt einen Session-Zähler pro Song und aggregiert den Durchschnittsfortschritt über alle aktiven Songs im Dashboard. Farbige Status-Punkte (grau, orange, grün) kommunizieren den Lernstand visuell auf einen Blick.

## Glossar

- **System**: Die Song Text Trainer Webanwendung (Next.js App Router)
- **Nutzer**: Ein authentifizierter Benutzer der Anwendung
- **Song**: Ein Songtext mit Metadaten (Titel, Künstler, Sprache), der dem Nutzer gehört
- **Strophe**: Ein benannter Textabschnitt innerhalb eines Songs (z.B. Verse 1, Chorus, Bridge)
- **Session**: Eine abgeschlossene Lerneinheit an einem Song mit einer beliebigen Lernmethode
- **Streak**: Die Anzahl aufeinanderfolgender Kalendertage, an denen der Nutzer mindestens eine Session abgeschlossen hat
- **Streak_Anzeige**: Eine orange Pill-Komponente in der Topbar, die den aktuellen Streak-Wert mit Flammen-Icon anzeigt
- **Song_Fortschritt**: Der prozentuale Lernstand eines Songs, berechnet als gewichteter Durchschnitt der Strophen-Fortschritte
- **Strophe_Gelernt**: Eine Strophe gilt als gelernt (100%), wenn der Nutzer sie 3x korrekt in Spaced Repetition bewertet hat ODER 2x den Lückentext fehlerfrei abgeschlossen hat
- **Session_Zaehler**: Die Gesamtanzahl abgeschlossener Sessions pro Song
- **Status_Punkt**: Ein farbiger Indikator pro Song: grau (0% Fortschritt), orange (1–99% Fortschritt), grün (100% Fortschritt)
- **Durchschnitts_Fortschritt**: Das arithmetische Mittel der Song_Fortschritt-Werte über alle aktiven Songs eines Nutzers
- **Aktiver_Song**: Ein Song mit mindestens einer abgeschlossenen Session
- **Trainingstag**: Ein Kalendertag, an dem der Nutzer mindestens eine Session abgeschlossen hat
- **Dashboard_Metrikkarten**: Die drei Statistik-Karten im Dashboard-Bereich (Songs aktiv, Sessions gesamt, Ø Fortschritt)

## Anforderungen

### Anforderung 1: Streak-Datenmodell

**User Story:** Als Nutzer möchte ich, dass das System meinen Tages-Streak automatisch verwaltet, damit ich sehen kann, wie viele Tage in Folge ich trainiert habe.

#### Akzeptanzkriterien

1. THE System SHALL pro Nutzer genau einen Streak-Datensatz verwalten, der den aktuellen Streak-Wert und das Datum der letzten abgeschlossenen Session enthält.
2. WHEN ein Nutzer eine Session abschließt und das Datum der letzten Session der Vortag ist, THE System SHALL den Streak-Wert um 1 erhöhen und das Datum der letzten Session auf das heutige Datum setzen.
3. WHEN ein Nutzer eine Session abschließt und das Datum der letzten Session das heutige Datum ist, THE System SHALL den Streak-Wert unverändert lassen.
4. WHEN ein Nutzer eine Session abschließt und das Datum der letzten Session mehr als 1 Tag zurückliegt, THE System SHALL den Streak-Wert auf 1 setzen und das Datum der letzten Session auf das heutige Datum setzen.
5. WHEN ein Nutzer seine erste Session überhaupt abschließt und kein Streak-Datensatz existiert, THE System SHALL einen Streak-Datensatz mit dem Wert 1 und dem heutigen Datum erstellen.

### Anforderung 2: Streak-Anzeige in der Topbar

**User Story:** Als Nutzer möchte ich meinen aktuellen Streak in der Topbar sehen, damit ich motiviert bleibe, täglich zu trainieren.

#### Akzeptanzkriterien

1. WHILE der Streak-Wert des Nutzers größer als 0 ist, THE Streak_Anzeige SHALL eine orange Pill mit einem Flammen-Icon und dem Text „N Tage Streak" in der Topbar anzeigen, wobei N der aktuelle Streak-Wert ist.
2. WHILE der Streak-Wert des Nutzers 0 beträgt, THE Streak_Anzeige SHALL nicht sichtbar sein.
3. WHEN der Streak-Wert genau 1 beträgt, THE Streak_Anzeige SHALL den Text „1 Tag Streak" anzeigen.
4. THE Streak_Anzeige SHALL den aktuellen Streak-Wert beim Laden der Seite vom Server abrufen.
5. WHEN der Nutzer eine Session abschließt und der Streak-Wert sich ändert, THE Streak_Anzeige SHALL den neuen Wert ohne Seitenneuladen anzeigen.

### Anforderung 3: Streak-Berechnung als reine Funktion

**User Story:** Als Entwickler möchte ich, dass die Streak-Logik als testbare reine Funktion implementiert ist, damit die Berechnung zuverlässig und nachvollziehbar bleibt.

#### Akzeptanzkriterien

1. THE System SHALL die Streak-Berechnung als reine Funktion implementieren, die den aktuellen Streak-Wert, das Datum der letzten Session und das heutige Datum als Eingabe erhält und den neuen Streak-Wert sowie das neue Datum zurückgibt.
2. WHEN das heutige Datum und das Datum der letzten Session identisch sind, THE Streak-Funktion SHALL den Streak-Wert unverändert zurückgeben.
3. WHEN das heutige Datum genau 1 Tag nach dem Datum der letzten Session liegt, THE Streak-Funktion SHALL den Streak-Wert um 1 erhöht zurückgeben.
4. WHEN das heutige Datum mehr als 1 Tag nach dem Datum der letzten Session liegt, THE Streak-Funktion SHALL den Wert 1 zurückgeben.

### Anforderung 4: Strophen-Lernstatus

**User Story:** Als Nutzer möchte ich, dass das System erkennt, wann ich eine Strophe vollständig gelernt habe, damit mein Fortschritt korrekt berechnet wird.

#### Akzeptanzkriterien

1. WHEN ein Nutzer eine Strophe 3x korrekt in Spaced Repetition bewertet hat (Korrekt_Zähler >= 3 im Wiederholungs_Eintrag), THE System SHALL die Strophe als Strophe_Gelernt mit 100% Fortschritt markieren.
2. WHEN ein Nutzer eine Strophe 2x fehlerfrei im Lückentext abgeschlossen hat, THE System SHALL die Strophe als Strophe_Gelernt mit 100% Fortschritt markieren.
3. WHEN eine Strophe weder die Spaced-Repetition-Bedingung noch die Lückentext-Bedingung erfüllt, THE System SHALL den Strophen-Fortschritt anteilig basierend auf dem bisherigen Lernstand berechnen.
4. THE System SHALL den Fortschritt-Datensatz der Strophe nach jeder abgeschlossenen Session aktualisieren.

### Anforderung 5: Song-Fortschritt berechnen

**User Story:** Als Nutzer möchte ich den Gesamtfortschritt eines Songs sehen, damit ich weiß, wie weit ich beim Lernen des gesamten Textes bin.

#### Akzeptanzkriterien

1. THE System SHALL den Song_Fortschritt als gewichteten Durchschnitt aller Strophen-Fortschritte des Songs berechnen, wobei jede Strophe gleich gewichtet wird.
2. WHEN ein Song keine Strophen enthält, THE System SHALL den Song_Fortschritt als 0% zurückgeben.
3. WHEN alle Strophen eines Songs als Strophe_Gelernt markiert sind, THE System SHALL den Song_Fortschritt als 100% zurückgeben.
4. THE System SHALL den Song_Fortschritt als ganzzahligen Prozentwert zwischen 0 und 100 zurückgeben.
5. THE System SHALL die Song-Fortschrittsberechnung als reine Funktion implementieren, die eine Liste von Strophen-Fortschrittswerten als Eingabe erhält und den gewichteten Durchschnitt zurückgibt.

### Anforderung 6: Status-Punkte pro Song

**User Story:** Als Nutzer möchte ich auf einen Blick sehen, ob ein Song neu, in Bearbeitung oder fertig gelernt ist, damit ich meine Lernprioritäten setzen kann.

#### Akzeptanzkriterien

1. WHEN der Song_Fortschritt eines Songs 0% beträgt, THE System SHALL den Status_Punkt in grau anzeigen.
2. WHEN der Song_Fortschritt eines Songs zwischen 1% und 99% liegt, THE System SHALL den Status_Punkt in orange anzeigen.
3. WHEN der Song_Fortschritt eines Songs 100% beträgt, THE System SHALL den Status_Punkt in grün anzeigen.
4. THE System SHALL den Status_Punkt in der Song-Zeile auf dem Dashboard links neben dem Song-Titel anzeigen.
5. THE System SHALL die Status-Punkt-Farbzuordnung als reine Funktion implementieren, die einen Prozentwert als Eingabe erhält und die Farbe (grau, orange, grün) zurückgibt.

### Anforderung 7: Session-Zähler pro Song

**User Story:** Als Nutzer möchte ich sehen, wie viele Lernsessions ich pro Song absolviert habe, damit ich meinen Trainingsaufwand nachvollziehen kann.

#### Akzeptanzkriterien

1. WHEN ein Nutzer eine Session für einen Song abschließt, THE System SHALL den Session_Zaehler des Songs um 1 erhöhen.
2. THE System SHALL den Session_Zaehler pro Song in der Song-Zeile auf dem Dashboard rechts neben dem Fortschrittsbalken anzeigen.
3. THE System SHALL den Session_Zaehler als ganzzahligen Wert ab 0 verwalten.
4. THE System SHALL Sessions aller Lernmethoden (Lückentext, Zeile für Zeile, Rückwärts, Spaced Repetition, Quiz, Emotionales Lernen) gleichwertig zählen.

### Anforderung 8: Durchschnittsfortschritt im Dashboard

**User Story:** Als Nutzer möchte ich meinen durchschnittlichen Lernfortschritt über alle Songs sehen, damit ich meinen Gesamtlernstand einschätzen kann.

#### Akzeptanzkriterien

1. THE System SHALL den Durchschnitts_Fortschritt als arithmetisches Mittel der Song_Fortschritt-Werte aller aktiven Songs des Nutzers berechnen.
2. WHEN der Nutzer keine aktiven Songs hat, THE System SHALL den Durchschnitts_Fortschritt als 0% anzeigen.
3. THE System SHALL den Durchschnitts_Fortschritt als ganzzahligen Prozentwert in der Dashboard_Metrikkarten-Karte „Ø Fortschritt" anzeigen.
4. THE System SHALL den Durchschnitts_Fortschritt zusammen mit einem Fortschrittsbalken in der Metrikkarte darstellen.
5. THE System SHALL die Durchschnittsfortschritts-Berechnung als reine Funktion implementieren, die eine Liste von Song-Fortschrittswerten als Eingabe erhält und das arithmetische Mittel zurückgibt.

### Anforderung 9: Dashboard-Metrikkarten

**User Story:** Als Nutzer möchte ich die wichtigsten Kennzahlen meines Lernfortschritts auf einen Blick im Dashboard sehen, damit ich motiviert bleibe und meinen Fortschritt verfolgen kann.

#### Akzeptanzkriterien

1. THE System SHALL drei Metrikkarten im Dashboard anzeigen: „Songs aktiv", „Sessions gesamt" und „Ø Fortschritt".
2. THE Metrikkarte „Songs aktiv" SHALL die Anzahl der Songs anzeigen, die mindestens eine abgeschlossene Session haben.
3. THE Metrikkarte „Sessions gesamt" SHALL die Gesamtanzahl aller abgeschlossenen Sessions des Nutzers über alle Songs anzeigen.
4. THE Metrikkarte „Ø Fortschritt" SHALL den Durchschnitts_Fortschritt als Prozentwert mit einem Fortschrittsbalken anzeigen.
5. THE System SHALL die Metrikkarten in einem 3-Spalten-Raster auf Desktop und in einem 1-Spalten-Layout auf Mobile darstellen.

### Anforderung 10: Streak-Aktualisierung bei Session-Abschluss

**User Story:** Als Nutzer möchte ich, dass mein Streak automatisch aktualisiert wird, wenn ich eine Lernsession abschließe, damit ich meinen Fortschritt nicht manuell verfolgen muss.

#### Akzeptanzkriterien

1. WHEN ein Nutzer eine Session abschließt (unabhängig von der Lernmethode), THE System SHALL die Streak-Berechnung ausführen und den Streak-Datensatz des Nutzers aktualisieren.
2. WHEN die Streak-Aktualisierung den Streak-Wert ändert, THE System SHALL den neuen Streak-Wert in der API-Antwort der Session-Abschluss-Route zurückgeben.
3. IF ein Fehler bei der Streak-Aktualisierung auftritt, THEN THE System SHALL den Fehler protokollieren und den Session-Abschluss trotzdem erfolgreich abschließen.
4. THE System SHALL die Streak-Aktualisierung innerhalb derselben Datenbanktransaktion wie den Session-Abschluss durchführen.

### Anforderung 11: Streak-API-Endpunkt

**User Story:** Als Nutzer möchte ich meinen aktuellen Streak-Wert über eine API abrufen können, damit die Topbar den Streak beim Seitenaufruf anzeigen kann.

#### Akzeptanzkriterien

1. THE System SHALL einen GET-Endpunkt bereitstellen, der den aktuellen Streak-Wert des authentifizierten Nutzers zurückgibt.
2. WHEN der Nutzer keinen Streak-Datensatz hat, THE System SHALL den Wert 0 zurückgeben.
3. WHEN das Datum der letzten Session mehr als 1 Tag zurückliegt, THE System SHALL den Wert 0 zurückgeben (Streak verfallen).
4. THE System SHALL den Endpunkt mit Authentifizierung schützen und nur den Streak des angemeldeten Nutzers zurückgeben.
