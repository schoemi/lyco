# Requirements Document

## Einleitung

Dieses Dokument beschreibt die Anforderungen für die selektive Lückentext-Übung im Song Text Trainer. Aktuell wird beim Lückentext-Modus immer der gesamte Songtext geübt. Bei langen Songs ist das zu umfangreich für eine einzelne Übungssitzung, und bereits beherrschte Strophen müssen unnötig wiederholt werden. Das neue Feature ermöglicht es Nutzern, gezielt einzelne Strophen für die Lückentext-Übung auszuwählen – entweder manuell über einen Auswahldialog oder basierend auf Schwächen aus vorherigen Sessions.

## Glossar

- **Cloze_Page**: Die bestehende Next.js-Seite unter `/songs/[id]/cloze`, die den Lückentext-Lernmodus für einen Song darstellt
- **Strophen_Auswahl_Dialog**: Ein modaler Dialog mit einer Liste von Checkboxen, über den der Nutzer einzelne Strophen für die Übung auswählen kann
- **Fortschritt**: Der bestehende Datensatz in der Datenbank, der den Lernfortschritt pro Strophe und Nutzer als Prozentwert (0–100) speichert
- **Schwächen_Indikator**: Eine visuelle Kennzeichnung im Strophen_Auswahl_Dialog, die Strophen mit niedrigem Fortschritt hervorhebt
- **Aktive_Strophen**: Die Menge der vom Nutzer ausgewählten Strophen, die in der aktuellen Übungssitzung als Lückentext dargestellt werden
- **Gap_Generator**: Der bestehende Algorithmus, der basierend auf dem Schwierigkeitsgrad bestimmt, welche Wörter in einer Zeile als Lücken dargestellt werden
- **Score_Pill**: Die bestehende Anzeige, die den aktuellen Stand korrekt beantworteter Lücken im Format „N / M richtig" zeigt
- **Progress_Bar**: Der bestehende Fortschrittsbalken, der den Gesamtfortschritt in Prozent anzeigt
- **Fortschritts_Schwelle**: Der Prozentwert (unter 80%), ab dem eine Strophe als schwach gilt und im Strophen_Auswahl_Dialog als Schwäche markiert wird

## Anforderungen

### Requirement 1: Strophen-Auswahl öffnen

**User Story:** Als Nutzer möchte ich einen Dialog öffnen können, um gezielt Strophen für die Lückentext-Übung auszuwählen, damit ich nicht immer den gesamten Songtext üben muss.

#### Acceptance Criteria

1. WHEN die Cloze_Page geladen wird, THE Cloze_Page SHALL einen Button „Strophen auswählen" oberhalb der Stanza_Blocks anzeigen
2. WHEN der Nutzer den Button „Strophen auswählen" betätigt, THE Cloze_Page SHALL den Strophen_Auswahl_Dialog als modalen Dialog öffnen
3. THE Strophen_Auswahl_Dialog SHALL alle Strophen des Songs als Liste mit je einer Checkbox und dem Strophen-Namen anzeigen
4. WHEN der Strophen_Auswahl_Dialog geöffnet wird, THE Strophen_Auswahl_Dialog SHALL die aktuell Aktiven_Strophen als vorausgewählt (checked) darstellen
5. WHEN die Cloze_Page erstmalig geladen wird und keine Auswahl getroffen wurde, THE Cloze_Page SHALL alle Strophen als Aktive_Strophen vorauswählen (Standardverhalten wie bisher)

### Requirement 2: Strophen im Dialog auswählen und abwählen

**User Story:** Als Nutzer möchte ich im Dialog einzelne Strophen an- und abwählen können, damit ich die Übung auf meine Bedürfnisse zuschneiden kann.

#### Acceptance Criteria

1. WHEN der Nutzer eine Checkbox im Strophen_Auswahl_Dialog aktiviert oder deaktiviert, THE Strophen_Auswahl_Dialog SHALL die Auswahl sofort visuell aktualisieren
2. THE Strophen_Auswahl_Dialog SHALL einen „Alle auswählen"-Button anzeigen, der alle Checkboxen auf aktiviert setzt
3. THE Strophen_Auswahl_Dialog SHALL einen „Alle abwählen"-Button anzeigen, der alle Checkboxen auf deaktiviert setzt
4. IF der Nutzer versucht, den Dialog mit null ausgewählten Strophen zu bestätigen, THEN THE Strophen_Auswahl_Dialog SHALL eine Fehlermeldung „Mindestens eine Strophe muss ausgewählt sein" anzeigen und das Bestätigen verhindern
5. THE Strophen_Auswahl_Dialog SHALL die Strophen in der Reihenfolge ihres orderIndex anzeigen

### Requirement 3: Auswahl bestätigen und Übung starten

**User Story:** Als Nutzer möchte ich meine Strophen-Auswahl bestätigen und die Übung mit den gewählten Strophen starten, damit ich gezielt üben kann.

#### Acceptance Criteria

1. THE Strophen_Auswahl_Dialog SHALL einen „Übung starten"-Button anzeigen, der den Dialog schließt und die Auswahl übernimmt
2. WHEN der Nutzer den „Übung starten"-Button betätigt, THE Cloze_Page SHALL nur die Aktiven_Strophen als Stanza_Blocks darstellen
3. WHEN der Nutzer den „Übung starten"-Button betätigt, THE Gap_Generator SHALL Lücken nur für die Zeilen der Aktiven_Strophen generieren
4. WHEN der Nutzer den „Übung starten"-Button betätigt, THE Score_Pill SHALL den Wert „0 / M richtig" anzeigen, wobei M die Gesamtanzahl der Lücken in den Aktiven_Strophen ist
5. WHEN der Nutzer den „Übung starten"-Button betätigt, THE Cloze_Page SHALL alle bisherigen Eingaben und Feedback-Zustände zurücksetzen
6. THE Strophen_Auswahl_Dialog SHALL einen „Abbrechen"-Button anzeigen, der den Dialog schließt, ohne die Auswahl zu ändern

### Requirement 4: Schwächen-basierte Empfehlung

**User Story:** Als Nutzer möchte ich sehen, welche Strophen ich noch nicht gut beherrsche, damit ich gezielt meine Schwächen üben kann.

#### Acceptance Criteria

1. WHEN der Strophen_Auswahl_Dialog geöffnet wird, THE Strophen_Auswahl_Dialog SHALL den gespeicherten Fortschritt (Prozentwert) für jede Strophe aus der Datenbank laden und neben dem Strophen-Namen anzeigen
2. WHILE eine Strophe einen Fortschritt unter der Fortschritts_Schwelle von 80% hat, THE Strophen_Auswahl_Dialog SHALL diese Strophe mit einem Schwächen_Indikator (orangefarbenes Label „Schwäche") kennzeichnen
3. WHILE eine Strophe keinen gespeicherten Fortschritt hat, THE Strophen_Auswahl_Dialog SHALL den Fortschritt als 0% anzeigen und die Strophe mit dem Schwächen_Indikator kennzeichnen
4. THE Strophen_Auswahl_Dialog SHALL einen „Schwächen üben"-Button anzeigen, der automatisch alle Strophen mit einem Fortschritt unter der Fortschritts_Schwelle auswählt und alle anderen abwählt
5. IF alle Strophen einen Fortschritt von 80% oder höher haben, THEN THE Strophen_Auswahl_Dialog SHALL den „Schwächen üben"-Button deaktiviert (disabled) darstellen und den Tooltip „Keine Schwächen vorhanden" anzeigen

### Requirement 5: Fortschritt nur für Aktive Strophen persistieren

**User Story:** Als Nutzer möchte ich, dass mein Fortschritt korrekt nur für die geübten Strophen gespeichert wird, damit mein Lernstand die tatsächliche Übung widerspiegelt.

#### Acceptance Criteria

1. WHEN alle Lücken der Aktiven_Strophen korrekt ausgefüllt sind, THE Cloze_Page SHALL den Fortschritt (100%) nur für die Aktiven_Strophen über die Progress-API persistieren
2. WHEN alle Lücken der Aktiven_Strophen korrekt ausgefüllt sind, THE Cloze_Page SHALL den Fortschritt für nicht-aktive Strophen unverändert lassen
3. WHEN alle Lücken der Aktiven_Strophen korrekt ausgefüllt sind, THE Cloze_Page SHALL eine neue Session mit Lernmethode `LUECKENTEXT` über die Sessions-API erstellen

### Requirement 6: Schwierigkeitswechsel mit aktiver Strophen-Auswahl

**User Story:** Als Nutzer möchte ich die Schwierigkeitsstufe wechseln können, ohne meine Strophen-Auswahl zu verlieren, damit ich flexibel üben kann.

#### Acceptance Criteria

1. WHEN der Nutzer die Schwierigkeitsstufe wechselt, THE Cloze_Page SHALL die Aktiven_Strophen beibehalten
2. WHEN der Nutzer die Schwierigkeitsstufe wechselt, THE Gap_Generator SHALL die Lücken nur für die Aktiven_Strophen basierend auf der neuen Stufe neu berechnen
3. WHEN der Nutzer die Schwierigkeitsstufe wechselt, THE Score_Pill SHALL auf „0 / M richtig" zurückgesetzt werden, wobei M die neue Gesamtanzahl der Lücken in den Aktiven_Strophen ist

### Requirement 7: Barrierefreiheit des Auswahl-Dialogs

**User Story:** Als Nutzer mit Einschränkungen möchte ich den Strophen-Auswahl-Dialog mit assistiven Technologien bedienen können, damit ich gleichberechtigt am Lernen teilnehmen kann.

#### Acceptance Criteria

1. THE Strophen_Auswahl_Dialog SHALL als `role="dialog"` mit `aria-modal="true"` und `aria-labelledby` (Verweis auf die Dialog-Überschrift) implementiert werden
2. WHEN der Strophen_Auswahl_Dialog geöffnet wird, THE Strophen_Auswahl_Dialog SHALL den Fokus auf das erste interaktive Element im Dialog setzen
3. WHEN der Nutzer die Escape-Taste drückt, THE Strophen_Auswahl_Dialog SHALL den Dialog schließen, ohne die Auswahl zu ändern
4. THE Strophen_Auswahl_Dialog SHALL per Tastatur vollständig navigierbar sein (Tab-Reihenfolge: Checkboxen, Aktions-Buttons)
5. WHEN der Strophen_Auswahl_Dialog geöffnet ist, THE Strophen_Auswahl_Dialog SHALL den Fokus innerhalb des Dialogs halten (Focus-Trap)
6. THE Schwächen_Indikator SHALL ein `aria-label` mit dem Text „Schwäche – Fortschritt unter 80%" besitzen

### Requirement 8: Responsive Darstellung des Auswahl-Dialogs

**User Story:** Als Nutzer möchte ich den Strophen-Auswahl-Dialog auf allen Geräten komfortabel bedienen können, damit ich überall gezielt üben kann.

#### Acceptance Criteria

1. WHILE die Viewport-Breite unter 640px liegt, THE Strophen_Auswahl_Dialog SHALL als Vollbild-Overlay dargestellt werden
2. WHILE die Viewport-Breite 640px oder mehr beträgt, THE Strophen_Auswahl_Dialog SHALL als zentrierter modaler Dialog mit einer maximalen Breite von 480px dargestellt werden
3. THE Strophen_Auswahl_Dialog SHALL eine scrollbare Liste anzeigen, wenn die Anzahl der Strophen die sichtbare Höhe des Dialogs überschreitet
4. THE Checkbox-Elemente im Strophen_Auswahl_Dialog SHALL auf Touch-Geräten eine Mindest-Tippfläche von 44×44px besitzen
