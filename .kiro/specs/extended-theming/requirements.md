# Anforderungsdokument: Erweitertes Theming

## Einleitung

Das bestehende Theming-System des Song Text Trainers unterstützt eine einzelne, vom Administrator konfigurierte Theme-Konfiguration. Dieses Feature erweitert das System um die Verwaltung mehrerer Themes, eine benutzerspezifische Theme-Auswahl, Light/Dark-Varianten mit Toggle-Umschaltung sowie einen JSON-basierten Import/Export mit semantisch beschreibenden Metadaten für KI-Generatoren.

## Glossar

- **Theme_Verwaltung**: Das Admin-Modul zum Erstellen, Bearbeiten, Speichern und Löschen von Themes.
- **Theme**: Ein benanntes Design-Profil, das eine vollständige Theme_Konfiguration in einer Light- und einer Dark-Variante enthält.
- **Theme_Konfiguration**: Ein persistentes Datenobjekt, das alle anpassbaren Werte (Farben, Schriften, Bezeichnungen) eines Themes enthält (wie im bestehenden Theming-System definiert).
- **Light_Variante**: Die helle Farbvariante eines Themes, optimiert für helle Hintergründe und dunklen Text.
- **Dark_Variante**: Die dunkle Farbvariante eines Themes, optimiert für dunkle Hintergründe und hellen Text.
- **Varianten_Toggle**: Ein UI-Schalter im User-Menü, mit dem der Benutzer zwischen Light_Variante und Dark_Variante umschalten kann.
- **Theme_Auswahl**: Die Benutzeroberfläche im Benutzerprofil, über die ein Benutzer ein aktives Theme aus der Liste der verfügbaren Themes wählt.
- **Theme_JSON**: Das JSON-Austauschformat für Themes, das alle Konfigurationswerte sowie semantische Beschreibungen enthält.
- **Theme_Serializer**: Das Modul, das Theme-Objekte in Theme_JSON serialisiert und Theme_JSON in Theme-Objekte deserialisiert.
- **Theme_Pretty_Printer**: Das Modul, das Theme-Objekte in formatiertes, lesbares Theme_JSON mit semantischen Beschreibungen ausgibt.
- **Semantische_Beschreibung**: Ein menschenlesbarer und KI-verständlicher Beschreibungstext zu jeder Theme-Einstellung im Theme_JSON, der Zweck und Wirkung der Einstellung erklärt.
- **Standard_Theme**: Das vordefinierte Theme, das verwendet wird, wenn kein benutzerspezifisches Theme ausgewählt ist.
- **Benutzer_Theme_Präferenz**: Die persistierte Zuordnung eines Benutzers zu einem gewählten Theme und der gewählten Variante (Light/Dark).

## Anforderungen

### Anforderung 1: Themes erstellen

**User Story:** Als Administrator möchte ich neue Themes erstellen können, damit der Anwendung unterschiedliche Designs zur Verfügung stehen.

#### Akzeptanzkriterien

1. THE Theme_Verwaltung SHALL eine Funktion zum Erstellen eines neuen Themes mit einem eindeutigen Namen bereitstellen.
2. WHEN der Administrator ein neues Theme erstellt, THE Theme_Verwaltung SHALL automatisch eine Light_Variante und eine Dark_Variante mit Standardwerten anlegen.
3. THE Theme_Verwaltung SHALL den Theme-Namen auf maximal 100 Zeichen begrenzen.
4. IF der Administrator einen bereits vergebenen Theme-Namen eingibt, THEN THE Theme_Verwaltung SHALL eine Fehlermeldung anzeigen und das Erstellen verhindern.

### Anforderung 2: Themes bearbeiten

**User Story:** Als Administrator möchte ich bestehende Themes bearbeiten können, damit ich Designs nach Bedarf anpassen kann.

#### Akzeptanzkriterien

1. THE Theme_Verwaltung SHALL eine Bearbeitungsansicht bereitstellen, in der der Administrator die Light_Variante und die Dark_Variante eines Themes separat konfigurieren kann.
2. WHEN der Administrator eine Variante bearbeitet, THE Theme_Verwaltung SHALL die Änderungen in einer Live-Vorschau anzeigen.
3. THE Theme_Verwaltung SHALL einen Speichern-Button bereitstellen, der die Änderungen an beiden Varianten persistent speichert.
4. IF der Administrator die Bearbeitungsansicht ohne Speichern verlässt, THEN THE Theme_Verwaltung SHALL eine Bestätigungsmeldung anzeigen.

### Anforderung 3: Themes löschen

**User Story:** Als Administrator möchte ich Themes löschen können, damit nicht mehr benötigte Designs entfernt werden.

#### Akzeptanzkriterien

1. THE Theme_Verwaltung SHALL eine Löschfunktion für jedes Theme bereitstellen.
2. WHEN der Administrator ein Theme löscht, THE Theme_Verwaltung SHALL eine Bestätigungsmeldung anzeigen, bevor das Theme entfernt wird.
3. IF das zu löschende Theme von mindestens einem Benutzer als aktives Theme ausgewählt ist, THEN THE Theme_Verwaltung SHALL die betroffenen Benutzer auf das Standard_Theme zurücksetzen.
4. THE Theme_Verwaltung SHALL das Löschen des Standard_Themes verhindern.

### Anforderung 4: Theme-Übersicht für Administratoren

**User Story:** Als Administrator möchte ich eine Übersicht aller vorhandenen Themes sehen, damit ich den Bestand verwalten kann.

#### Akzeptanzkriterien

1. THE Theme_Verwaltung SHALL eine Listenansicht aller vorhandenen Themes mit Name und Erstellungsdatum bereitstellen.
2. THE Theme_Verwaltung SHALL in der Listenansicht eine visuelle Vorschau (Farbpalette) jedes Themes anzeigen.
3. THE Theme_Verwaltung SHALL das Standard_Theme in der Liste als solches kennzeichnen.

### Anforderung 5: Light- und Dark-Variante pflegen

**User Story:** Als Entwickler möchte ich jedes Theme in einer Light- und einer Dark-Variante pflegen, damit Benutzer zwischen hellen und dunklen Darstellungen wählen können.

#### Akzeptanzkriterien

1. THE Theme_Verwaltung SHALL für jedes Theme genau eine Light_Variante und eine Dark_Variante speichern.
2. THE Theme_Verwaltung SHALL in der Bearbeitungsansicht einen Umschalter zwischen Light_Variante und Dark_Variante bereitstellen.
3. WHEN der Administrator die Light_Variante bearbeitet, THE Theme_Verwaltung SHALL die Änderungen unabhängig von der Dark_Variante speichern.
4. WHEN der Administrator die Dark_Variante bearbeitet, THE Theme_Verwaltung SHALL die Änderungen unabhängig von der Light_Variante speichern.
5. THE Theme_Verwaltung SHALL beim Erstellen eines neuen Themes die Light_Variante mit hellen Standardwerten und die Dark_Variante mit dunklen Standardwerten initialisieren.

### Anforderung 6: Benutzerspezifische Theme-Auswahl

**User Story:** Als Benutzer möchte ich in meinem Profil eines der vom Administrator erstellten Themes auswählen, damit ich die Anwendung nach meinem Geschmack nutzen kann.

#### Akzeptanzkriterien

1. THE Theme_Auswahl SHALL im Benutzerprofil eine Liste aller verfügbaren Themes anzeigen.
2. THE Theme_Auswahl SHALL zu jedem Theme eine visuelle Vorschau (Farbpalette) anzeigen.
3. WHEN der Benutzer ein Theme auswählt, THE Theme_Auswahl SHALL das gewählte Theme als Benutzer_Theme_Präferenz persistent speichern.
4. WHEN der Benutzer ein Theme auswählt, THE Theming_System SHALL das gewählte Theme sofort auf die Anwendung anwenden.
5. IF ein Benutzer keine Theme-Auswahl getroffen hat, THEN THE Theming_System SHALL das Standard_Theme verwenden.

### Anforderung 7: Light/Dark-Varianten-Toggle im User-Menü

**User Story:** Als Benutzer möchte ich im User-Menü mit einem Toggle zwischen der Light- und Dark-Variante meines Themes umschalten, damit ich die Darstellung an meine aktuelle Umgebung anpassen kann.

#### Akzeptanzkriterien

1. THE Varianten_Toggle SHALL im User-Menü als Schalter mit den Optionen „Light" und „Dark" sichtbar sein.
2. WHEN der Benutzer den Varianten_Toggle betätigt, THE Theming_System SHALL die Anwendung sofort auf die gewählte Variante (Light_Variante oder Dark_Variante) umschalten.
3. THE Theming_System SHALL die gewählte Variante als Teil der Benutzer_Theme_Präferenz persistent speichern.
4. WHEN der Benutzer die Anwendung erneut öffnet, THE Theming_System SHALL die zuletzt gewählte Variante wiederherstellen.
5. IF der Benutzer keine Variante gewählt hat, THEN THE Theming_System SHALL die Light_Variante als Standard verwenden.

### Anforderung 8: Themes im JSON-Format exportieren

**User Story:** Als Administrator möchte ich Themes im JSON-Format exportieren, damit ich Themes sichern und zwischen Instanzen übertragen kann.

#### Akzeptanzkriterien

1. THE Theme_Verwaltung SHALL eine Export-Funktion für jedes einzelne Theme bereitstellen.
2. WHEN der Administrator ein Theme exportiert, THE Theme_Pretty_Printer SHALL das Theme als formatiertes Theme_JSON ausgeben, das beide Varianten (Light und Dark) enthält.
3. THE Theme_JSON SHALL den Theme-Namen, die Light_Variante und die Dark_Variante als separate Abschnitte enthalten.
4. THE Theme_JSON SHALL eine Versionsnummer des Formats enthalten.
5. THE Theme_Verwaltung SHALL die exportierte Theme_JSON-Datei zum Download anbieten.

### Anforderung 9: Themes im JSON-Format importieren

**User Story:** Als Administrator möchte ich Themes im JSON-Format importieren, damit ich extern erstellte oder gesicherte Themes in die Anwendung laden kann.

#### Akzeptanzkriterien

1. THE Theme_Verwaltung SHALL eine Import-Funktion bereitstellen, die eine Theme_JSON-Datei entgegennimmt.
2. WHEN der Administrator eine gültige Theme_JSON-Datei importiert, THE Theme_Serializer SHALL die Datei in ein Theme-Objekt deserialisieren und als neues Theme speichern.
3. IF die importierte Theme_JSON-Datei ungültige oder fehlende Pflichtfelder enthält, THEN THE Theme_Serializer SHALL eine beschreibende Fehlermeldung anzeigen und den Import abbrechen.
4. IF der Theme-Name aus der importierten Datei bereits existiert, THEN THE Theme_Verwaltung SHALL den Benutzer fragen, ob das bestehende Theme überschrieben oder ein neuer Name vergeben werden soll.
5. THE Theme_Serializer SHALL die Versionsnummer des Formats prüfen und bei inkompatiblen Versionen eine Fehlermeldung anzeigen.

### Anforderung 10: Semantische Beschreibungen im Theme-JSON

**User Story:** Als Entwickler möchte ich, dass das Theme_JSON zu jeder Einstellung einen aussagekräftigen Beschreibungstext enthält, damit ein KI-Generator die Struktur semantisch verstehen und Themes erstellen kann.

#### Akzeptanzkriterien

1. THE Theme_Pretty_Printer SHALL zu jeder Theme-Einstellung im Theme_JSON ein Feld „description" ausgeben, das Zweck und Wirkung der Einstellung in natürlicher Sprache beschreibt.
2. THE Semantische_Beschreibung SHALL den Kontext der Einstellung erklären (z.B. „Hintergrundfarbe der Song-Cards in der Übersicht, beeinflusst die Lesbarkeit des Songtitels").
3. THE Theme_Pretty_Printer SHALL das Theme_JSON mit Einrückung und Zeilenumbrüchen formatieren, sodass die Struktur für Menschen und KI-Systeme leicht lesbar ist.
4. WHEN der Theme_Serializer eine Theme_JSON-Datei importiert, THE Theme_Serializer SHALL die Beschreibungsfelder tolerieren, ohne sie als Konfigurationswerte zu interpretieren.

### Anforderung 11: Round-Trip-Eigenschaft des Theme-Serializers

**User Story:** Als Entwickler möchte ich sicherstellen, dass der Export und anschließende Import eines Themes ein identisches Ergebnis liefert, damit keine Daten beim Transfer verloren gehen.

#### Akzeptanzkriterien

1. FÜR ALLE gültigen Theme-Objekte SHALL das Serialisieren mittels Theme_Pretty_Printer und anschließende Deserialisieren mittels Theme_Serializer ein semantisch äquivalentes Theme-Objekt erzeugen (Round-Trip-Eigenschaft).
2. THE Theme_Serializer SHALL beim Deserialisieren die Beschreibungsfelder ignorieren und ausschließlich die Konfigurationswerte übernehmen.
3. FÜR ALLE gültigen Theme_JSON-Dateien SHALL das Deserialisieren und anschließende Serialisieren ein Theme_JSON erzeugen, das die gleichen Konfigurationswerte enthält.
