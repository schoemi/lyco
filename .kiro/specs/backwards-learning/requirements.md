# Anforderungsdokument: Rückwärts lernen – Lernmethode

## Einleitung

Die Lernmethode „Rückwärts lernen" präsentiert die Strophen eines Songs in umgekehrter Reihenfolge (letzte Strophe zuerst). Dies bekämpft den Primacy-Effekt: Beim herkömmlichen Lernen kennen Nutzer den Anfang auswendig, brechen aber in der Mitte ab. Das Rückwärtslernen sorgt für gleichmäßige Sicherheit über den gesamten Song. Die Lerninteraktion innerhalb jeder Strophe ist identisch zur bestehenden „Zeile für Zeile"-Methode (kumulative Zeilen-Eingabe, Textvergleich, Fehlversuche, Fortschritts-Dots). Nur die Strophen-Reihenfolge und die Fortschrittsanzeige unterscheiden sich.

## Glossar

- **System**: Die Song Text Trainer Webanwendung (Next.js App Router)
- **Nutzer**: Ein authentifizierter Benutzer der Anwendung
- **Strophe**: Ein benannter Textabschnitt eines Songs (z.B. Verse 1, Chorus, Bridge), bestehend aus mehreren Zeilen
- **Zeile**: Eine einzelne Textzeile innerhalb einer Strophe
- **Aktive_Zeile**: Die Zeile, die der Nutzer aktuell aus dem Gedächtnis eingeben soll
- **Kumulative_Ansicht**: Darstellung aller bereits gelernten Zeilen über der aktiven Zeile innerhalb einer Strophe
- **Fortschritts_Dots**: Horizontale Punktreihe, die den Lernstand innerhalb einer Strophe visualisiert
- **Fehlversuch**: Eine vom Nutzer abgesendete Eingabe, die nicht mit dem Originaltext der Aktiven_Zeile übereinstimmt
- **Eingabefeld**: Textarea-Komponente, in die der Nutzer den Text der Aktiven_Zeile aus dem Gedächtnis eingibt
- **Weiter_Button**: Primärer Button zum Fortschreiten zur nächsten Zeile
- **Strophen_Navigation**: Pfeile links/rechts zum Wechsel zwischen Strophen in umgekehrter Reihenfolge
- **Session**: Eine abgeschlossene Lerneinheit, die über die Sessions-API mit der Lernmethode `RUECKWAERTS` getrackt wird
- **Fortschritt**: Prozentualer Lernstand je Strophe, gespeichert über die Fortschritts-API
- **Strophen_Auswahl_Dialog**: Modaler Dialog, über den der Nutzer vor oder während der Übung auswählen kann, welche Strophen geübt werden sollen
- **Umgekehrte_Reihenfolge**: Strophen werden absteigend nach `orderIndex` sortiert, sodass die letzte Strophe des Songs als erste Übung erscheint
- **Erklärungs_Tooltip**: Einmalige Erklärung beim ersten Start der Methode, die den Nutzer über den Sinn des Rückwärtslernens informiert
- **Primacy_Effekt**: Kognitiver Bias, bei dem zuerst gelernte Inhalte besser erinnert werden als spätere

## Anforderungen

### Anforderung 1: Session starten und Song-Daten in umgekehrter Strophen-Reihenfolge laden

**User Story:** Als Nutzer möchte ich die Lernmethode „Rückwärts lernen" für einen Song starten, damit ich den Songtext von der letzten Strophe an üben und den Primacy-Effekt bekämpfen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer die Route `/songs/[id]/rueckwaerts` aufruft, THE System SHALL die Song-Daten (Titel, Strophen, Zeilen) über die bestehende Songs-API laden.
2. WHEN die Song-Daten erfolgreich geladen wurden, THE System SHALL die Strophen in umgekehrter Reihenfolge (absteigend nach `orderIndex`) sortieren, sodass die letzte Strophe des Songs als erste Übung erscheint.
3. WHEN die Song-Daten erfolgreich geladen wurden, THE System SHALL eine Session mit der Lernmethode `RUECKWAERTS` über `POST /api/sessions` erstellen.
4. WHEN der Nutzer nicht authentifiziert ist, THE System SHALL den Nutzer zur Login-Seite weiterleiten.
5. IF der Song nicht gefunden wird oder der Nutzer keinen Zugriff hat, THEN THE System SHALL den Nutzer zum Dashboard weiterleiten.
6. THE System SHALL eine Navigationsleiste mit Zurück-Button, Song-Titel und dem Label „Rückwärts lernen" anzeigen.
7. IF der Song keine Strophen enthält, THEN THE System SHALL eine Hinweismeldung „Dieser Song hat noch keine Strophen" anzeigen.

### Anforderung 2: Fortschrittsanzeige mit Richtungshinweis

**User Story:** Als Nutzer möchte ich in der Fortschrittsanzeige erkennen, dass ich den Song in umgekehrter Reihenfolge lerne, damit ich die Richtung der Übung nachvollziehen kann.

#### Akzeptanzkriterien

1. THE System SHALL die Strophen-Position als Label im Format „Strophe N von M — von hinten" anzeigen.
2. THE System SHALL neben dem Strophen-Label ein Richtungspfeil-Icon (nach links zeigend) anzeigen, das die umgekehrte Reihenfolge visuell kommuniziert.
3. WHEN der Nutzer zwischen Strophen navigiert, THE System SHALL das Label mit der aktuellen Position in der umgekehrten Reihenfolge aktualisieren.

### Anforderung 3: Erklärungs-Tooltip beim ersten Start

**User Story:** Als Nutzer möchte ich beim ersten Start der Methode eine kurze Erklärung erhalten, warum das Rückwärtslernen sinnvoll ist, damit ich die Methode verstehe und motiviert bin.

#### Akzeptanzkriterien

1. WHEN der Nutzer die Methode „Rückwärts lernen" zum ersten Mal startet, THE System SHALL einen Erklärungs_Tooltip mit dem Titel „Warum von hinten?" und einer kurzen Erklärung des Primacy-Effekts anzeigen.
2. THE Erklärungs_Tooltip SHALL einen Schließen-Button enthalten, über den der Nutzer den Tooltip schließen kann.
3. WHEN der Nutzer den Erklärungs_Tooltip schließt, THE System SHALL den Tooltip-Status im `localStorage` des Browsers persistieren, sodass der Tooltip bei zukünftigen Starts nicht erneut angezeigt wird.
4. WHILE der Tooltip-Status im `localStorage` als „gesehen" gespeichert ist, THE System SHALL den Erklärungs_Tooltip beim Start der Methode nicht anzeigen.
5. THE Erklärungs_Tooltip SHALL per Escape-Taste oder Klick auf den Schließen-Button geschlossen werden können.

### Anforderung 4: Lerninteraktion innerhalb einer Strophe (identisch zu Zeile für Zeile)

**User Story:** Als Nutzer möchte ich innerhalb jeder Strophe die gleiche kumulative Zeile-für-Zeile-Lerninteraktion nutzen, damit ich den Text sequenziell und aufbauend üben kann.

#### Akzeptanzkriterien

1. THE System SHALL zu jedem Zeitpunkt genau eine Zeile als Aktive_Zeile kennzeichnen.
2. THE System SHALL die Aktive_Zeile in Großdarstellung (18px, primäre Textfarbe) mit einem lila linken Rand-Akzent anzeigen.
3. THE System SHALL alle bereits gelernten Zeilen in kleinerer Darstellung (14px, sekundäre Textfarbe) über der Aktiven_Zeile in der Kumulative_Ansicht anzeigen.
4. WHEN der Nutzer die Lernmethode startet, THE System SHALL die erste Zeile der ersten Strophe in umgekehrter Reihenfolge (d.h. die erste Zeile der letzten Song-Strophe) als Aktive_Zeile setzen.
5. WHILE die erste Zeile einer Strophe aktiv ist, THE System SHALL keine Kumulative_Ansicht anzeigen, da noch keine Zeilen gelernt wurden.
6. THE System SHALL ein Eingabefeld (Textarea) unterhalb der Aktiven_Zeile anzeigen, in das der Nutzer den Text der Aktiven_Zeile aus dem Gedächtnis eingibt.
7. WHEN der Nutzer die Eingabe absendet, THE System SHALL die Eingabe mit dem Originaltext der Aktiven_Zeile vergleichen, wobei Groß-/Kleinschreibung und führende/abschließende Leerzeichen ignoriert werden.
8. WHEN die Eingabe korrekt ist, THE System SHALL visuelles Feedback (grüne Hervorhebung) anzeigen und den Weiter_Button aktivieren.
9. WHEN die Eingabe falsch ist, THE System SHALL visuelles Feedback (rote Hervorhebung) anzeigen und den Fehlversuch-Zähler für die Aktive_Zeile um 1 erhöhen.
10. WHEN der Nutzer 3 Fehlversuche für eine Aktive_Zeile erreicht hat, THE System SHALL den korrekten Text der Zeile als Lösung anzeigen und den Weiter_Button aktivieren.
11. THE System SHALL das Eingabefeld nach jedem Absenden leeren, sofern die Eingabe falsch war und weniger als 3 Fehlversuche vorliegen.

### Anforderung 5: Fortschreiten zur nächsten Zeile

**User Story:** Als Nutzer möchte ich nach korrekter Eingabe oder nach Anzeige der Lösung zur nächsten Zeile wechseln, damit ich den gesamten Text sequenziell durcharbeiten kann.

#### Akzeptanzkriterien

1. THE System SHALL einen Weiter_Button mit dem Label „Weiter" anzeigen.
2. WHILE die Eingabe weder korrekt ist noch 3 Fehlversuche vorliegen, THE System SHALL den Weiter_Button deaktiviert darstellen.
3. WHEN der Nutzer den Weiter_Button betätigt, THE System SHALL die nächste Zeile der aktuellen Strophe als neue Aktive_Zeile setzen.
4. WHEN der Nutzer den Weiter_Button betätigt, THE System SHALL die soeben gelernte Zeile in die Kumulative_Ansicht aufnehmen.
5. WHEN der Nutzer den Weiter_Button betätigt, THE System SHALL das Eingabefeld leeren und den Fehlversuch-Zähler auf 0 zurücksetzen.
6. WHEN die letzte Zeile einer Strophe abgeschlossen wird, THE System SHALL eine Erfolgsmeldung für den Strophen-Abschluss anzeigen.

### Anforderung 6: Fortschritts-Dots

**User Story:** Als Nutzer möchte ich meinen Fortschritt innerhalb der aktuellen Strophe visuell sehen, damit ich weiß, wie viele Zeilen ich noch vor mir habe.

#### Akzeptanzkriterien

1. THE System SHALL eine horizontale Punktreihe (Fortschritts_Dots) oberhalb des Lernbereichs anzeigen, mit einem Punkt pro Zeile der aktuellen Strophe.
2. THE System SHALL die Aktive_Zeile als gefüllten lila Punkt darstellen.
3. THE System SHALL bereits abgeschlossene Zeilen als gefüllte grüne Punkte darstellen.
4. THE System SHALL noch ausstehende Zeilen als graue Kreise (ungefüllt) darstellen.
5. WHEN der Nutzer zur nächsten Zeile fortschreitet, THE System SHALL die Fortschritts_Dots aktualisieren, sodass der bisherige lila Punkt grün wird und der nächste graue Kreis lila wird.

### Anforderung 7: Strophen-Navigation in umgekehrter Reihenfolge

**User Story:** Als Nutzer möchte ich zwischen Strophen in umgekehrter Reihenfolge navigieren können, damit ich gezielt bestimmte Abschnitte des Songs üben kann.

#### Akzeptanzkriterien

1. THE System SHALL Navigationspfeile (links/rechts) zum Wechsel zwischen Strophen in umgekehrter Reihenfolge anzeigen.
2. WHEN der Nutzer den rechten Pfeil betätigt, THE System SHALL zur nächsten Strophe in der umgekehrten Reihenfolge wechseln und deren erste Zeile als Aktive_Zeile setzen.
3. WHEN der Nutzer den linken Pfeil betätigt, THE System SHALL zur vorherigen Strophe in der umgekehrten Reihenfolge wechseln und deren erste Zeile als Aktive_Zeile setzen.
4. WHILE die erste Strophe in der umgekehrten Reihenfolge aktiv ist (d.h. die letzte Song-Strophe), THE System SHALL den linken Navigationspfeil deaktiviert darstellen.
5. WHILE die letzte Strophe in der umgekehrten Reihenfolge aktiv ist (d.h. die erste Song-Strophe), THE System SHALL den rechten Navigationspfeil deaktiviert darstellen.
6. WHEN der Nutzer die Strophe wechselt, THE System SHALL den Lernzustand (Kumulative_Ansicht, Aktive_Zeile, Fehlversuche) der neuen Strophe laden oder auf den Anfangszustand setzen.

### Anforderung 8: Fortschritts-Tracking

**User Story:** Als Nutzer möchte ich, dass mein Lernfortschritt pro Strophe gespeichert wird, damit ich meinen Gesamtfortschritt verfolgen kann.

#### Akzeptanzkriterien

1. WHEN alle Zeilen einer Strophe abgeschlossen sind, THE System SHALL den Fortschritt der Strophe auf 100% setzen und über `PUT /api/progress` mit der entsprechenden `stropheId` persistieren.
2. WHEN der Nutzer eine Strophe teilweise durcharbeitet, THE System SHALL den Fortschritt proportional berechnen (Anzahl abgeschlossener Zeilen / Gesamtanzahl Zeilen × 100) und über `PUT /api/progress` persistieren.
3. WHEN alle Strophen eines Songs abgeschlossen sind, THE System SHALL eine abschließende Session über `POST /api/sessions` mit der Lernmethode `RUECKWAERTS` erstellen.

### Anforderung 9: Strophen-Auswahl

**User Story:** Als Nutzer möchte ich vor oder während der Übung auswählen können, welche Strophen ich üben möchte, damit ich gezielt bestimmte Abschnitte des Songs trainieren kann.

#### Akzeptanzkriterien

1. THE System SHALL einen Button mit dem Label „Strophen auswählen" anzeigen, der den Strophen_Auswahl_Dialog öffnet.
2. WHEN der Nutzer die Lernmethode startet, THE System SHALL alle Strophen des Songs als ausgewählt vorbelegen.
3. THE Strophen_Auswahl_Dialog SHALL für jede Strophe eine Checkbox anzeigen, über die der Nutzer die Strophe ein- oder abwählen kann.
4. THE Strophen_Auswahl_Dialog SHALL die Strophen in der Original-Reihenfolge des Songs anzeigen (aufsteigend nach `orderIndex`), damit der Nutzer die Strophen im Song-Kontext erkennt.
5. IF der Nutzer die Auswahl bestätigt und keine Strophe ausgewählt ist, THEN THE Strophen_Auswahl_Dialog SHALL eine Fehlermeldung „Mindestens eine Strophe muss ausgewählt sein" anzeigen und die Bestätigung verhindern.
6. WHEN der Nutzer die Strophen-Auswahl bestätigt, THE System SHALL ausschließlich die ausgewählten Strophen in umgekehrter Reihenfolge für die Übung verwenden.
7. WHEN der Nutzer die Strophen-Auswahl ändert, THE System SHALL den Lernzustand (Aktive_Zeile, Kumulative_Ansicht, Fehlversuche) zurücksetzen und die Übung mit der ersten Zeile der letzten ausgewählten Strophe neu beginnen.
8. WHEN der Nutzer die Strophen-Auswahl ändert, THE Strophen_Navigation SHALL ausschließlich zwischen den ausgewählten Strophen in umgekehrter Reihenfolge navigieren.
9. WHILE nur eine Strophe ausgewählt ist, THE Strophen_Navigation SHALL beide Navigationspfeile deaktiviert darstellen.
10. THE Strophen_Auswahl_Dialog SHALL per Escape-Taste oder Abbrechen-Button geschlossen werden können, ohne die aktuelle Auswahl zu verändern.

### Anforderung 10: Barrierefreiheit

**User Story:** Als Nutzer mit Einschränkungen möchte ich die Lernmethode „Rückwärts lernen" mit assistiven Technologien bedienen können, damit ich gleichberechtigt am Lernen teilnehmen kann.

#### Akzeptanzkriterien

1. THE System SHALL alle interaktiven Elemente (Eingabefeld, Weiter_Button, Strophen_Navigation, Erklärungs_Tooltip) mit aussagekräftigen `aria-label`-Attributen versehen.
2. THE System SHALL Fortschritts_Dots mit einem `role="progressbar"` und `aria-valuenow`/`aria-valuemax`-Attributen versehen.
3. THE System SHALL Feedback-Meldungen (korrekt, falsch, Lösung angezeigt) über eine `aria-live="polite"` Region ankündigen.
4. THE System SHALL alle interaktiven Elemente mit einer Mindestgröße von 44×44px für Touch-Ziele darstellen.
5. THE System SHALL die vollständige Bedienung per Tastatur ermöglichen (Tab-Navigation, Enter zum Absenden, Escape zum Schließen des Tooltips).
6. THE Erklärungs_Tooltip SHALL mit `role="dialog"` und `aria-labelledby` für den Titel versehen sein.
