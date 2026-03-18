# Anforderungsdokument: Vocal Tag Editor (ChordPro-basiert)

## Einleitung

Der Vocal Tag Editor ist ein spezialisierter Texteditor zur Annotation von Songtexten mit gesangstechnischen Anweisungen. Das System nutzt eine erweiterte ChordPro-Syntax (`{tag: zusatztext}`) und trennt strikt zwischen der technischen Definition eines Markups (Tag-Definition) und dem individuellen Inhalt (Zusatztext) im Songwriting-Prozess. Der Editor basiert auf TipTap (ProseMirror) und bietet zwei Anzeige-Modi (Kompakt und Detail), eine kontextuelle Toolbar, Autocomplete, Keyboard-Shortcuts sowie eine Live-Vorschau im Split-Screen. Die Tag-Definitionen werden zentral in der Administration verwaltet und wirken sich global auf alle Songs aus.

## Glossar

- **Tag_Definition**: Ein zentrales Konfigurationsobjekt, das eine Gesangstechnik beschreibt. Enthält die Felder `tag` (eindeutiges ChordPro-Kürzel), `label` (Anzeigename), `icon` (FontAwesome-v6-Klasse), `color` (Hex-Farbcode) und `indexNr` (Sortierreihenfolge).
- **ChordPro_Tag**: Ein Inline-Markup im Songtext im Format `{tag: zusatztext}`, wobei `tag` auf eine Tag_Definition verweist und `zusatztext` die individuelle Anweisung enthält.
- **Zusatztext**: Der freitextliche Inhalt innerhalb eines ChordPro_Tags, der die konkrete gesangstechnische Anweisung für eine bestimmte Textstelle beschreibt (z.B. "Luftig singen", "kräftig").
- **Vocal_Tag_Editor**: Die TipTap-basierte Editor-Komponente im Edit-Mode, die ChordPro_Tags als Inline-Badges visualisiert und deren Bearbeitung ermöglicht.
- **ChordPro_Node**: Die Custom TipTap Node Extension, die das Syntax-Muster `{tag: zusatztext}` erkennt, als Inline-Badge rendert und die Serialisierung zurück in ChordPro-Text unterstützt.
- **Inline_Badge**: Die visuelle Darstellung eines ChordPro_Tags im Editor als farbiges Badge mit Icon, basierend auf der zugehörigen Tag_Definition.
- **Tag_Popover**: Ein kleines Overlay, das beim Klicken auf ein bestehendes Inline_Badge erscheint und die Bearbeitung des Zusatztexts ermöglicht.
- **Editor_Toolbar**: Die Werkzeugleiste oberhalb des Editors mit Direkt-Buttons für die Top-5-Tags und einem Dropdown für weitere Tags.
- **Kompakte_Ansicht**: Der Read-Only-Anzeigemodus, der nur die Icons der Tag_Definitionen über den Textstellen anzeigt und den Zusatztext ignoriert.
- **Detail_Ansicht**: Der Read-Only-Anzeigemodus, der Icons und Zusatztext als Annotation-Layer über den Textstellen mit vergrößertem Zeilenabstand anzeigt.
- **Tag_Verwaltung**: Die Administrations-Oberfläche zum Erstellen, Bearbeiten, Sortieren und Löschen von Tag_Definitionen.
- **Autocomplete_Menü**: Das kontextuelle Auswahlmenü, das bei Eingabe von `{` im Editor erscheint und die verfügbaren Tag_Definitionen mit Label und Icon auflistet.
- **Live_Vorschau**: Die optionale Split-Screen-Ansicht mit dem Editor links und der Echtzeit-Render-Vorschau (Kompakt oder Detail) rechts.
- **ChordPro_Parser**: Das Modul, das ChordPro-Rohtext in TipTap-JSON-Nodes umwandelt.
- **ChordPro_Serializer**: Das Modul, das TipTap-JSON-Nodes zurück in ChordPro-Rohtext umwandelt.
- **Tag_API**: Die REST-API-Endpunkte für CRUD-Operationen auf Tag_Definitionen.
- **Song_Text**: Der Rohtext eines Songs, der ChordPro_Tags enthalten kann.

## Anforderungen

### Anforderung 1: Datenmodell für Tag-Definitionen

**User Story:** Als Administrator möchte ich Gesangstechniken als Tag-Definitionen zentral konfigurieren können, damit alle Nutzer im Editor auf ein einheitliches Set an Vocal-Tags zugreifen können.

#### Akzeptanzkriterien

1. THE Tag_Definition SHALL die Felder `tag` (String, eindeutig), `label` (String), `icon` (String, FontAwesome-v6-Klasse), `color` (String, Hex-Code) und `indexNr` (Integer) enthalten.
2. THE Tag_Definition SHALL das Feld `tag` als eindeutigen Identifier verwenden, sodass keine zwei Tag_Definitionen denselben `tag`-Wert besitzen.
3. THE Tag_Definition SHALL das Feld `indexNr` zur Bestimmung der Sortierreihenfolge in der Editor_Toolbar verwenden.
4. THE Tag_API SHALL nur authentifizierte Anfragen von Nutzern mit der Rolle ADMIN verarbeiten und bei fehlender Berechtigung den HTTP-Status 403 zurückgeben.

### Anforderung 2: Tag-CRUD-API

**User Story:** Als Administrator möchte ich Tag-Definitionen erstellen, lesen, aktualisieren und löschen können, damit ich die verfügbaren Gesangstechniken pflegen kann.

#### Akzeptanzkriterien

1. WHEN ein Administrator eine neue Tag_Definition über die Tag_API erstellt, THE Tag_API SHALL die Tag_Definition mit allen Pflichtfeldern (`tag`, `label`, `icon`, `color`, `indexNr`) in der Datenbank persistieren.
2. WHEN ein Administrator eine Tag_Definition über die Tag_API aktualisiert, THE Tag_API SHALL die geänderten Felder in der Datenbank persistieren.
3. WHEN ein Administrator eine Tag_Definition über die Tag_API löscht und der Tag in keinem Song_Text verwendet wird, THE Tag_API SHALL die Tag_Definition aus der Datenbank entfernen.
4. WHEN ein Administrator eine Tag_Definition über die Tag_API löscht und der Tag noch in mindestens einem Song_Text verwendet wird, THE Tag_API SHALL eine Warnung zurückgeben, die die Anzahl der betroffenen Songs enthält.
5. IF ein Administrator eine Tag_Definition mit einem bereits existierenden `tag`-Wert erstellt, THEN THE Tag_API SHALL den HTTP-Status 409 mit der Meldung "Ein Tag mit diesem Kürzel existiert bereits" zurückgeben.
6. IF ein Administrator eine Tag_Definition ohne eines der Pflichtfelder erstellt, THEN THE Tag_API SHALL den HTTP-Status 400 mit einer Fehlermeldung zurückgeben, die das fehlende Feld benennt.
7. WHEN die Tag_API alle Tag_Definitionen abruft, THE Tag_API SHALL die Ergebnisse aufsteigend nach `indexNr` sortiert zurückgeben.

### Anforderung 3: Tag-Verwaltungsoberfläche

**User Story:** Als Administrator möchte ich eine übersichtliche Oberfläche zur Verwaltung der Tag-Definitionen haben, damit ich Tags komfortabel anlegen, bearbeiten und sortieren kann.

#### Akzeptanzkriterien

1. THE Tag_Verwaltung SHALL alle existierenden Tag_Definitionen in einer Liste anzeigen, sortiert nach `indexNr`.
2. THE Tag_Verwaltung SHALL für jede Tag_Definition das Icon in der definierten Farbe, das Label, das Tag-Kürzel und die indexNr anzeigen.
3. THE Tag_Verwaltung SHALL Inline-Editing für die Felder `label`, `color` und `indexNr` ermöglichen.
4. THE Tag_Verwaltung SHALL einen Erstellungs-Dialog zum Anlegen neuer Tag_Definitionen bereitstellen.
5. THE Tag_Verwaltung SHALL einen Icon-Picker mit Suchfeld und Autocomplete bereitstellen, der die FontAwesome-v6-Bibliothek durchsucht und eine Vorschau des Icons anzeigt.
6. THE Tag_Verwaltung SHALL einen grafischen Color-Picker zur Auswahl der Highlight-Farbe bereitstellen.
7. THE Tag_Verwaltung SHALL Drag-and-Drop-Sortierung unterstützen, wobei die resultierende Reihenfolge die `indexNr`-Werte automatisch aktualisiert.
8. WHEN ein Administrator einen Tag löscht, der noch in Songs verwendet wird, THE Tag_Verwaltung SHALL einen Bestätigungsdialog mit der Anzahl betroffener Songs anzeigen.
9. THE Tag_Verwaltung SHALL ein `aria-label`-Attribut an jedem Listeneintrag mit dem Tag-Label und dem Kürzel bereitstellen.

### Anforderung 4: ChordPro-Parser und Serializer

**User Story:** Als Entwickler möchte ich einen zuverlässigen Parser und Serializer für die erweiterte ChordPro-Syntax haben, damit Songtexte korrekt zwischen Rohtext und TipTap-Nodes konvertiert werden.

#### Akzeptanzkriterien

1. WHEN ein gültiger ChordPro-Rohtext mit Tags im Format `{tag: zusatztext}` übergeben wird, THE ChordPro_Parser SHALL den Text in eine Sequenz von TipTap-JSON-Nodes umwandeln, wobei jeder ChordPro_Tag als ChordPro_Node mit den Attributen `tag` und `zusatztext` repräsentiert wird.
2. WHEN ein ChordPro-Rohtext einen Tag enthält, dessen `tag`-Wert keiner Tag_Definition entspricht, THE ChordPro_Parser SHALL den Tag als unbekannten ChordPro_Node mit einem Warn-Attribut parsen.
3. WHEN ein ChordPro-Rohtext ein Tag ohne Zusatztext enthält (Format `{tag:}`), THE ChordPro_Parser SHALL den Tag als ChordPro_Node mit leerem Zusatztext parsen.
4. THE ChordPro_Serializer SHALL TipTap-JSON-Nodes zurück in gültigen ChordPro-Rohtext im Format `{tag: zusatztext}` umwandeln.
5. FÜR ALLE gültigen ChordPro-Rohtexte SHALL das Ergebnis von Parsen, dann Serialisieren, dann erneutem Parsen ein äquivalentes Ergebnis zum ersten Parsen liefern (Round-Trip-Eigenschaft).
6. IF ein ungültiger ChordPro-Rohtext übergeben wird (z.B. nicht geschlossene geschweifte Klammern), THEN THE ChordPro_Parser SHALL einen beschreibenden Fehler zurückgeben, der die Position des Fehlers enthält.

### Anforderung 5: TipTap ChordPro-Node Extension

**User Story:** Als Nutzer möchte ich Vocal-Tags im Editor als farbige Inline-Badges sehen, damit ich die Gesangstechniken visuell im Textfluss erkennen kann.

#### Akzeptanzkriterien

1. THE ChordPro_Node SHALL als Inline-Node im TipTap-Editor gerendert werden, der den Textfluss nicht unterbricht.
2. THE Inline_Badge SHALL das Icon der zugehörigen Tag_Definition in der definierten Farbe anzeigen.
3. THE Inline_Badge SHALL den Zusatztext als Tooltip beim Hover anzeigen.
4. WHEN ein Nutzer auf ein Inline_Badge klickt, THE Vocal_Tag_Editor SHALL ein Tag_Popover öffnen, das die Bearbeitung des Zusatztexts ermöglicht.
5. WHEN ein Nutzer den Zusatztext im Tag_Popover ändert und bestätigt, THE Vocal_Tag_Editor SHALL den ChordPro_Node im Dokument mit dem neuen Zusatztext aktualisieren.
6. THE ChordPro_Node SHALL ein `aria-label`-Attribut mit dem Label der Tag_Definition und dem Zusatztext enthalten.

### Anforderung 6: Editor-Toolbar

**User Story:** Als Nutzer möchte ich häufig verwendete Vocal-Tags schnell über die Toolbar einfügen können, damit ich effizient annotieren kann.

#### Akzeptanzkriterien

1. THE Editor_Toolbar SHALL die ersten 5 Tag_Definitionen (sortiert nach `indexNr`) als Direkt-Buttons mit Icon und Label anzeigen.
2. THE Editor_Toolbar SHALL alle weiteren Tag_Definitionen in einem Dropdown-Menü mit dem Label "Weitere Techniken" auflisten.
3. WHEN ein Nutzer Text im Editor markiert und einen Toolbar-Button klickt, THE Vocal_Tag_Editor SHALL einen ChordPro_Tag mit dem gewählten Tag und leerem Zusatztext vor der Textauswahl einfügen.
4. WHEN ein Nutzer keinen Text markiert hat und einen Toolbar-Button klickt, THE Vocal_Tag_Editor SHALL einen ChordPro_Tag mit dem gewählten Tag und leerem Zusatztext an der aktuellen Cursor-Position einfügen.
5. THE Editor_Toolbar SHALL die Direkt-Buttons in der Farbe der jeweiligen Tag_Definition darstellen.
6. THE Editor_Toolbar SHALL für jeden Button ein `aria-label`-Attribut mit dem Label der Tag_Definition bereitstellen.

### Anforderung 7: Autocomplete bei Tag-Eingabe

**User Story:** Als Nutzer möchte ich beim Tippen von `{` ein Autocomplete-Menü mit den verfügbaren Tags sehen, damit ich Tags schnell und fehlerfrei einfügen kann.

#### Akzeptanzkriterien

1. WHEN ein Nutzer das Zeichen `{` im Vocal_Tag_Editor tippt, THE Autocomplete_Menü SHALL sich öffnen und alle verfügbaren Tag_Definitionen mit Icon, Label und Tag-Kürzel anzeigen.
2. WHEN ein Nutzer nach dem `{` weitere Zeichen tippt, THE Autocomplete_Menü SHALL die Liste der Tag_Definitionen nach dem eingegebenen Text filtern (Suche in `tag` und `label`).
3. WHEN ein Nutzer einen Eintrag im Autocomplete_Menü auswählt (per Klick oder Enter), THE Vocal_Tag_Editor SHALL einen ChordPro_Tag mit dem gewählten Tag und leerem Zusatztext einfügen und das Tag_Popover zur Eingabe des Zusatztexts öffnen.
4. WHEN ein Nutzer die Escape-Taste drückt, THE Autocomplete_Menü SHALL sich schließen, ohne einen Tag einzufügen.
5. THE Autocomplete_Menü SHALL die Einträge nach `indexNr` sortiert anzeigen.
6. THE Autocomplete_Menü SHALL per Pfeiltasten navigierbar sein.

### Anforderung 8: Keyboard-Shortcuts

**User Story:** Als Nutzer möchte ich die häufigsten Vocal-Tags per Tastenkombination einfügen können, damit ich beim Annotieren im Schreibfluss bleibe.

#### Akzeptanzkriterien

1. THE Vocal_Tag_Editor SHALL die Tastenkombinationen Strg+1 bis Strg+9 unterstützen, wobei jede Kombination den Tag mit der entsprechenden Position in der nach `indexNr` sortierten Tag-Liste einfügt.
2. WHEN ein Nutzer eine Tastenkombination Strg+N drückt (N = 1-9) und weniger als N Tag_Definitionen existieren, THE Vocal_Tag_Editor SHALL keine Aktion ausführen.
3. WHEN ein Nutzer eine Tastenkombination Strg+N drückt und Text markiert ist, THE Vocal_Tag_Editor SHALL den ChordPro_Tag vor der Textauswahl einfügen.
4. THE Vocal_Tag_Editor SHALL auf macOS die Cmd-Taste anstelle der Strg-Taste verwenden.

### Anforderung 9: Kompakte Ansicht (Read-Only)

**User Story:** Als Sänger möchte ich eine kompakte Ansicht der Gesangstechniken sehen, die nur Icons über den Textstellen anzeigt, damit ich beim Singen maximale Übersicht ohne visuelle Ablenkung habe.

#### Akzeptanzkriterien

1. THE Kompakte_Ansicht SHALL den Song_Text ohne ChordPro-Rohsyntax anzeigen.
2. THE Kompakte_Ansicht SHALL für jeden ChordPro_Tag ausschließlich das Icon der zugehörigen Tag_Definition über der entsprechenden Textstelle anzeigen.
3. THE Kompakte_Ansicht SHALL das Icon in der Farbe der zugehörigen Tag_Definition darstellen.
4. THE Kompakte_Ansicht SHALL den Zusatztext der ChordPro_Tags ignorieren und nicht anzeigen.
5. THE Kompakte_Ansicht SHALL den Textfluss des Song_Texts nicht unterbrechen.
6. WHEN ein ChordPro_Tag auf eine unbekannte Tag_Definition verweist, THE Kompakte_Ansicht SHALL ein generisches Warn-Icon anstelle des Tag-Icons anzeigen.

### Anforderung 10: Detail-Ansicht (Read-Only)

**User Story:** Als Sänger möchte ich eine Detailansicht sehen, die Icons und Zusatztext als Annotation-Layer über den Textstellen anzeigt, damit ich die konkreten Gesangsanweisungen beim Üben lesen kann.

#### Akzeptanzkriterien

1. THE Detail_Ansicht SHALL den Song_Text mit vergrößertem Zeilenabstand rendern, um Platz für den Annotation-Layer zu schaffen.
2. THE Detail_Ansicht SHALL für jeden ChordPro_Tag das Icon der Tag_Definition direkt über dem Wortbeginn der zugehörigen Textstelle positionieren.
3. THE Detail_Ansicht SHALL den Zusatztext in einer kleineren Schriftgröße neben dem Icon in der Farbe der Tag_Definition anzeigen.
4. THE Detail_Ansicht SHALL den Textfluss des Song_Texts nicht unterbrechen (Annotation-Layer über dem Text, nicht im Text).
5. THE Detail_Ansicht SHALL den Song_Text ohne ChordPro-Rohsyntax anzeigen.
6. WHEN ein ChordPro_Tag auf eine unbekannte Tag_Definition verweist, THE Detail_Ansicht SHALL ein generisches Warn-Icon und den Zusatztext in grauer Farbe anzeigen.

### Anforderung 11: Umschaltung zwischen Anzeige-Modi

**User Story:** Als Nutzer möchte ich zwischen Kompakt- und Detailansicht umschalten können, damit ich die für meine aktuelle Situation passende Darstellung wählen kann.

#### Akzeptanzkriterien

1. THE Vocal_Tag_Editor SHALL einen Toggle-Button bereitstellen, der zwischen Kompakte_Ansicht und Detail_Ansicht umschaltet.
2. WHEN ein Nutzer den Anzeige-Modus umschaltet, THE Vocal_Tag_Editor SHALL die Ansicht sofort ohne Neuladen der Seite aktualisieren.
3. THE Vocal_Tag_Editor SHALL den zuletzt gewählten Anzeige-Modus pro Song im Browser-LocalStorage speichern.

### Anforderung 12: Live-Vorschau im Split-Screen

**User Story:** Als Nutzer möchte ich beim Bearbeiten eine Echtzeit-Vorschau der gerenderten Ansicht sehen, damit ich das Ergebnis meiner Annotationen sofort überprüfen kann.

#### Akzeptanzkriterien

1. THE Live_Vorschau SHALL eine optionale Split-Screen-Ansicht bereitstellen, die links den Edit-Mode und rechts den Render-Mode anzeigt.
2. WHEN der Nutzer den Song_Text im Editor ändert, THE Live_Vorschau SHALL die Render-Ansicht in Echtzeit aktualisieren.
3. THE Live_Vorschau SHALL einen Toggle bereitstellen, um zwischen Kompakte_Ansicht und Detail_Ansicht im Vorschau-Bereich zu wechseln.
4. THE Live_Vorschau SHALL über einen Button ein- und ausschaltbar sein.
5. WHEN die Live_Vorschau deaktiviert wird, THE Vocal_Tag_Editor SHALL den Editor auf die volle Breite erweitern.

### Anforderung 13: ChordPro-Export

**User Story:** Als Nutzer möchte ich den annotierten Songtext als ChordPro-Datei exportieren können, damit ich die Daten in anderen ChordPro-kompatiblen Anwendungen verwenden kann.

#### Akzeptanzkriterien

1. WHEN ein Nutzer den Export auslöst, THE ChordPro_Serializer SHALL den aktuellen Editor-Inhalt in gültigen ChordPro-Rohtext umwandeln.
2. THE ChordPro_Serializer SHALL den exportierten Text als `.chopro`-Datei zum Download bereitstellen.
3. THE ChordPro_Serializer SHALL alle ChordPro_Tags im Format `{tag: zusatztext}` exportieren.
4. WHEN ein ChordPro_Tag einen leeren Zusatztext hat, THE ChordPro_Serializer SHALL den Tag im Format `{tag:}` exportieren.

### Anforderung 14: ChordPro-Import

**User Story:** Als Nutzer möchte ich eine ChordPro-Datei importieren können, damit ich bestehende annotierte Songtexte in den Editor laden kann.

#### Akzeptanzkriterien

1. WHEN ein Nutzer eine `.chopro`-Datei importiert, THE ChordPro_Parser SHALL den Dateiinhalt parsen und in den Vocal_Tag_Editor laden.
2. IF die importierte Datei ungültige ChordPro-Syntax enthält, THEN THE ChordPro_Parser SHALL eine Fehlermeldung mit der Zeilennummer und einer Beschreibung des Fehlers anzeigen.
3. WHEN die importierte Datei Tags enthält, die keiner existierenden Tag_Definition entsprechen, THE Vocal_Tag_Editor SHALL diese Tags als unbekannte ChordPro_Nodes mit Warn-Attribut importieren.
4. THE Vocal_Tag_Editor SHALL vor dem Import eine Bestätigung anfordern, falls der Editor bereits Inhalt enthält, um versehentliches Überschreiben zu verhindern.

### Anforderung 15: Tag-Konfigurations-Export und -Import

**User Story:** Als Administrator möchte ich die Tag-Konfiguration exportieren und importieren können, damit ich das Setup auf andere Instanzen übertragen kann.

#### Akzeptanzkriterien

1. WHEN ein Administrator den Konfigurations-Export auslöst, THE Tag_Verwaltung SHALL alle Tag_Definitionen als JSON-Datei zum Download bereitstellen.
2. WHEN ein Administrator eine JSON-Datei mit Tag_Definitionen importiert, THE Tag_Verwaltung SHALL die importierten Tag_Definitionen in der Datenbank anlegen.
3. IF die importierte JSON-Datei Tag_Definitionen mit bereits existierenden `tag`-Werten enthält, THEN THE Tag_Verwaltung SHALL den Nutzer fragen, ob bestehende Definitionen überschrieben werden sollen.
4. IF die importierte JSON-Datei ein ungültiges Format hat, THEN THE Tag_Verwaltung SHALL eine Fehlermeldung mit einer Beschreibung des Validierungsfehlers anzeigen.

### Anforderung 16: Globale Kaskadierung von Tag-Änderungen

**User Story:** Als Administrator möchte ich, dass Änderungen an Tag-Definitionen (Farbe, Icon) sich sofort in allen Songs widerspiegeln, damit die Darstellung konsistent bleibt.

#### Akzeptanzkriterien

1. WHEN ein Administrator die Farbe oder das Icon einer Tag_Definition ändert, THE Kompakte_Ansicht SHALL die aktualisierte Farbe und das aktualisierte Icon in allen Songs anzeigen, die diesen Tag verwenden.
2. WHEN ein Administrator die Farbe oder das Icon einer Tag_Definition ändert, THE Detail_Ansicht SHALL die aktualisierte Farbe und das aktualisierte Icon in allen Songs anzeigen, die diesen Tag verwenden.
3. WHEN ein Administrator die Farbe oder das Icon einer Tag_Definition ändert, THE Vocal_Tag_Editor SHALL die aktualisierten Inline_Badges in allen geöffneten Editor-Instanzen anzeigen.
4. THE Tag_Definition SHALL ausschließlich Darstellungsinformationen (Icon, Farbe, Label) enthalten, sodass der Song_Text nur das Tag-Kürzel und den Zusatztext speichert.
