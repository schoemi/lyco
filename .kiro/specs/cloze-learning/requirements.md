# Requirements Document

## Einleitung

Dieses Dokument beschreibt die Anforderungen für die Lernmethode „Lückentext" (Cloze/Fill-in-the-Blank) im Song Text Trainer. Der Nutzer ergänzt fehlende Wörter im Songtext. Der Schwierigkeitsgrad bestimmt, wie viele Wörter ausgeblendet sind. Sofortiges Feedback färbt das Eingabefeld grün (richtig) oder rot (falsch). Der Fortschrittsbalken und die Score-Anzeige aktualisieren sich in Echtzeit.

## Glossar

- **Cloze_Page**: Die Next.js-Seite unter `/songs/[id]/cloze`, die den Lückentext-Lernmodus für einen Song darstellt
- **Gap_Generator**: Der Algorithmus, der basierend auf dem Schwierigkeitsgrad bestimmt, welche Wörter in einer Zeile als Lücken dargestellt werden
- **Gap_Input**: Ein Inline-Texteingabefeld, das ein ausgeblendetes Wort im Songtext repräsentiert
- **Difficulty_Selector**: Die UI-Komponente mit vier gleichbreiten Buttons zur Auswahl der Schwierigkeitsstufe (Leicht, Mittel, Schwer, Blind)
- **Score_Pill**: Eine grüne Pill-Anzeige, die den aktuellen Stand korrekt beantworteter Lücken im Format „N / M richtig" zeigt
- **Progress_Bar**: Ein 4px hoher grüner Balken, der den Gesamtfortschritt des Songs in Prozent anzeigt
- **Check_All_Button**: Ein primärer lila Button in voller Breite, der alle noch offenen Gap_Inputs gleichzeitig prüft
- **Hint_Button**: Ein Button pro Gap_Input, der den ersten Buchstaben des Zielworts + '···' anzeigt (maximal einmal pro Lücke nutzbar)
- **Stanza_Block**: Ein weißer Block mit dünner Umrandung, der eine Strophe (Strophe) des Songs mit ihren Zeilen und Lücken darstellt
- **Song**: Ein Songtext mit Metadaten, bestehend aus Strophen (Strophe), Zeilen (Zeile) und zugehörigen Daten
- **Schwierigkeitsstufe**: Eine von vier Stufen (Leicht/20%, Mittel/40%, Schwer/60%, Blind/100%), die den Anteil ausgeblendeter Wörter bestimmt

## Anforderungen

### Requirement 1: Lückentext-Seite laden und Song-Daten anzeigen

**User Story:** Als Nutzer möchte ich den Lückentext-Modus für einen Song öffnen, damit ich den Songtext mit Lücken zum Ausfüllen sehe.

#### Acceptance Criteria

1. WHEN der Nutzer die Route `/songs/[id]/cloze` aufruft, THE Cloze_Page SHALL die Strophen und Zeilen des Songs aus der Datenbank laden und als Stanza_Blocks darstellen
2. WHEN die Cloze_Page geladen wird, THE Cloze_Page SHALL eine Navigationsleiste mit Zurück-Button, Song-Titel und dem Label „Lückentext" anzeigen
3. WHEN die Cloze_Page geladen wird, THE Cloze_Page SHALL die Schwierigkeitsstufe „Leicht" als Standardwert vorauswählen
4. WHEN die Cloze_Page geladen wird, THE Progress_Bar SHALL den aktuellen Fortschritt des Songs in Prozent anzeigen
5. WHEN die Cloze_Page geladen wird, THE Score_Pill SHALL den Anfangswert „0 / M richtig" anzeigen, wobei M die Gesamtanzahl der Lücken ist
6. IF der Nutzer nicht authentifiziert ist, THEN THE Cloze_Page SHALL den Nutzer zur Login-Seite weiterleiten
7. IF der Song nicht existiert oder dem Nutzer nicht gehört, THEN THE Cloze_Page SHALL eine 404-Fehlerseite anzeigen

### Requirement 2: Lücken generieren basierend auf Schwierigkeitsstufe

**User Story:** Als Nutzer möchte ich die Anzahl der Lücken über die Schwierigkeitsstufe steuern, damit ich den Lückentext meinem Könnensniveau anpassen kann.

#### Acceptance Criteria

1. WHEN die Schwierigkeitsstufe „Leicht" aktiv ist, THE Gap_Generator SHALL circa 20% der Wörter als Lücken auswählen, wobei Schlüsselwörter (Substantive, Verben, Adjektive) bevorzugt werden
2. WHEN die Schwierigkeitsstufe „Mittel" aktiv ist, THE Gap_Generator SHALL circa 40% der Wörter als Lücken auswählen
3. WHEN die Schwierigkeitsstufe „Schwer" aktiv ist, THE Gap_Generator SHALL circa 60% der Wörter als Lücken auswählen, wobei nur Füllwörter (Artikel, Präpositionen, Konjunktionen) sichtbar bleiben
4. WHEN die Schwierigkeitsstufe „Blind" aktiv ist, THE Gap_Generator SHALL 100% der Wörter als Lücken auswählen, wobei nur die Zeilenstruktur sichtbar bleibt
5. THE Gap_Generator SHALL für jede Zeile deterministisch die gleichen Lücken erzeugen, solange die Schwierigkeitsstufe und der Zeileninhalt unverändert bleiben
6. WHEN eine Zeile weniger als 2 Wörter enthält, THE Gap_Generator SHALL mindestens 1 Wort sichtbar lassen (außer bei Schwierigkeitsstufe „Blind")

### Requirement 3: Schwierigkeitsstufe wechseln

**User Story:** Als Nutzer möchte ich jederzeit die Schwierigkeitsstufe wechseln können, damit ich flexibel zwischen leichteren und schwereren Übungen wechseln kann.

#### Acceptance Criteria

1. THE Difficulty_Selector SHALL vier gleichbreite Buttons anzeigen: „Leicht", „Mittel", „Schwer", „Blind"
2. THE Difficulty_Selector SHALL die aktive Schwierigkeitsstufe mit lila Hintergrundfarbe hervorheben
3. WHEN der Nutzer eine andere Schwierigkeitsstufe auswählt, THE Cloze_Page SHALL alle bisherigen Eingaben und Feedback-Zustände zurücksetzen
4. WHEN der Nutzer eine andere Schwierigkeitsstufe auswählt, THE Gap_Generator SHALL die Lücken basierend auf der neuen Stufe neu berechnen
5. WHEN der Nutzer eine andere Schwierigkeitsstufe auswählt, THE Score_Pill SHALL auf „0 / M richtig" zurückgesetzt werden, wobei M die neue Gesamtanzahl der Lücken ist

### Requirement 4: Lücken ausfüllen mit Echtzeit-Feedback

**User Story:** Als Nutzer möchte ich fehlende Wörter eingeben und sofort sehen, ob ich richtig liege, damit ich beim Lernen direktes Feedback erhalte.

#### Acceptance Criteria

1. THE Gap_Input SHALL als Inline-Texteingabe mit lila Unterstrich (border-bottom), ohne Rahmen, mit einer Mindestbreite von 60px und dem Placeholder '···' dargestellt werden
2. THE Gap_Input SHALL in der Breite mit der Eingabe des Nutzers mitwachsen
3. WHEN der Nutzer ein Gap_Input verlässt (blur-Event), THE Cloze_Page SHALL die Eingabe mit dem Zielwort vergleichen (Groß-/Kleinschreibung wird ignoriert)
4. WHEN die Eingabe mit dem Zielwort übereinstimmt, THE Gap_Input SHALL einen grünen Unterstrich und grüne Textfarbe anzeigen
5. WHEN die Eingabe nicht mit dem Zielwort übereinstimmt, THE Gap_Input SHALL einen roten Unterstrich und rote Textfarbe anzeigen
6. WHEN eine Eingabe als korrekt bewertet wurde, THE Gap_Input SHALL als nicht-editierbar (readonly) gesetzt werden
7. WHEN eine Eingabe als falsch bewertet wurde, THE Gap_Input SHALL editierbar bleiben, damit der Nutzer einen erneuten Versuch machen kann

### Requirement 5: Score und Fortschritt aktualisieren

**User Story:** Als Nutzer möchte ich meinen Fortschritt in Echtzeit sehen, damit ich motiviert bleibe und weiß, wie viel ich schon geschafft habe.

#### Acceptance Criteria

1. WHEN eine Eingabe als korrekt bewertet wird, THE Score_Pill SHALL den Zähler der korrekten Antworten um 1 erhöhen und die Anzeige „N / M richtig" aktualisieren
2. WHEN eine Eingabe als korrekt bewertet wird, THE Progress_Bar SHALL den Fortschrittswert basierend auf dem Verhältnis korrekter Antworten zur Gesamtanzahl der Lücken aktualisieren
3. WHEN alle Lücken korrekt ausgefüllt sind, THE Cloze_Page SHALL den Fortschritt (100%) über die Progress-API (`PUT /api/progress`) für die betroffenen Strophen persistieren
4. WHEN alle Lücken korrekt ausgefüllt sind, THE Cloze_Page SHALL eine neue Session mit Lernmethode `LUECKENTEXT` über die Sessions-API (`POST /api/sessions`) erstellen

### Requirement 6: Alle Lücken gleichzeitig prüfen

**User Story:** Als Nutzer möchte ich alle offenen Lücken auf einmal prüfen können, damit ich nicht jedes Feld einzeln verlassen muss.

#### Acceptance Criteria

1. THE Check_All_Button SHALL als primärer lila Button in voller Breite am unteren Rand der Seite dargestellt werden
2. WHEN der Nutzer den Check_All_Button betätigt, THE Cloze_Page SHALL alle noch offenen (nicht als korrekt markierten) Gap_Inputs validieren und das entsprechende Feedback (grün/rot) anzeigen
3. WHEN der Check_All_Button betätigt wird und keine offenen Gap_Inputs vorhanden sind, THE Check_All_Button SHALL deaktiviert (disabled) dargestellt werden

### Requirement 7: Hinweis anzeigen

**User Story:** Als Nutzer möchte ich einen Hinweis für eine schwierige Lücke erhalten können, damit ich nicht komplett feststecke.

#### Acceptance Criteria

1. THE Hint_Button SHALL für jedes noch offene Gap_Input verfügbar sein
2. WHEN der Nutzer den Hint_Button für ein Gap_Input betätigt, THE Hint_Button SHALL den ersten Buchstaben des Zielworts gefolgt von '···' im Gap_Input als Placeholder anzeigen
3. WHEN ein Hinweis für ein Gap_Input bereits angezeigt wurde, THE Hint_Button SHALL für dieses Gap_Input deaktiviert (disabled) werden
4. THE Hint_Button SHALL maximal 1 Hinweis pro Gap_Input zulassen

### Requirement 8: Strophen-Darstellung

**User Story:** Als Nutzer möchte ich den Songtext übersichtlich nach Strophen gegliedert sehen, damit ich mich im Text orientieren kann.

#### Acceptance Criteria

1. THE Stanza_Block SHALL pro Strophe einen weißen Block mit dünner Umrandung darstellen
2. THE Stanza_Block SHALL den Strophen-Namen oben links in 11px Schriftgröße und Großbuchstaben (uppercase) anzeigen
3. THE Stanza_Block SHALL die Zeilen der Strophe in der korrekten Reihenfolge (orderIndex) darstellen, wobei sichtbare Wörter als Text und ausgeblendete Wörter als Gap_Inputs inline dargestellt werden
4. WHEN eine Strophe keine Zeilen enthält, THE Stanza_Block SHALL die Strophe mit dem Label und einem leeren Inhaltsbereich darstellen

### Requirement 9: Barrierefreiheit

**User Story:** Als Nutzer mit Einschränkungen möchte ich den Lückentext-Modus mit assistiven Technologien bedienen können, damit ich gleichberechtigt am Lernen teilnehmen kann.

#### Acceptance Criteria

1. THE Gap_Input SHALL ein `aria-label` Attribut mit dem Format „Lücke N von M in [Strophen-Name]" besitzen
2. WHEN ein Gap_Input als korrekt bewertet wird, THE Gap_Input SHALL das Attribut `aria-live="polite"` nutzen, um den Status „Richtig" an Screenreader zu kommunizieren
3. WHEN ein Gap_Input als falsch bewertet wird, THE Gap_Input SHALL das Attribut `aria-live="polite"` nutzen, um den Status „Falsch" an Screenreader zu kommunizieren
4. THE Difficulty_Selector SHALL als `role="radiogroup"` mit `aria-label="Schwierigkeitsstufe"` implementiert werden
5. THE Check_All_Button SHALL per Tastatur (Enter/Space) bedienbar sein
6. THE Cloze_Page SHALL per Tastatur vollständig navigierbar sein (Tab-Reihenfolge folgt der Lesereihenfolge des Textes)

### Requirement 10: Responsive Darstellung

**User Story:** Als Nutzer möchte ich den Lückentext-Modus auf Desktop, Tablet und Smartphone nutzen können, damit ich überall lernen kann.

#### Acceptance Criteria

1. WHILE die Viewport-Breite unter 640px liegt, THE Cloze_Page SHALL die Stanza_Blocks in einer einspaltigen Ansicht mit reduziertem Padding darstellen
2. WHILE die Viewport-Breite unter 640px liegt, THE Difficulty_Selector SHALL die vier Buttons in einem 2×2-Raster anordnen
3. THE Gap_Input SHALL auf Touch-Geräten eine Mindest-Tippfläche von 44×44px besitzen
