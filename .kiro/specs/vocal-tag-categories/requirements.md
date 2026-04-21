# Anforderungsdokument: Vocal-Tag-Kategorien

## Einleitung

Das bestehende Vocal-Tag-System ermöglicht die Annotation von Songtexten mit gesangstechnischen Anweisungen über ChordPro-Tags. Aktuell werden alle Tag-Definitionen in einer flachen Liste verwaltet und angezeigt. Diese Erweiterung führt ein Kategorie-System ein, das Tags in thematische Gruppen organisiert. Jede Tag-Definition gehört zu genau einer Kategorie (1:1-Beziehung). Kategorien werden in der Administration verwaltet und im Tag-Picker des Editors zur Gruppierung genutzt. Das JSON-Import/Export-Format wird um ein `category`-Feld erweitert.

## Glossar

- **Tag_Kategorie**: Ein Gruppierungsobjekt für Tag-Definitionen. Enthält die Felder `id`, `title` (Anzeigename), `slug` (eindeutiger Kurzbezeichner, entspricht dem Wert im JSON-Import) und `orderIndex` (Sortierreihenfolge).
- **Tag_Definition**: Ein zentrales Konfigurationsobjekt für eine Gesangstechnik. Enthält `tag`, `label`, `icon`, `color`, `indexNr` und ab dieser Erweiterung eine optionale Referenz auf eine Tag_Kategorie.
- **Kategorie_Slug**: Der eindeutige Kurzbezeichner einer Tag_Kategorie, der im JSON-Import/Export als Wert des `category`-Feldes verwendet wird (z.B. `technique`, `emotion`, `dynamics`).
- **Kategorie_Verwaltung**: Die Administrations-Oberfläche zum Erstellen, Bearbeiten und Löschen von Tag_Kategorien.
- **Kategorie_API**: Die REST-API-Endpunkte für CRUD-Operationen auf Tag_Kategorien.
- **Tag_Picker**: Die Toolbar und das Dropdown im Vocal-Tag-Editor, über die Tags eingefügt werden.
- **Autocomplete_Menü**: Das kontextuelle Auswahlmenü, das bei Eingabe von `{` im Editor erscheint.
- **Tag_Konfigurations_Import**: Der Prozess zum Importieren von Tag-Definitionen aus einer JSON-Datei, der nun auch das `category`-Feld verarbeitet.
- **Tag_Verwaltung**: Die bestehende Administrations-Oberfläche für Tag-Definitionen.

## Anforderungen

### Anforderung 1: Datenmodell für Tag-Kategorien

**User Story:** Als Administrator möchte ich Tag-Kategorien als eigenständige Entitäten definieren können, damit ich Vocal-Tags thematisch gruppieren kann.

#### Akzeptanzkriterien

1. THE Tag_Kategorie SHALL die Felder `id` (String, automatisch generiert), `title` (String, Anzeigename), `slug` (String, eindeutig) und `orderIndex` (Integer, Sortierreihenfolge) enthalten.
2. THE Tag_Kategorie SHALL das Feld `slug` als eindeutigen Identifier verwenden, sodass keine zwei Tag_Kategorien denselben `slug`-Wert besitzen.
3. THE Tag_Kategorie SHALL das Feld `orderIndex` zur Bestimmung der Sortierreihenfolge in der Kategorie_Verwaltung und im Tag_Picker verwenden.
4. THE Tag_Definition SHALL ein optionales Feld `categoryId` enthalten, das auf eine Tag_Kategorie verweist.
5. WHEN eine Tag_Kategorie gelöscht wird, THE Kategorie_API SHALL das Feld `categoryId` aller zugehörigen Tag_Definitionen auf `null` setzen, anstatt die Tag_Definitionen zu löschen.

### Anforderung 2: Kategorie-CRUD-API

**User Story:** Als Administrator möchte ich Tag-Kategorien erstellen, lesen, aktualisieren und löschen können, damit ich die Gruppierung der Vocal-Tags pflegen kann.

#### Akzeptanzkriterien

1. WHEN ein Administrator eine neue Tag_Kategorie über die Kategorie_API erstellt, THE Kategorie_API SHALL die Tag_Kategorie mit den Pflichtfeldern `title` und `slug` in der Datenbank persistieren.
2. WHEN ein Administrator eine Tag_Kategorie über die Kategorie_API aktualisiert, THE Kategorie_API SHALL die geänderten Felder (`title`, `slug`, `orderIndex`) in der Datenbank persistieren.
3. WHEN ein Administrator eine Tag_Kategorie über die Kategorie_API löscht, THE Kategorie_API SHALL die Tag_Kategorie aus der Datenbank entfernen und das Feld `categoryId` aller zugehörigen Tag_Definitionen auf `null` setzen.
4. IF ein Administrator eine Tag_Kategorie mit einem bereits existierenden `slug`-Wert erstellt, THEN THE Kategorie_API SHALL den HTTP-Status 409 mit der Meldung "Eine Kategorie mit diesem Slug existiert bereits" zurückgeben.
5. IF ein Administrator eine Tag_Kategorie ohne das Pflichtfeld `title` oder `slug` erstellt, THEN THE Kategorie_API SHALL den HTTP-Status 400 mit einer Fehlermeldung zurückgeben, die das fehlende Feld benennt.
6. THE Kategorie_API SHALL nur authentifizierte Anfragen von Nutzern mit der Rolle ADMIN verarbeiten und bei fehlender Berechtigung den HTTP-Status 403 zurückgeben.
7. WHEN die Kategorie_API alle Tag_Kategorien abruft, THE Kategorie_API SHALL die Ergebnisse aufsteigend nach `orderIndex` sortiert zurückgeben.

### Anforderung 3: Kategorie-Verwaltungsoberfläche

**User Story:** Als Administrator möchte ich eine übersichtliche Oberfläche zur Verwaltung der Tag-Kategorien haben, damit ich Kategorien komfortabel anlegen, bearbeiten und löschen kann.

#### Akzeptanzkriterien

1. THE Kategorie_Verwaltung SHALL alle existierenden Tag_Kategorien in einer Liste anzeigen, sortiert nach `orderIndex`.
2. THE Kategorie_Verwaltung SHALL für jede Tag_Kategorie den Titel, den Slug und die Anzahl der zugeordneten Tag_Definitionen anzeigen.
3. THE Kategorie_Verwaltung SHALL Inline-Editing für die Felder `title` und `orderIndex` ermöglichen.
4. THE Kategorie_Verwaltung SHALL einen Erstellungs-Dialog zum Anlegen neuer Tag_Kategorien mit den Feldern `title` und `slug` bereitstellen.
5. WHEN ein Administrator eine Tag_Kategorie löscht, der noch Tag_Definitionen zugeordnet sind, THE Kategorie_Verwaltung SHALL einen Bestätigungsdialog mit der Anzahl betroffener Tag_Definitionen anzeigen und darauf hinweisen, dass diese Tags keiner Kategorie mehr zugeordnet werden.
6. THE Kategorie_Verwaltung SHALL ein `aria-label`-Attribut an jedem Listeneintrag mit dem Kategorie-Titel bereitstellen.

### Anforderung 4: Kategorie-Zuordnung in der Tag-Verwaltung

**User Story:** Als Administrator möchte ich in der bestehenden Tag-Verwaltung jedem Tag eine Kategorie zuweisen können, damit die Gruppierung direkt bei der Tag-Pflege erfolgt.

#### Akzeptanzkriterien

1. THE Tag_Verwaltung SHALL für jede Tag_Definition ein Dropdown-Feld zur Auswahl einer Tag_Kategorie anzeigen.
2. THE Tag_Verwaltung SHALL die Option "Keine Kategorie" im Dropdown bereitstellen, um eine Tag_Definition keiner Kategorie zuzuordnen.
3. WHEN ein Administrator eine Tag_Kategorie im Dropdown auswählt, THE Tag_Verwaltung SHALL die Zuordnung über die Tag_API persistieren.
4. THE Tag_Verwaltung SHALL die zugeordnete Kategorie als lesbaren Titel in der Tag-Liste anzeigen.

### Anforderung 5: Erweiterung des JSON-Import-Formats

**User Story:** Als Administrator möchte ich Tag-Definitionen mit Kategorie-Zuordnung importieren können, damit ich das Setup inklusive Kategorien auf andere Instanzen übertragen kann.

#### Akzeptanzkriterien

1. THE Tag_Konfigurations_Import SHALL das optionale Feld `category` (String, Kategorie_Slug) im JSON-Import-Format akzeptieren.
2. WHEN eine importierte Tag_Definition ein `category`-Feld enthält, dessen Wert einem existierenden Kategorie_Slug entspricht, THE Tag_Konfigurations_Import SHALL die Tag_Definition dieser Tag_Kategorie zuordnen.
3. WHEN eine importierte Tag_Definition ein `category`-Feld enthält, dessen Wert keinem existierenden Kategorie_Slug entspricht, THE Tag_Konfigurations_Import SHALL automatisch eine neue Tag_Kategorie erstellen, wobei der Slug als Titel übernommen wird.
4. WHEN eine importierte Tag_Definition kein `category`-Feld enthält, THE Tag_Konfigurations_Import SHALL die Tag_Definition ohne Kategorie-Zuordnung importieren.
5. THE Tag_Konfigurations_Import SHALL das `category`-Feld als optionalen String validieren und bei einem ungültigen Typ (z.B. Zahl oder Objekt) einen Validierungsfehler zurückgeben.

### Anforderung 6: Erweiterung des JSON-Export-Formats

**User Story:** Als Administrator möchte ich Tag-Definitionen inklusive Kategorie-Zuordnung exportieren können, damit die Kategorie-Information beim Transfer erhalten bleibt.

#### Akzeptanzkriterien

1. WHEN ein Administrator den Konfigurations-Export auslöst, THE Tag_Verwaltung SHALL für jede Tag_Definition mit zugeordneter Tag_Kategorie das Feld `category` mit dem Kategorie_Slug in die JSON-Datei aufnehmen.
2. WHEN eine Tag_Definition keiner Tag_Kategorie zugeordnet ist, THE Tag_Verwaltung SHALL das Feld `category` in der JSON-Datei weglassen.
3. FÜR ALLE Tag_Definitionen mit Kategorie-Zuordnung SHALL das Ergebnis von Exportieren, dann Importieren eine äquivalente Kategorie-Zuordnung erzeugen (Round-Trip-Eigenschaft).

### Anforderung 7: Kategoriebasierte Gruppierung im Tag-Picker

**User Story:** Als Nutzer möchte ich die Vocal-Tags im Editor nach Kategorien gruppiert sehen, damit ich die gewünschte Gesangstechnik schneller finden kann.

#### Akzeptanzkriterien

1. THE Tag_Picker SHALL die Tag_Definitionen im Dropdown nach Tag_Kategorien gruppiert anzeigen, wobei jede Gruppe durch den Kategorie-Titel als Überschrift getrennt wird.
2. THE Tag_Picker SHALL die Kategorie-Gruppen nach dem `orderIndex` der Tag_Kategorie sortieren.
3. THE Tag_Picker SHALL Tag_Definitionen ohne Kategorie-Zuordnung in einer separaten Gruppe am Ende des Dropdowns anzeigen.
4. THE Tag_Picker SHALL die Top-5-Direkt-Buttons weiterhin unabhängig von der Kategorie-Zuordnung nach `indexNr` anzeigen.

### Anforderung 8: Kategoriebasierte Gruppierung im Autocomplete-Menü

**User Story:** Als Nutzer möchte ich beim Tippen von `{` die Tags nach Kategorien gruppiert sehen, damit ich die gewünschte Technik schneller auswählen kann.

#### Akzeptanzkriterien

1. WHEN ein Nutzer das Zeichen `{` im Vocal_Tag_Editor tippt, THE Autocomplete_Menü SHALL die verfügbaren Tag_Definitionen nach Tag_Kategorien gruppiert anzeigen, wobei jede Gruppe durch den Kategorie-Titel als Überschrift getrennt wird.
2. WHEN ein Nutzer nach dem `{` weitere Zeichen tippt, THE Autocomplete_Menü SHALL die gefilterte Liste weiterhin nach Kategorien gruppiert anzeigen, wobei leere Kategorien ausgeblendet werden.
3. THE Autocomplete_Menü SHALL Tag_Definitionen ohne Kategorie-Zuordnung in einer separaten Gruppe am Ende anzeigen.
4. THE Autocomplete_Menü SHALL die Kategorie-Überschriften visuell von den Tag-Einträgen unterscheiden und als nicht-auswählbare Elemente darstellen.
