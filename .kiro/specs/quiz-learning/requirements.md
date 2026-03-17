# Requirements Document

## Einleitung

Dieses Dokument beschreibt die Anforderungen für die Lernmethode „Quiz" im Song Text Trainer. Quiz-Interaktionen testen das Wissen des Nutzers auf spielerische Weise. Drei Quiz-Typen stehen zur Verfügung: Multiple Choice, Reihenfolge (Drag & Drop) und Diktat. Jeder Typ adressiert eine andere kognitive Ebene des Textlernens. Richtige Antworten fließen anteilig in den Song-Fortschrittsbalken ein und eine Score-Anzeige am Ende jeder Session gibt eine Empfehlung für das weitere Vorgehen.

## Glossar

- **Quiz_Page**: Die Next.js-Seite unter `/songs/[id]/quiz`, die den Quiz-Lernmodus für einen Song darstellt
- **Quiz_Typ_Auswahl**: Die Kachel-Auswahl-Komponente, die beim Start des Quiz-Modus die drei Quiz-Typen (Multiple Choice, Reihenfolge, Diktat) mit Kurzbeschreibung anzeigt
- **Multiple_Choice_Card**: Eine Frage-Karte mit einer Frage oben (14px) und vier Antwort-Buttons darunter, von denen genau einer korrekt ist
- **Reihenfolge_Card**: Eine Karte, die die Zeilen einer Strophe als verschiebbare Elemente (Drag & Drop) darstellt, die in die richtige Reihenfolge gebracht werden müssen
- **Diktat_Card**: Eine Karte mit einer Textarea und einem Abgabe-Button, in der der Nutzer eine Zeile aus dem Gedächtnis aufschreibt
- **Score_Screen**: Der Abschluss-Screen am Ende einer Quiz-Session, der die Punktzahl (N / M korrekt) und eine Empfehlung anzeigt
- **Quiz_Generator**: Der Algorithmus, der aus den Strophen und Zeilen eines Songs Quiz-Fragen für den gewählten Quiz-Typ generiert
- **Progress_Bar**: Ein 4px hoher grüner Balken, der den Gesamtfortschritt des Songs in Prozent anzeigt
- **Song**: Ein Songtext mit Metadaten, bestehend aus Strophen und Zeilen
- **Strophe**: Ein benannter Textabschnitt eines Songs (z.B. Verse 1, Chorus, Bridge)
- **Zeile**: Eine einzelne Textzeile innerhalb einer Strophe
- **Session**: Eine abgeschlossene Lerneinheit an einem Song mit zugeordneter Lernmethode

## Anforderungen

### Requirement 1: Quiz-Seite laden und Quiz-Typ-Auswahl anzeigen

**User Story:** Als Nutzer möchte ich den Quiz-Modus für einen Song öffnen und einen Quiz-Typ auswählen, damit ich die für mich passende Übungsform starten kann.

#### Acceptance Criteria

1. WHEN der Nutzer die Route `/songs/[id]/quiz` aufruft, THE Quiz_Page SHALL eine Navigationsleiste mit Zurück-Button, Song-Titel und dem Label „Quiz" anzeigen
2. WHEN die Quiz_Page geladen wird, THE Quiz_Page SHALL die Quiz_Typ_Auswahl mit drei Kacheln (Multiple Choice, Reihenfolge, Diktat) und je einer Kurzbeschreibung anzeigen
3. WHEN der Nutzer eine Kachel in der Quiz_Typ_Auswahl auswählt, THE Quiz_Page SHALL den gewählten Quiz-Typ starten und die erste Frage anzeigen
4. IF der Nutzer nicht authentifiziert ist, THEN THE Quiz_Page SHALL den Nutzer zur Login-Seite weiterleiten
5. IF der Song nicht existiert oder dem Nutzer nicht gehört, THEN THE Quiz_Page SHALL eine 404-Fehlerseite anzeigen
6. WHEN die Quiz_Page geladen wird, THE Progress_Bar SHALL den aktuellen Fortschritt des Songs in Prozent anzeigen

### Requirement 2: Multiple-Choice-Fragen generieren

**User Story:** Als Nutzer möchte ich Multiple-Choice-Fragen über den Songtext beantworten, damit ich Lücken in meinem Wissen spielerisch aufdecke.

#### Acceptance Criteria

1. WHEN der Quiz-Typ „Multiple Choice" gestartet wird, THE Quiz_Generator SHALL pro Frage eine Zeile aus dem Songtext auswählen und das nächste Wort an einer bestimmten Position als Frage formulieren
2. THE Quiz_Generator SHALL pro Frage genau 4 Antwortoptionen generieren, von denen genau 1 korrekt ist
3. THE Quiz_Generator SHALL die 3 falschen Antwortoptionen aus anderen Wörtern des Songtexts auswählen, die nicht mit dem korrekten Wort identisch sind
4. THE Quiz_Generator SHALL die Reihenfolge der 4 Antwortoptionen zufällig mischen
5. WHEN der Song weniger als 4 unterschiedliche Wörter enthält, THE Quiz_Generator SHALL die verfügbaren Wörter als Antwortoptionen verwenden und fehlende Optionen durch Wiederholung auffüllen

### Requirement 3: Multiple-Choice-Interaktion mit Sofortfeedback

**User Story:** Als Nutzer möchte ich sofort sehen, ob meine Antwort richtig oder falsch ist, damit ich direktes Feedback beim Lernen erhalte.

#### Acceptance Criteria

1. THE Multiple_Choice_Card SHALL die Frage oben in 14px Schriftgröße und die 4 Antwort-Buttons darunter anzeigen
2. WHEN der Nutzer einen Antwort-Button auswählt, THE Multiple_Choice_Card SHALL die gewählte Antwort sofort farblich markieren: grün bei korrekter Antwort, rot bei falscher Antwort
3. WHEN der Nutzer eine falsche Antwort auswählt, THE Multiple_Choice_Card SHALL zusätzlich die korrekte Antwort grün markieren
4. WHEN das Feedback angezeigt wird, THE Multiple_Choice_Card SHALL alle Antwort-Buttons als nicht-klickbar (disabled) setzen
5. WHEN das Feedback angezeigt wird, THE Multiple_Choice_Card SHALL einen Weiter-Button anzeigen, der zur nächsten Frage führt
6. THE Multiple_Choice_Card SHALL keinen separaten Prüfen-Button benötigen (Sofortfeedback bei Auswahl)

### Requirement 4: Reihenfolge-Quiz (Drag & Drop)

**User Story:** Als Nutzer möchte ich die Zeilen einer Strophe in die richtige Reihenfolge bringen, damit ich die Struktur des Songtexts verinnerliche.

#### Acceptance Criteria

1. WHEN der Quiz-Typ „Reihenfolge" gestartet wird, THE Quiz_Generator SHALL eine Strophe auswählen und deren Zeilen in zufälliger Reihenfolge als verschiebbare Karten auf der Reihenfolge_Card darstellen
2. THE Reihenfolge_Card SHALL die Zeilen als verschiebbare Karten darstellen, die per Drag & Drop neu angeordnet werden können
3. THE Reihenfolge_Card SHALL einen Bestätigen-Button anzeigen, mit dem der Nutzer seine Anordnung zur Prüfung abgibt
4. WHEN der Nutzer den Bestätigen-Button betätigt, THE Reihenfolge_Card SHALL jede Zeile farblich markieren: grün für Zeilen an der korrekten Position, rot für Zeilen an einer falschen Position
5. WHEN das Feedback angezeigt wird, THE Reihenfolge_Card SHALL die korrekte Reihenfolge sichtbar machen
6. WHEN das Feedback angezeigt wird, THE Reihenfolge_Card SHALL einen Weiter-Button anzeigen, der zur nächsten Strophe oder zum Score_Screen führt
7. WHEN eine Strophe nur 1 Zeile enthält, THE Quiz_Generator SHALL diese Strophe für den Reihenfolge-Quiz überspringen

### Requirement 5: Diktat-Quiz

**User Story:** Als Nutzer möchte ich eine Zeile aus dem Gedächtnis aufschreiben, damit ich mein Textwissen auf die Probe stelle.

#### Acceptance Criteria

1. WHEN der Quiz-Typ „Diktat" gestartet wird, THE Quiz_Generator SHALL eine Zeile aus dem Songtext auswählen und den Strophen-Namen als Kontext anzeigen
2. THE Diktat_Card SHALL eine Textarea und einen Abgabe-Button anzeigen
3. WHEN der Nutzer den Abgabe-Button betätigt, THE Diktat_Card SHALL die Eingabe zeilenweise mit dem Originaltext vergleichen
4. WHEN der Vergleich durchgeführt wird, THE Diktat_Card SHALL Abweichungen vom Originaltext farblich hervorheben (rot für falsche Teile, grün für korrekte Teile)
5. THE Diktat_Card SHALL den Originaltext nach dem Vergleich vollständig anzeigen
6. WHEN der Vergleich abgeschlossen ist, THE Diktat_Card SHALL einen Weiter-Button anzeigen, der zur nächsten Zeile oder zum Score_Screen führt
7. THE Diktat_Card SHALL die Eingabe als korrekt werten, wenn der eingegebene Text nach Normalisierung (Groß-/Kleinschreibung ignorieren, führende/nachfolgende Leerzeichen entfernen) mit dem Originaltext übereinstimmt

### Requirement 6: Score-Anzeige und Empfehlung

**User Story:** Als Nutzer möchte ich am Ende einer Quiz-Session mein Ergebnis und eine Empfehlung sehen, damit ich weiß, wie gut ich abgeschnitten habe und was ich als nächstes tun sollte.

#### Acceptance Criteria

1. WHEN alle Fragen einer Quiz-Session beantwortet sind, THE Score_Screen SHALL die Punktzahl im Format „N / M korrekt" anzeigen
2. WHEN der Score unter 70% liegt, THE Score_Screen SHALL die Empfehlung „Nochmal üben" anzeigen
3. WHEN der Score 70% oder höher liegt, THE Score_Screen SHALL die Empfehlung „Weiter zur nächsten Methode" anzeigen
4. THE Score_Screen SHALL einen Button zum Wiederholen des Quiz anzeigen
5. THE Score_Screen SHALL einen Button zur Rückkehr zur Song-Detailseite anzeigen

### Requirement 7: Fortschritts-Integration

**User Story:** Als Nutzer möchte ich, dass meine Quiz-Ergebnisse in den Song-Fortschritt einfließen, damit mein Gesamtlernstand aktuell bleibt.

#### Acceptance Criteria

1. WHEN eine Quiz-Session abgeschlossen wird, THE Quiz_Page SHALL den Fortschritt der betroffenen Strophen anteilig über die Progress-API (`PUT /api/progress`) aktualisieren
2. WHEN eine Quiz-Session abgeschlossen wird, THE Quiz_Page SHALL eine neue Session mit Lernmethode `QUIZ` über die Sessions-API (`POST /api/sessions`) erstellen
3. THE Quiz_Page SHALL den Fortschrittsbeitrag pro Strophe basierend auf dem Anteil korrekt beantworteter Fragen zu dieser Strophe berechnen
4. WHEN die Quiz-Session abgeschlossen wird, THE Progress_Bar SHALL den aktualisierten Fortschritt des Songs anzeigen

### Requirement 8: Barrierefreiheit

**User Story:** Als Nutzer mit Einschränkungen möchte ich den Quiz-Modus mit assistiven Technologien bedienen können, damit ich gleichberechtigt am Lernen teilnehmen kann.

#### Acceptance Criteria

1. THE Multiple_Choice_Card SHALL die Antwort-Buttons als `role="radiogroup"` mit `aria-label="Antwortoptionen"` implementieren
2. WHEN ein Antwort-Button als korrekt oder falsch markiert wird, THE Multiple_Choice_Card SHALL den Status über `aria-live="polite"` an Screenreader kommunizieren
3. THE Reihenfolge_Card SHALL die verschiebbaren Karten mit `aria-label` und `aria-roledescription="verschiebbare Karte"` versehen
4. THE Reihenfolge_Card SHALL eine alternative Tastatur-Bedienung (Pfeil-Tasten zum Verschieben) für die Drag-&-Drop-Interaktion bereitstellen
5. THE Diktat_Card SHALL die Textarea mit einem `aria-label="Zeile aus dem Gedächtnis eingeben"` versehen
6. THE Quiz_Page SHALL per Tastatur vollständig navigierbar sein (Tab-Reihenfolge folgt der logischen Lesereihenfolge)
7. THE Score_Screen SHALL das Ergebnis über `aria-live="polite"` an Screenreader kommunizieren

### Requirement 9: Responsive Darstellung

**User Story:** Als Nutzer möchte ich den Quiz-Modus auf Desktop, Tablet und Smartphone nutzen können, damit ich überall lernen kann.

#### Acceptance Criteria

1. WHILE die Viewport-Breite unter 640px liegt, THE Quiz_Typ_Auswahl SHALL die drei Kacheln in einer einspaltigen Ansicht darstellen
2. WHILE die Viewport-Breite 640px oder mehr beträgt, THE Quiz_Typ_Auswahl SHALL die drei Kacheln in einer dreispaltigen Ansicht darstellen
3. THE Multiple_Choice_Card SHALL die Antwort-Buttons in voller Breite untereinander anzeigen
4. THE Reihenfolge_Card SHALL auf Touch-Geräten eine Mindest-Tippfläche von 44×44px pro verschiebbarer Karte besitzen
5. THE Diktat_Card SHALL die Textarea in voller Breite mit einer Mindesthöhe von 120px darstellen

### Requirement 10: Strophen-Auswahl für Quiz

**User Story:** Als Nutzer möchte ich auswählen können, welche Strophen im Quiz abgefragt werden, damit ich gezielt bestimmte Teile des Songs üben oder meine Schwächen trainieren kann.

#### Acceptance Criteria

1. WHEN die Quiz_Page geladen wird, THE Quiz_Page SHALL einen „Strophen auswählen"-Button anzeigen, der einen Auswahl-Dialog öffnet
2. WHEN der Auswahl-Dialog geöffnet wird, THE Quiz_Page SHALL alle Strophen des Songs als Checkboxen mit ihrem Namen und aktuellem Fortschritt (Prozent) anzeigen
3. WHEN der Auswahl-Dialog geöffnet wird, THE Quiz_Page SHALL standardmäßig alle Strophen als ausgewählt markieren
4. THE Quiz_Page SHALL im Auswahl-Dialog Buttons „Alle auswählen" und „Alle abwählen" anzeigen
5. THE Quiz_Page SHALL im Auswahl-Dialog einen „Schwächen üben"-Button anzeigen, der nur die Strophen mit Fortschritt unter 80% auswählt
6. IF keine Strophe einen Fortschritt unter 80% hat, THEN THE „Schwächen üben"-Button SHALL deaktiviert sein
7. WHEN der Nutzer die Auswahl bestätigt, THE Quiz_Generator SHALL nur Fragen aus den ausgewählten Strophen generieren
8. IF der Nutzer keine Strophe ausgewählt hat, THEN THE Quiz_Page SHALL eine Validierungsmeldung „Mindestens eine Strophe muss ausgewählt sein" anzeigen und die Bestätigung verhindern
9. WHEN der Nutzer den Quiz-Typ wechselt oder das Quiz wiederholt, THE Quiz_Page SHALL die aktuelle Strophen-Auswahl beibehalten

### Requirement 11: Fehlerbehandlung

**User Story:** Als Nutzer möchte ich bei Problemen verständliche Fehlermeldungen erhalten, damit ich weiß, was passiert ist und wie ich fortfahren kann.

#### Acceptance Criteria

1. IF die Song-Daten nicht geladen werden können, THEN THE Quiz_Page SHALL eine Fehlermeldung „Song konnte nicht geladen werden" und einen Zurück-Button anzeigen
2. IF die Fortschritts-Aktualisierung fehlschlägt, THEN THE Quiz_Page SHALL eine Fehlermeldung anzeigen und dem Nutzer ermöglichen, die Aktualisierung erneut zu versuchen
3. IF die Session-Erstellung fehlschlägt, THEN THE Quiz_Page SHALL den Fehler protokollieren und den Nutzer nicht blockieren
4. IF eine Strophe keine Zeilen enthält, THEN THE Quiz_Generator SHALL diese Strophe für alle Quiz-Typen überspringen
