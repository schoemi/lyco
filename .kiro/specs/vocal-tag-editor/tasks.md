# Implementierungsplan: Vocal Tag Editor

## Übersicht

Schrittweise Implementierung des Vocal Tag Editors: Prisma-Datenmodell für Tag-Definitionen, CRUD-API-Routen, ChordPro-Parser/Serializer, TipTap Custom Node Extension, Editor-Toolbar mit Autocomplete, Read-Only-Ansichten (Kompakt/Detail), Admin-Verwaltungsoberfläche, Live-Vorschau und Import/Export. Jeder Schritt baut auf dem vorherigen auf.

## Tasks

- [x] 1. Datenmodell und Typen vorbereiten
  - [x] 1.1 Prisma-Schema um TagDefinition-Modell erweitern
    - Neues Modell `TagDefinition` in `prisma/schema.prisma` anlegen mit Feldern: `id` (cuid), `tag` (String, unique), `label` (String), `icon` (String), `color` (String), `indexNr` (Int)
    - Prisma-Migration ausführen (`npx prisma migrate dev --name add-tag-definition`)
    - Prisma-Client neu generieren
    - _Anforderungen: 1.1, 1.2, 1.3_

  - [x] 1.2 TypeScript-Typen für Vocal-Tag-Feature erstellen
    - Datei `src/types/vocal-tag.ts` anlegen mit Interfaces: `TagDefinitionData`, `CreateTagDefinitionInput`, `UpdateTagDefinitionInput`, `ChordProTag`, `ChordProParseResult`
    - _Anforderungen: 1.1, 4.1, 4.4_

- [x] 2. Tag-CRUD-API implementieren
  - [x] 2.1 Tag-Service erstellen
    - Datei `src/lib/services/tag-definition-service.ts` anlegen
    - Funktionen: `getAllTagDefinitions()`, `createTagDefinition()`, `updateTagDefinition()`, `deleteTagDefinition()`, `countSongsUsingTag()`
    - Sortierung nach `indexNr` aufsteigend bei `getAllTagDefinitions()`
    - Eindeutigkeitsprüfung für `tag`-Feld bei Create
    - Lösch-Warnung mit Anzahl betroffener Songs implementieren (Regex-Suche in Zeilen-Texten nach `{tag:`)
    - _Anforderungen: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_

  - [x] 2.2 API-Route für Tag-Definitionen erstellen (GET, POST)
    - Datei `src/app/api/tag-definitions/route.ts` anlegen
    - `GET`: Alle Tag-Definitionen sortiert nach `indexNr` zurückgeben (authentifiziert)
    - `POST`: Neue Tag-Definition erstellen (nur ADMIN), Validierung aller Pflichtfelder, HTTP 409 bei Duplikat, HTTP 400 bei fehlenden Feldern, HTTP 403 bei fehlender Berechtigung
    - _Anforderungen: 1.4, 2.1, 2.5, 2.6, 2.7_

  - [x] 2.3 API-Route für einzelne Tag-Definition erstellen (PUT, DELETE)
    - Datei `src/app/api/tag-definitions/[id]/route.ts` anlegen
    - `PUT`: Tag-Definition aktualisieren (nur ADMIN)
    - `DELETE`: Tag-Definition löschen (nur ADMIN), Warnung mit Anzahl betroffener Songs zurückgeben
    - _Anforderungen: 1.4, 2.2, 2.3, 2.4_

  - [x] 2.4 Unit-Tests für Tag-Service
    - Datei `__tests__/vocal-tag/tag-definition-service.test.ts`
    - Testen: CRUD-Operationen, Eindeutigkeitsprüfung, Sortierung, Lösch-Warnung
    - _Anforderungen: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.5 Unit-Tests für Tag-API-Routen
    - Datei `__tests__/vocal-tag/tag-definition-api.test.ts`
    - Testen: Auth-Check, Admin-Berechtigung, Validierung, Duplikat-Erkennung, Fehler-Responses
    - _Anforderungen: 1.4, 2.5, 2.6, 2.7_

  - [x] 2.6 Property-Test: Tag-Eindeutigkeit
    - **Property 1: Tag-Kürzel-Eindeutigkeit**
    - Datei `__tests__/vocal-tag/tag-uniqueness.property.test.ts`
    - Für jedes Paar von Tag-Definitionen mit gleichem `tag`-Wert: zweite Erstellung liefert HTTP 409
    - **Validiert: Anforderungen 1.2, 2.5**

  - [x] 2.7 Property-Test: Admin-Zugriffskontrolle
    - **Property 2: Nur ADMIN-Rolle kann Tag-Definitionen mutieren**
    - Datei `__tests__/vocal-tag/tag-admin-access.property.test.ts`
    - Für jede Anfrage mit Rolle USER an POST/PUT/DELETE: HTTP 403
    - **Validiert: Anforderungen 1.4**

- [x] 3. Checkpoint – Datenmodell und API prüfen
  - Sicherstellen, dass alle Tests bestehen, den Nutzer bei Fragen ansprechen.

- [x] 4. ChordPro-Parser und Serializer implementieren
  - [x] 4.1 ChordPro-Parser erstellen
    - Datei `src/lib/vocal-tag/chordpro-parser.ts` anlegen
    - Funktion `parseChordPro(rawText: string, knownTags: string[]): ChordProParseResult` implementieren
    - Regex-basiertes Parsing des Musters `{tag: zusatztext}`
    - Unbekannte Tags mit Warn-Attribut parsen
    - Tags ohne Zusatztext (`{tag:}`) mit leerem Zusatztext parsen
    - Fehlerbehandlung für ungültige Syntax (nicht geschlossene Klammern) mit Positionsangabe
    - _Anforderungen: 4.1, 4.2, 4.3, 4.6_

  - [x] 4.2 ChordPro-Serializer erstellen
    - Datei `src/lib/vocal-tag/chordpro-serializer.ts` anlegen
    - Funktion `serializeChordPro(nodes: ChordProNode[]): string` implementieren
    - Serialisierung in Format `{tag: zusatztext}`, bei leerem Zusatztext `{tag:}`
    - _Anforderungen: 4.4, 13.1, 13.3, 13.4_

  - [x] 4.3 Property-Test: Round-Trip-Konsistenz
    - **Property 3: Parse-Serialize Round-Trip**
    - Datei `__tests__/vocal-tag/chordpro-roundtrip.property.test.ts`
    - Für jeden gültigen ChordPro-Rohtext: `parse(serialize(parse(text)))` ergibt äquivalentes Ergebnis zu `parse(text)`
    - **Validiert: Anforderungen 4.5**

  - [x] 4.4 Property-Test: Ungültige Syntax erzeugt Fehler mit Position
    - **Property 4: Ungültige Syntax liefert Fehler mit Positionsangabe**
    - Datei `__tests__/vocal-tag/chordpro-error-position.property.test.ts`
    - Für jeden Text mit nicht geschlossenen Klammern: Fehler enthält Positionsangabe
    - **Validiert: Anforderungen 4.6**

  - [x] 4.5 Unit-Tests für Parser und Serializer
    - Datei `__tests__/vocal-tag/chordpro-parser.test.ts`
    - Testen: gültige Tags, unbekannte Tags, leerer Zusatztext, ungültige Syntax, verschachtelte Klammern
    - _Anforderungen: 4.1, 4.2, 4.3, 4.4, 4.6_

- [x] 5. TipTap ChordPro-Node Extension implementieren
  - [x] 5.1 ChordPro-Node Extension erstellen
    - Datei `src/lib/vocal-tag/chordpro-node-extension.ts` anlegen
    - TipTap Inline-Node Extension mit Attributen `tag`, `zusatztext`, `unknown` (Boolean)
    - `parseHTML` und `renderHTML` Methoden implementieren
    - Node als Inline-Element rendern (unterbricht Textfluss nicht)
    - `aria-label` mit Tag-Label und Zusatztext setzen
    - _Anforderungen: 5.1, 5.6_

  - [x] 5.2 Inline-Badge-Komponente erstellen
    - Datei `src/components/vocal-tag/inline-badge.tsx` anlegen
    - NodeViewWrapper-basierte Komponente für die visuelle Darstellung
    - Icon in Tag-Farbe anzeigen, Zusatztext als Tooltip beim Hover
    - Klick öffnet Tag-Popover zur Bearbeitung des Zusatztexts
    - _Anforderungen: 5.2, 5.3, 5.4_

  - [x] 5.3 Tag-Popover-Komponente erstellen
    - Datei `src/components/vocal-tag/tag-popover.tsx` anlegen
    - Popover mit Textfeld zur Bearbeitung des Zusatztexts
    - Bestätigung aktualisiert den ChordPro-Node im Dokument
    - _Anforderungen: 5.4, 5.5_

- [x] 6. Editor-Toolbar implementieren
  - [x] 6.1 Vocal-Tag-Toolbar-Komponente erstellen
    - Datei `src/components/vocal-tag/vocal-tag-toolbar.tsx` anlegen
    - Top-5 Tags (nach `indexNr`) als Direkt-Buttons mit Icon und Label in Tag-Farbe
    - Dropdown "Weitere Techniken" für restliche Tags
    - Button-Klick fügt ChordPro-Tag an Cursor-Position oder vor Textauswahl ein
    - `aria-label` an jedem Button mit Tag-Label
    - _Anforderungen: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 6.2 Autocomplete-Menü implementieren
    - Datei `src/lib/vocal-tag/autocomplete-plugin.ts` anlegen (TipTap Suggestion Plugin)
    - Trigger bei Eingabe von `{`, Anzeige aller Tags mit Icon, Label und Kürzel
    - Filterung nach eingegebenem Text (Suche in `tag` und `label`)
    - Auswahl per Klick oder Enter fügt Tag ein und öffnet Tag-Popover
    - Escape schließt Menü ohne Einfügen
    - Sortierung nach `indexNr`, Navigation per Pfeiltasten
    - _Anforderungen: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 6.3 Keyboard-Shortcuts implementieren
    - In der ChordPro-Node Extension: Strg+1 bis Strg+9 (Cmd auf macOS) registrieren
    - Jede Kombination fügt den Tag an der entsprechenden Position (nach `indexNr`) ein
    - Keine Aktion wenn weniger als N Tags existieren
    - Bei markiertem Text: Tag vor der Auswahl einfügen
    - _Anforderungen: 8.1, 8.2, 8.3, 8.4_

- [x] 7. Checkpoint – Editor-Kernfunktionen prüfen
  - Sicherstellen, dass alle Tests bestehen, den Nutzer bei Fragen ansprechen.

- [x] 8. Read-Only-Ansichten implementieren
  - [x] 8.1 Kompakte Ansicht erstellen
    - Datei `src/components/vocal-tag/compact-view.tsx` anlegen
    - Songtext ohne ChordPro-Rohsyntax rendern
    - Nur Icons der Tag-Definitionen über den Textstellen anzeigen (in Tag-Farbe)
    - Zusatztext ignorieren, Textfluss nicht unterbrechen
    - Generisches Warn-Icon bei unbekannten Tags
    - _Anforderungen: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 8.2 Detail-Ansicht erstellen
    - Datei `src/components/vocal-tag/detail-view.tsx` anlegen
    - Songtext mit vergrößertem Zeilenabstand rendern
    - Icon über Wortbeginn positionieren, Zusatztext in kleinerer Schrift neben Icon in Tag-Farbe
    - Annotation-Layer über dem Text (CSS `::before` oder dedizierter Layer)
    - Textfluss nicht unterbrechen, keine ChordPro-Rohsyntax anzeigen
    - Generisches Warn-Icon und grauer Text bei unbekannten Tags
    - _Anforderungen: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 8.3 Ansichts-Toggle implementieren
    - Toggle-Button zwischen Kompakt- und Detail-Ansicht
    - Sofortige Umschaltung ohne Neuladen
    - Letzten Modus pro Song im LocalStorage speichern
    - _Anforderungen: 11.1, 11.2, 11.3_

  - [x] 8.4 Property-Test: Kompakte Ansicht zeigt keinen Zusatztext
    - **Property 5: Kompakte Ansicht unterdrückt Zusatztext**
    - Datei `__tests__/vocal-tag/compact-view-no-zusatztext.property.test.ts`
    - Für jeden ChordPro-Tag mit Zusatztext: Kompakte Ansicht enthält den Zusatztext nicht im gerenderten Output
    - **Validiert: Anforderungen 9.4**

  - [x] 8.5 Property-Test: Detail-Ansicht zeigt Icon und Zusatztext
    - **Property 6: Detail-Ansicht zeigt alle Annotationen**
    - Datei `__tests__/vocal-tag/detail-view-annotations.property.test.ts`
    - Für jeden ChordPro-Tag: Detail-Ansicht enthält sowohl Icon als auch Zusatztext
    - **Validiert: Anforderungen 10.2, 10.3**

- [x] 9. Live-Vorschau implementieren
  - [x] 9.1 Split-Screen-Vorschau-Komponente erstellen
    - Datei `src/components/vocal-tag/live-preview.tsx` anlegen
    - Split-Screen: links Editor, rechts Render-Vorschau (Kompakt oder Detail)
    - Echtzeit-Aktualisierung bei Editor-Änderungen
    - Toggle zwischen Kompakt/Detail im Vorschau-Bereich
    - Ein-/Ausschalt-Button, bei Deaktivierung Editor auf volle Breite
    - _Anforderungen: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 10. Admin-Verwaltungsoberfläche implementieren
  - [x] 10.1 Tag-Verwaltungsseite erstellen
    - Datei `src/app/(admin)/admin/vocal-tags/page.tsx` anlegen
    - Liste aller Tag-Definitionen sortiert nach `indexNr`
    - Anzeige: Icon in Farbe, Label, Tag-Kürzel, indexNr
    - Inline-Editing für `label`, `color`, `indexNr`
    - `aria-label` an jedem Listeneintrag
    - _Anforderungen: 3.1, 3.2, 3.3, 3.9_

  - [x] 10.2 Erstellungs-Dialog für neue Tags
    - Datei `src/components/admin/tag-create-dialog.tsx` anlegen
    - Dialog mit Feldern: `tag`, `label`, `icon`, `color`, `indexNr`
    - Icon-Picker mit Suchfeld und FontAwesome-v6-Vorschau
    - Color-Picker für Highlight-Farbe
    - _Anforderungen: 3.4, 3.5, 3.6_

  - [x] 10.3 Drag-and-Drop-Sortierung implementieren
    - Drag-and-Drop in der Tag-Liste zur Manipulation der `indexNr`
    - Automatische Aktualisierung der `indexNr`-Werte nach Sortierung
    - _Anforderungen: 3.7_

  - [x] 10.4 Lösch-Dialog mit Verwendungswarnung
    - Bestätigungsdialog beim Löschen eines Tags, der in Songs verwendet wird
    - Anzeige der Anzahl betroffener Songs
    - _Anforderungen: 3.8_

  - [x] 10.5 Unit-Tests für Tag-Verwaltungsseite
    - Datei `__tests__/vocal-tag/tag-verwaltung.test.ts`
    - Testen: Listendarstellung, Inline-Editing, Erstellungs-Dialog, Lösch-Dialog
    - _Anforderungen: 3.1, 3.2, 3.3, 3.4, 3.8_

- [x] 11. Checkpoint – Admin und Ansichten prüfen
  - Sicherstellen, dass alle Tests bestehen, den Nutzer bei Fragen ansprechen.

- [x] 12. Import/Export implementieren
  - [x] 12.1 ChordPro-Export implementieren
    - Export-Button in der Editor-Komponente
    - Serialisierung des Editor-Inhalts in ChordPro-Rohtext
    - Download als `.chopro`-Datei
    - _Anforderungen: 13.1, 13.2, 13.3, 13.4_

  - [x] 12.2 ChordPro-Import implementieren
    - Import-Button für `.chopro`-Dateien
    - Parsing und Laden in den Editor
    - Fehlermeldung mit Zeilennummer bei ungültiger Syntax
    - Unbekannte Tags als Warn-Nodes importieren
    - Bestätigungsdialog bei bestehendem Editor-Inhalt
    - _Anforderungen: 14.1, 14.2, 14.3, 14.4_

  - [x] 12.3 Tag-Konfigurations-Export/Import implementieren
    - Export aller Tag-Definitionen als JSON-Datei in der Admin-Verwaltung
    - Import von JSON-Datei mit Tag-Definitionen
    - Abfrage bei Duplikaten: bestehende überschreiben oder überspringen
    - Validierung des JSON-Formats mit Fehlermeldung
    - _Anforderungen: 15.1, 15.2, 15.3, 15.4_

  - [x] 12.4 Property-Test: Export-Import Round-Trip für Tag-Konfiguration
    - **Property 7: Tag-Konfigurations-Export-Import Round-Trip**
    - Datei `__tests__/vocal-tag/tag-config-roundtrip.property.test.ts`
    - Für jede Menge von Tag-Definitionen: Export → Import ergibt identische Definitionen
    - **Validiert: Anforderungen 15.1, 15.2**

- [x] 13. Integration und Verdrahtung
  - [x] 13.1 Vocal-Tag-Editor-Hauptkomponente erstellen
    - Datei `src/components/vocal-tag/vocal-tag-editor.tsx` anlegen
    - TipTap-Editor mit ChordPro-Node Extension, Toolbar, Autocomplete und Keyboard-Shortcuts zusammenführen
    - Tag-Definitionen per API laden und an alle Unterkomponenten weitergeben
    - _Anforderungen: 5.1, 6.1, 7.1, 8.1_

  - [x] 13.2 Editor in Song-Bearbeitungsseite integrieren
    - Bestehende Song-Edit-Seite um Vocal-Tag-Editor erweitern
    - Live-Vorschau optional einbinden
    - Ansichts-Toggle in der Song-Detailseite integrieren
    - _Anforderungen: 11.1, 12.1, 16.4_

  - [x] 13.3 Globale Kaskadierung sicherstellen
    - Tag-Definitionen werden zur Renderzeit geladen (nicht im Songtext gespeichert)
    - Änderungen an Farbe/Icon wirken sich sofort auf alle Ansichten aus
    - _Anforderungen: 16.1, 16.2, 16.3, 16.4_

- [x] 14. Abschluss-Checkpoint – Alle Tests bestehen
  - Sicherstellen, dass alle Tests bestehen, den Nutzer bei Fragen ansprechen.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften
- Unit-Tests validieren spezifische Beispiele und Edge-Cases
