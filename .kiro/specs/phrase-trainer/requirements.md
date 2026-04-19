# Anforderungsdokument: Phrasen-Trainer

## Einleitung

Der Phrasen-Trainer ist eine neue Lernmethode im Song Text Trainer, die es Nutzern ermöglicht, ausgewählte Strophen eines Songs einzusingen und die eigene Aufnahme direkt mit dem Instrumental und optional der Referenz-Vokalspur zu vergleichen. Im Gegensatz zum bestehenden Vocal Trainer, der den gesamten Song aufnimmt und eine Pitch-/Timing-Analyse durchführt, fokussiert der Phrasen-Trainer auf das gezielte Üben einzelner Abschnitte mit anschließendem Hörvergleich über eine Mehrkanal-Wiedergabe mit Lautstärke- und Stereo-Panning-Kontrolle.

## Glossar

- **Phrasen_Trainer**: Die Hauptkomponente, die den gesamten Workflow (Strophenauswahl, Aufnahme, Wiedergabe, Mischpult) steuert
- **Strophen_Auswahl**: Die UI-Komponente zur Auswahl der zu übenden Strophen
- **Aufnahme_Modul**: Das Modul, das die Mikrofonaufnahme synchron zum Instrumental durchführt
- **Wiedergabe_Mixer**: Die Komponente, die die Mehrkanal-Wiedergabe (Instrumental, Aufnahme, Referenz-Vokal) mit Lautstärke- und Panning-Kontrolle steuert
- **Instrumental_Spur**: Die AudioQuelle mit der Rolle INSTRUMENTAL eines Songs
- **Referenz_Vokalspur**: Die AudioQuelle mit der Rolle VOCAL eines Songs
- **Aufnahme_Spur**: Der vom Nutzer aufgenommene Audio-Buffer
- **Panning_Regler**: Ein Steuerelement, das die Stereo-Positionierung zweier Spuren (Aufnahme und Referenz-Vokal) im Stereobild kontrolliert
- **Übungsbereich**: Der zeitliche Abschnitt des Songs, der durch die ausgewählten Strophen definiert wird (Start-Timecode der ersten bis End-Timecode der letzten ausgewählten Strophe)
- **Zustand**: Der aktuelle Status des Phrasen-Trainers: AUSWAHL, BEREIT, AUFNAHME, WIEDERGABE

## Anforderungen

### Anforderung 1: Strophenauswahl

**User Story:** Als Nutzer möchte ich eine oder mehrere Strophen eines Songs zum Üben auswählen, damit ich gezielt an bestimmten Passagen arbeiten kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer den Phrasen_Trainer für einen Song öffnet, THE Strophen_Auswahl SHALL alle Strophen des Songs als auswählbare Elemente mit ihrem Namen anzeigen
2. THE Strophen_Auswahl SHALL es dem Nutzer ermöglichen, eine oder mehrere Strophen per Checkbox auszuwählen
3. WHEN der Nutzer mindestens eine Strophe ausgewählt hat, THE Strophen_Auswahl SHALL einen Button zum Starten der Übung aktivieren
4. WHILE keine Strophe ausgewählt ist, THE Strophen_Auswahl SHALL den Start-Button deaktivieren
5. IF eine ausgewählte Strophe keinen Timecode besitzt, THEN THE Strophen_Auswahl SHALL diese Strophe als nicht auswählbar kennzeichnen und einen Hinweis anzeigen, dass ein Timecode erforderlich ist
6. THE Strophen_Auswahl SHALL die ausgewählten Strophen zwischen Übungsdurchgängen beibehalten, solange der Nutzer den Phrasen_Trainer nicht verlässt

### Anforderung 2: Aufnahme mit Instrumental-Wiedergabe

**User Story:** Als Nutzer möchte ich meine Stimme aufnehmen, während das Instrumental im ausgewählten Bereich abgespielt wird, damit ich synchron zum Song üben kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer die Aufnahme startet, THE Aufnahme_Modul SHALL die Instrumental_Spur ab dem Timecode der ersten ausgewählten Strophe abspielen und gleichzeitig die Mikrofonaufnahme starten
2. WHEN die Instrumental_Spur den End-Timecode der letzten ausgewählten Strophe erreicht, THE Aufnahme_Modul SHALL die Aufnahme und die Instrumental-Wiedergabe automatisch stoppen
3. THE Aufnahme_Modul SHALL das Mikrofon in Mono mit 44.1 kHz und deaktivierter Echounterdrückung, Rauschunterdrückung und automatischer Verstärkungsregelung aufnehmen
4. THE Aufnahme_Modul SHALL die Systemlatenz messen und bei der Aufnahme kompensieren, damit die Aufnahme_Spur synchron zur Instrumental_Spur ist
5. IF der Nutzer die Aufnahme manuell stoppt, THEN THE Aufnahme_Modul SHALL die Aufnahme und die Instrumental-Wiedergabe sofort beenden und die bis dahin aufgenommenen Daten behalten
6. IF der Zugriff auf das Mikrofon verweigert wird, THEN THE Aufnahme_Modul SHALL eine verständliche Fehlermeldung anzeigen
7. IF kein Mikrofon gefunden wird, THEN THE Aufnahme_Modul SHALL eine verständliche Fehlermeldung anzeigen
8. WHILE die Aufnahme läuft, THE Aufnahme_Modul SHALL den Songtext der aktuellen Strophe synchron zum Timecode anzeigen (Karaoke-Ansicht)

### Anforderung 3: Kopfhörer-Bestätigung

**User Story:** Als Nutzer möchte ich vor der Aufnahme darauf hingewiesen werden, Kopfhörer zu verwenden, damit das Instrumental nicht in die Mikrofonaufnahme überspricht.

#### Akzeptanzkriterien

1. WHEN der Nutzer den Phrasen_Trainer zum ersten Mal in einer Session öffnet, THE Phrasen_Trainer SHALL einen Kopfhörer-Hinweis-Dialog anzeigen, bevor die Aufnahme möglich ist
2. WHEN der Nutzer den Kopfhörer-Hinweis bestätigt, THE Phrasen_Trainer SHALL den Dialog schließen und die Aufnahme-Funktionalität freischalten
3. THE Phrasen_Trainer SHALL die Kopfhörer-Bestätigung für die Dauer der Session speichern, sodass der Dialog nicht bei jedem Übungsdurchgang erneut erscheint

### Anforderung 4: Wiedergabe mit Mehrkanal-Mischung

**User Story:** Als Nutzer möchte ich nach der Aufnahme meine Aufnahme zusammen mit dem Instrumental und optional der Referenz-Vokalspur anhören, damit ich meinen Gesang direkt vergleichen kann.

#### Akzeptanzkriterien

1. WHEN die Aufnahme abgeschlossen ist, THE Wiedergabe_Mixer SHALL automatisch in den Wiedergabe-Zustand wechseln und die Aufnahme_Spur parallel zur Instrumental_Spur abspielen
2. THE Wiedergabe_Mixer SHALL die Wiedergabe auf den Übungsbereich beschränken (Start-Timecode der ersten bis End-Timecode der letzten ausgewählten Strophe)
3. THE Wiedergabe_Mixer SHALL einen Play/Pause-Button und einen Stopp-Button für die Wiedergabe bereitstellen
4. WHEN der Nutzer die Wiedergabe startet, THE Wiedergabe_Mixer SHALL alle aktiven Spuren synchron ab dem Anfang des Übungsbereichs abspielen
5. WHEN die Wiedergabe das Ende des Übungsbereichs erreicht, THE Wiedergabe_Mixer SHALL die Wiedergabe automatisch stoppen

### Anforderung 5: Optionale Referenz-Vokalspur

**User Story:** Als Nutzer möchte ich die Referenz-Vokalspur optional zur Wiedergabe hinzuschalten, damit ich meinen Gesang direkt mit dem Original vergleichen kann.

#### Akzeptanzkriterien

1. WHERE eine Referenz_Vokalspur für den Song vorhanden ist, THE Wiedergabe_Mixer SHALL einen Toggle-Schalter zum Aktivieren der Referenz_Vokalspur anzeigen
2. WHEN der Nutzer die Referenz_Vokalspur aktiviert, THE Wiedergabe_Mixer SHALL die Referenz_Vokalspur synchron zu Instrumental_Spur und Aufnahme_Spur abspielen
3. WHEN der Nutzer die Referenz_Vokalspur deaktiviert, THE Wiedergabe_Mixer SHALL die Referenz_Vokalspur stummschalten, ohne die anderen Spuren zu beeinflussen
4. IF keine Referenz_Vokalspur für den Song vorhanden ist, THEN THE Wiedergabe_Mixer SHALL den Toggle-Schalter für die Referenz_Vokalspur ausblenden

### Anforderung 6: Lautstärkeregelung

**User Story:** Als Nutzer möchte ich die Lautstärke von Instrumental, Aufnahme und Referenz-Vokal unabhängig voneinander einstellen, damit ich den Hörvergleich optimal anpassen kann.

#### Akzeptanzkriterien

1. THE Wiedergabe_Mixer SHALL für jede aktive Spur (Instrumental_Spur, Aufnahme_Spur, Referenz_Vokalspur) einen separaten Lautstärkeregler bereitstellen
2. THE Wiedergabe_Mixer SHALL den Lautstärkebereich jedes Reglers von 0% (stumm) bis 100% stufenlos einstellbar machen
3. WHEN der Nutzer einen Lautstärkeregler verändert, THE Wiedergabe_Mixer SHALL die Lautstärke der entsprechenden Spur in Echtzeit anpassen, ohne die Wiedergabe zu unterbrechen
4. THE Wiedergabe_Mixer SHALL die Lautstärke der Instrumental_Spur initial auf 100%, die Aufnahme_Spur auf 100% und die Referenz_Vokalspur auf 70% setzen

### Anforderung 7: Stereo-Panning

**User Story:** Als Nutzer möchte ich Aufnahme und Referenz-Vokalspur im Stereobild trennen können, damit ich beide Stimmen besser unterscheiden und vergleichen kann.

#### Akzeptanzkriterien

1. WHILE die Referenz_Vokalspur aktiviert ist, THE Wiedergabe_Mixer SHALL einen Panning_Regler anzeigen
2. THE Panning_Regler SHALL den Grad der Stereo-Trennung stufenlos von 0% (beide Spuren mittig/mono) bis 100% (Aufnahme_Spur vollständig links, Referenz_Vokalspur vollständig rechts) einstellbar machen
3. WHEN der Nutzer den Panning_Regler verändert, THE Wiedergabe_Mixer SHALL die Stereo-Positionierung der Aufnahme_Spur und der Referenz_Vokalspur in Echtzeit anpassen
4. THE Wiedergabe_Mixer SHALL den Panning_Regler initial auf 50% setzen (moderate Stereo-Trennung)
5. WHEN die Referenz_Vokalspur deaktiviert wird, THE Wiedergabe_Mixer SHALL den Panning_Regler ausblenden und die Aufnahme_Spur auf die Mittelposition (mono) zurücksetzen
6. THE Wiedergabe_Mixer SHALL die Instrumental_Spur immer in der Mittelposition (mono) belassen, unabhängig vom Panning_Regler

### Anforderung 8: Audiogerät-Auswahl

**User Story:** Als Nutzer möchte ich das Eingabegerät (Mikrofon) auswählen können, damit ich das bestmögliche Mikrofon für die Aufnahme verwenden kann.

#### Akzeptanzkriterien

1. WHEN mehr als ein Audio-Eingabegerät verfügbar ist, THE Phrasen_Trainer SHALL ein Dropdown zur Auswahl des Mikrofons anzeigen
2. THE Phrasen_Trainer SHALL das erste verfügbare Eingabegerät automatisch vorauswählen
3. WHILE die Aufnahme nicht läuft, THE Phrasen_Trainer SHALL die Änderung des Eingabegeräts ermöglichen
4. WHILE die Aufnahme läuft, THE Phrasen_Trainer SHALL die Änderung des Eingabegeräts unterbinden

### Anforderung 9: Mikrofon-Gain-Kontrolle

**User Story:** Als Nutzer möchte ich die Eingangslautstärke des Mikrofons anpassen können, damit ich die Aufnahmelautstärke an meine Umgebung und mein Mikrofon anpassen kann.

#### Akzeptanzkriterien

1. THE Phrasen_Trainer SHALL einen Gain-Regler für das Mikrofon bereitstellen
2. THE Phrasen_Trainer SHALL den Gain-Bereich von 0% bis 300% stufenlos einstellbar machen
3. WHEN der Nutzer den Gain-Regler verändert, THE Phrasen_Trainer SHALL den Gain-Wert in Echtzeit auf den Mikrofon-Eingang anwenden
4. THE Phrasen_Trainer SHALL den Gain-Wert initial auf 100% setzen

### Anforderung 10: VU-Meter

**User Story:** Als Nutzer möchte ich während der Aufnahme eine visuelle Pegelanzeige sehen, damit ich die Aufnahmelautstärke kontrollieren kann.

#### Akzeptanzkriterien

1. WHILE die Aufnahme läuft, THE Phrasen_Trainer SHALL ein VU-Meter anzeigen, das den aktuellen Eingangspegel des Mikrofons visualisiert
2. THE Phrasen_Trainer SHALL das VU-Meter in Echtzeit aktualisieren

### Anforderung 11: Zustandsübergänge

**User Story:** Als Nutzer möchte ich einen klaren Workflow von Strophenauswahl über Aufnahme bis zur Wiedergabe durchlaufen, damit die Bedienung intuitiv ist.

#### Akzeptanzkriterien

1. THE Phrasen_Trainer SHALL die folgenden Zustände unterstützen: AUSWAHL, BEREIT, AUFNAHME, WIEDERGABE
2. WHEN der Nutzer Strophen ausgewählt und den Start-Button gedrückt hat, THE Phrasen_Trainer SHALL vom Zustand AUSWAHL in den Zustand BEREIT wechseln
3. WHEN der Nutzer die Aufnahme startet, THE Phrasen_Trainer SHALL vom Zustand BEREIT in den Zustand AUFNAHME wechseln
4. WHEN die Aufnahme abgeschlossen ist (automatisch oder manuell), THE Phrasen_Trainer SHALL vom Zustand AUFNAHME in den Zustand WIEDERGABE wechseln
5. WHEN der Nutzer im Zustand WIEDERGABE eine neue Aufnahme startet, THE Phrasen_Trainer SHALL in den Zustand BEREIT wechseln und die vorherige Aufnahme verwerfen
6. WHEN der Nutzer im Zustand WIEDERGABE die Strophenauswahl ändern möchte, THE Phrasen_Trainer SHALL in den Zustand AUSWAHL wechseln
7. THE Phrasen_Trainer SHALL den aktuellen Zustand über eine aria-live-Region für Screenreader ankündigen

### Anforderung 12: End-Timecode-Berechnung für Strophen

**User Story:** Als Entwickler möchte ich den End-Timecode einer Strophe zuverlässig bestimmen können, damit die Aufnahme und Wiedergabe am richtigen Zeitpunkt enden.

#### Akzeptanzkriterien

1. THE Phrasen_Trainer SHALL den End-Timecode einer Strophe als den Start-Timecode der nächsten Strophe in der Song-Reihenfolge berechnen
2. IF die letzte ausgewählte Strophe die letzte Strophe des Songs ist, THEN THE Phrasen_Trainer SHALL das Ende der Instrumental_Spur als End-Timecode verwenden
3. THE Phrasen_Trainer SHALL bei der Berechnung des Übungsbereichs zusammenhängende und nicht-zusammenhängende Strophenauswahlen unterstützen, indem der Bereich vom Start-Timecode der ersten bis zum End-Timecode der letzten ausgewählten Strophe reicht
