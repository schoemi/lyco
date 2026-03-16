# Anforderungsdokument: Hinweis-Modi für Zeile-für-Zeile-Lernmethoden

## Einleitung

Die Lernmethoden „Zeile für Zeile" und „Rückwärts lernen" verlangen aktuell, dass der Nutzer jede Zeile komplett aus dem Gedächtnis eingibt (ohne Hinweise). Dieses Feature führt drei zusätzliche Schwierigkeitsstufen ein, die dem Nutzer unterschiedlich starke Hinweise anzeigen, um den Einstieg zu erleichtern. Der bestehende Modus ohne Hinweise wird als „Schwer" (Standard) beibehalten. Die neuen Modi gelten für beide Lernmethoden gleichermaßen, da sie dieselbe Lerninteraktion und dieselben geteilten Komponenten (`EingabeBereich`, `AktiveZeile`, `validateLine`) nutzen.

## Glossar

- **System**: Die Song Text Trainer Webanwendung (Next.js App Router)
- **Nutzer**: Ein authentifizierter Benutzer der Anwendung
- **Zeile**: Eine einzelne Textzeile innerhalb einer Strophe
- **Aktive_Zeile**: Die Zeile, die der Nutzer aktuell aus dem Gedächtnis eingeben soll
- **Eingabefeld**: Textarea-Komponente, in die der Nutzer den Text der Aktiven_Zeile eingibt
- **Hinweis**: Ein sichtbarer Textausschnitt der Aktiven_Zeile, der dem Nutzer als Gedächtnisstütze angezeigt wird
- **Schwierigkeitsstufe**: Eine von vier Stufen, die bestimmt, wie viel Hinweis der Nutzer beim Eingeben einer Zeile erhält
- **Sehr_Leicht**: Schwierigkeitsstufe, bei der das erste und das letzte Wort der Zeile als Hinweis angezeigt werden
- **Leichter**: Schwierigkeitsstufe, bei der das erste Wort der Zeile als Hinweis angezeigt wird
- **Mittel**: Schwierigkeitsstufe, bei der der erste Buchstabe des ersten Wortes der Zeile als Hinweis angezeigt wird
- **Schwer**: Schwierigkeitsstufe ohne Hinweise (bestehender Standard-Modus)
- **Hinweis_Anzeige**: UI-Element, das den Hinweis oberhalb oder innerhalb des Eingabefelds darstellt
- **Schwierigkeits_Auswahl**: UI-Element zur Auswahl der Schwierigkeitsstufe
- **Wort**: Eine durch Leerzeichen getrennte Zeichenkette innerhalb einer Zeile
- **EingabeBereich**: Geteilte React-Komponente (`src/components/zeile-fuer-zeile/eingabe-bereich.tsx`), die das Eingabefeld und Feedback verwaltet
- **AktiveZeile**: Geteilte React-Komponente (`src/components/zeile-fuer-zeile/aktive-zeile.tsx`), die die aktuelle Zeile darstellt
- **ZeileFuerZeile_Seite**: Die Lernseite unter `/songs/[id]/zeile-fuer-zeile`
- **Rueckwaerts_Seite**: Die Lernseite unter `/songs/[id]/rueckwaerts`

## Anforderungen

### Anforderung 1: Schwierigkeitsstufen definieren

**User Story:** Als Nutzer möchte ich zwischen verschiedenen Schwierigkeitsstufen wählen können, damit ich den Schwierigkeitsgrad an mein aktuelles Können anpassen kann.

#### Akzeptanzkriterien

1. THE System SHALL vier Schwierigkeitsstufen bereitstellen: Sehr_Leicht, Leichter, Mittel und Schwer.
2. THE System SHALL die Schwierigkeitsstufe Schwer als Standard-Auswahl vorbelegen.
3. WHEN die Schwierigkeitsstufe Sehr_Leicht aktiv ist, THE Hinweis_Anzeige SHALL das erste und das letzte Wort der Aktiven_Zeile als Hinweis anzeigen.
4. WHEN die Schwierigkeitsstufe Leichter aktiv ist, THE Hinweis_Anzeige SHALL das erste Wort der Aktiven_Zeile als Hinweis anzeigen.
5. WHEN die Schwierigkeitsstufe Mittel aktiv ist, THE Hinweis_Anzeige SHALL den ersten Buchstaben des ersten Wortes der Aktiven_Zeile als Hinweis anzeigen.
6. WHEN die Schwierigkeitsstufe Schwer aktiv ist, THE System SHALL keinen Hinweis anzeigen.

### Anforderung 2: Hinweis-Berechnung

**User Story:** Als Nutzer möchte ich korrekte und konsistente Hinweise erhalten, damit ich mich auf die Gedächtnisstütze verlassen kann.

#### Akzeptanzkriterien

1. THE System SHALL ein Wort als eine durch Leerzeichen getrennte, nicht-leere Zeichenkette definieren.
2. WHEN eine Zeile nur ein Wort enthält, THE Hinweis_Anzeige SHALL im Modus Sehr_Leicht dieses eine Wort als Hinweis anzeigen (erstes und letztes Wort sind identisch).
3. WHEN eine Zeile nur ein Wort enthält, THE Hinweis_Anzeige SHALL im Modus Leichter dieses eine Wort als Hinweis anzeigen.
4. WHEN eine Zeile nur ein Wort enthält, THE Hinweis_Anzeige SHALL im Modus Mittel den ersten Buchstaben dieses Wortes als Hinweis anzeigen.
5. IF eine Zeile leer ist oder nur aus Leerzeichen besteht, THEN THE System SHALL keinen Hinweis anzeigen, unabhängig von der gewählten Schwierigkeitsstufe.
6. THE System SHALL bei der Hinweis-Berechnung führende und abschließende Leerzeichen der Zeile ignorieren.
7. WHEN der Modus Sehr_Leicht aktiv ist, THE Hinweis_Anzeige SHALL den Hinweis im Format „{erstesWort} … {letztesWort}" darstellen.
8. WHEN der Modus Mittel aktiv ist, THE Hinweis_Anzeige SHALL den Hinweis im Format „{ersterBuchstabe}…" darstellen.

### Anforderung 3: Schwierigkeits-Auswahl in der Benutzeroberfläche

**User Story:** Als Nutzer möchte ich die Schwierigkeitsstufe einfach und schnell wechseln können, damit ich den Modus während der Übung anpassen kann.

#### Akzeptanzkriterien

1. THE System SHALL eine Schwierigkeits_Auswahl oberhalb des Eingabefelds auf der ZeileFuerZeile_Seite anzeigen.
2. THE System SHALL eine Schwierigkeits_Auswahl oberhalb des Eingabefelds auf der Rueckwaerts_Seite anzeigen.
3. THE Schwierigkeits_Auswahl SHALL die vier Stufen als auswählbare Segmente (Segment-Control) darstellen, wobei die aktive Stufe visuell hervorgehoben ist.
4. THE Schwierigkeits_Auswahl SHALL die Stufen in der Reihenfolge Sehr_Leicht, Leichter, Mittel, Schwer von links nach rechts anordnen.
5. WHEN der Nutzer eine andere Schwierigkeitsstufe auswählt, THE System SHALL den Hinweis für die Aktive_Zeile sofort aktualisieren.
6. WHEN der Nutzer eine andere Schwierigkeitsstufe auswählt, THE System SHALL die aktuelle Eingabe im Eingabefeld beibehalten.
7. WHEN der Nutzer eine andere Schwierigkeitsstufe auswählt, THE System SHALL den Fehlversuch-Zähler der Aktiven_Zeile beibehalten.

### Anforderung 4: Hinweis-Anzeige in der Benutzeroberfläche

**User Story:** Als Nutzer möchte ich den Hinweis klar und deutlich sehen, damit ich die Gedächtnisstütze beim Eingeben nutzen kann.

#### Akzeptanzkriterien

1. WHILE eine Schwierigkeitsstufe mit Hinweis aktiv ist (Sehr_Leicht, Leichter oder Mittel), THE Hinweis_Anzeige SHALL den Hinweis als stilisierten Text oberhalb des Eingabefelds darstellen.
2. THE Hinweis_Anzeige SHALL den Hinweis in einer visuell abgesetzten Darstellung (z.B. kursiv, gedämpfte Farbe) anzeigen, um den Hinweis vom regulären Zeilentext zu unterscheiden.
3. WHILE die Schwierigkeitsstufe Schwer aktiv ist, THE System SHALL die Hinweis_Anzeige ausblenden.
4. WHEN der Nutzer zur nächsten Zeile fortschreitet, THE System SHALL den Hinweis für die neue Aktive_Zeile berechnen und anzeigen.
5. WHEN die Lösung einer Zeile angezeigt wird (nach 3 Fehlversuchen), THE System SHALL die Hinweis_Anzeige ausblenden, da der vollständige Text bereits sichtbar ist.

### Anforderung 5: Konsistenz zwischen beiden Lernmethoden

**User Story:** Als Nutzer möchte ich die Schwierigkeitsstufen auf beiden Lernseiten identisch vorfinden, damit ich ein einheitliches Lernerlebnis habe.

#### Akzeptanzkriterien

1. THE ZeileFuerZeile_Seite SHALL dieselbe Schwierigkeits_Auswahl und Hinweis_Anzeige verwenden wie die Rueckwaerts_Seite.
2. THE System SHALL die Hinweis-Berechnung als geteilte Utility-Funktion implementieren, die von beiden Seiten genutzt wird.
3. THE System SHALL die Schwierigkeits_Auswahl als geteilte Komponente implementieren, die von beiden Seiten genutzt wird.
4. THE System SHALL die gewählte Schwierigkeitsstufe pro Seite unabhängig verwalten (ein Wechsel auf der ZeileFuerZeile_Seite beeinflusst die Rueckwaerts_Seite nicht).

### Anforderung 6: Persistierung der Schwierigkeitsstufe

**User Story:** Als Nutzer möchte ich, dass meine gewählte Schwierigkeitsstufe beim erneuten Öffnen der Seite erhalten bleibt, damit ich nicht jedes Mal neu auswählen muss.

#### Akzeptanzkriterien

1. WHEN der Nutzer eine Schwierigkeitsstufe auf der ZeileFuerZeile_Seite auswählt, THE System SHALL die Auswahl im `localStorage` des Browsers unter einem seitenspezifischen Schlüssel persistieren.
2. WHEN der Nutzer eine Schwierigkeitsstufe auf der Rueckwaerts_Seite auswählt, THE System SHALL die Auswahl im `localStorage` des Browsers unter einem seitenspezifischen Schlüssel persistieren.
3. WHEN der Nutzer die ZeileFuerZeile_Seite erneut öffnet, THE System SHALL die zuletzt gewählte Schwierigkeitsstufe aus dem `localStorage` laden und vorbelegen.
4. WHEN der Nutzer die Rueckwaerts_Seite erneut öffnet, THE System SHALL die zuletzt gewählte Schwierigkeitsstufe aus dem `localStorage` laden und vorbelegen.
5. IF kein gespeicherter Wert im `localStorage` vorhanden ist, THEN THE System SHALL die Schwierigkeitsstufe Schwer als Standard verwenden.

### Anforderung 7: Barrierefreiheit der Hinweis-Modi

**User Story:** Als Nutzer mit Einschränkungen möchte ich die Schwierigkeitsauswahl und Hinweise mit assistiven Technologien bedienen können, damit ich gleichberechtigt am Lernen teilnehmen kann.

#### Akzeptanzkriterien

1. THE Schwierigkeits_Auswahl SHALL mit `role="radiogroup"` und einem aussagekräftigen `aria-label` (z.B. „Schwierigkeitsstufe auswählen") versehen sein.
2. THE System SHALL jede Stufe in der Schwierigkeits_Auswahl als `role="radio"` mit `aria-checked` kennzeichnen.
3. THE Hinweis_Anzeige SHALL mit `aria-live="polite"` versehen sein, damit Änderungen des Hinweises von Screenreadern angekündigt werden.
4. THE Hinweis_Anzeige SHALL ein `aria-label` enthalten, das den Hinweis-Kontext beschreibt (z.B. „Hinweis: {hinweisText}").
5. THE System SHALL die Schwierigkeits_Auswahl per Tastatur bedienbar machen (Pfeiltasten zum Wechseln zwischen Stufen).
6. THE System SHALL alle interaktiven Elemente der Schwierigkeits_Auswahl mit einer Mindestgröße von 44×44px für Touch-Ziele darstellen.
