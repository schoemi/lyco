# Implementierungsplan: Vocal-Tag-Kategorien

## Übersicht

Die Vocal-Tag-Kategorien erweitern das bestehende Tag-System um ein Kategorie-Modell (`TagKategorie`), das Tag-Definitionen in thematische Gruppen organisiert. Die Implementierung umfasst: Prisma-Schema-Erweiterung mit neuem `TagKategorie`-Modell und 1:n-Beziehung zu `TagDefinition`, TypeScript-Typen, Service-Layer für Kategorie-CRUD, REST-API-Endpunkte unter `/api/tag-categories`, eine Admin-Verwaltungsseite, Kategorie-Dropdown in der Tag-Verwaltung, Erweiterung des JSON-Import/Export-Formats um ein `category`-Feld (Slug-basiert), eine Gruppierungs-Hilfsfunktion sowie die Integration in den Tag-Picker und das Autocomplete-Menü des Editors.

## Tasks

- [x] 1. Datenmodell und Typen definieren
  - [x] 1.1 Prisma-Schema erweitern
    - Neues Modell `TagKategorie` mit Feldern `id` (cuid), `title` (String), `slug` (String, unique), `orderIndex` (Int, default 0), `createdAt`, `updatedAt` anlegen
    - `@@map("tag_kategorien")` für den Tabellennamen
    - 1:n-Relation `tagDefinitions TagDefinition[]` einrichten
    - Bestehendes Modell `TagDefinition` um optionales Feld `categoryId String?` erweitern
    - Relation `category TagKategorie? @relation(fields: [categoryId], references: [id], onDelete: SetNull)` hinzufügen
    - Prisma-Migration ausführen
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 TypeScript-Typen in `src/types/vocal-tag.ts` erweitern
    - `TagKategorieData` Interface mit `id`, `title`, `slug`, `orderIndex`, optionalem `_count`
    - `CreateTagKategorieInput` Interface mit `title`, `slug`, optionalem `orderIndex`
    - `UpdateTagKategorieInput` Interface mit optionalen `title`, `slug`, `orderIndex`
    - `TagDefinitionData` um `categoryId: string | null` und optionales `category?: TagKategorieData` erweitern
    - `CreateTagDefinitionInput` um optionales `categoryId?: string | null` erweitern
    - `UpdateTagDefinitionInput` um optionales `categoryId?: string | null` erweitern
    - `TagConfigImportItem` um optionales `category?: string` erweitern
    - `GruppierteTagDefinitionen` Interface mit `kategorie: TagKategorieData | null` und `tags: TagDefinitionData[]`
    - _Requirements: 1.1, 1.4_

- [x] 2. Service-Layer und Kategorie-API implementieren
  - [x] 2.1 Tag-Kategorie-Service in `src/lib/services/tag-kategorie-service.ts` erstellen
    - `getAllTagKategorien(): Promise<TagKategorieData[]>` — Alle Kategorien sortiert nach `orderIndex`, inkl. `_count` für `tagDefinitions`
    - `createTagKategorie(input: CreateTagKategorieInput): Promise<TagKategorieData>` — Erstellen mit Slug-Eindeutigkeitsprüfung
    - `updateTagKategorie(id: string, input: UpdateTagKategorieInput): Promise<TagKategorieData>` — Aktualisieren mit Slug-Eindeutigkeitsprüfung
    - `deleteTagKategorie(id: string): Promise<{ deleted: boolean; affectedTags: number }>` — Löschen, Prisma `onDelete: SetNull` setzt `categoryId` automatisch auf `null`
    - `findTagKategorieBySlug(slug: string): Promise<TagKategorieData | null>` — Suche nach Slug
    - Bestehende Patterns aus `tag-definition-service.ts` folgen
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7_

  - [x] 2.2 Tag-Definition-Service in `src/lib/services/tag-definition-service.ts` erweitern
    - `getAllTagDefinitions()` um `categoryId` und optionales `category`-Objekt via Prisma `include` erweitern
    - `createTagDefinition()` um optionales `categoryId`-Feld erweitern
    - `updateTagDefinition()` um optionales `categoryId`-Feld erweitern (inkl. `null` zum Entfernen)
    - _Requirements: 1.4, 4.3_

  - [x] 2.3 Kategorie-API-Route in `src/app/api/tag-categories/route.ts` erstellen
    - `GET` — Authentifizierung prüfen (USER+), alle Kategorien abrufen, Status 200
    - `POST` — Authentifizierung + ADMIN-Rolle prüfen, Pflichtfelder `title` und `slug` validieren, Kategorie erstellen, Status 201
    - Slug-Konflikt → Status 409 mit Meldung "Eine Kategorie mit diesem Slug existiert bereits"
    - Fehlendes Pflichtfeld → Status 400 mit Meldung "Feld '{feldname}' ist erforderlich"
    - Bestehende Auth-Patterns aus `src/app/api/tag-definitions/route.ts` folgen
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7_

  - [x] 2.4 Kategorie-Detail-API-Route in `src/app/api/tag-categories/[id]/route.ts` erstellen
    - `PUT` — Authentifizierung + ADMIN-Rolle prüfen, Kategorie aktualisieren, Status 200
    - `DELETE` — Authentifizierung + ADMIN-Rolle prüfen, Kategorie löschen (Tags → `categoryId: null`), Status 200
    - Kategorie nicht gefunden → Status 404
    - _Requirements: 2.2, 2.3, 2.6_

  - [x] 2.5 Tag-Definitions-API in `src/app/api/tag-definitions/route.ts` erweitern
    - `GET`-Response enthält `categoryId` und optional `category`-Objekt
    - `POST` akzeptiert optionales `categoryId`-Feld
    - _Requirements: 1.4, 4.3_

  - [x] 2.6 Tag-Definitions-Detail-API in `src/app/api/tag-definitions/[id]/route.ts` erweitern
    - `PUT` akzeptiert optionales `categoryId`-Feld (inkl. `null` zum Entfernen)
    - _Requirements: 4.3_

  - [x] 2.7 Property-Test: Slug-Eindeutigkeit (Eigenschaft 1)
    - **Eigenschaft 1: Slug-Eindeutigkeit**
    - **Validiert: Anforderungen 1.2, 2.4**
    - Test-Datei: `__tests__/vocal-tag/kategorie-slug-eindeutigkeit.property.test.ts`

  - [x] 2.8 Property-Test: Sortierung nach orderIndex (Eigenschaft 2)
    - **Eigenschaft 2: Sortierung nach orderIndex**
    - **Validiert: Anforderungen 1.3, 2.7**
    - Test-Datei: `__tests__/vocal-tag/kategorie-sortierung.property.test.ts`

  - [x] 2.9 Property-Test: Kaskadierendes Nullsetzen beim Löschen (Eigenschaft 3)
    - **Eigenschaft 3: Kaskadierendes Nullsetzen beim Löschen**
    - **Validiert: Anforderungen 1.5, 2.3**
    - Test-Datei: `__tests__/vocal-tag/kategorie-loeschen-kaskade.property.test.ts`

  - [x] 2.10 Property-Test: Kategorie-CRUD-Persistenz Round-Trip (Eigenschaft 4)
    - **Eigenschaft 4: Kategorie-CRUD-Persistenz (Round-Trip)**
    - **Validiert: Anforderungen 2.1, 2.2**
    - Test-Datei: `__tests__/vocal-tag/kategorie-crud-roundtrip.property.test.ts`

  - [x] 2.11 Property-Test: Zugriffskontrolle (Eigenschaft 5)
    - **Eigenschaft 5: Zugriffskontrolle**
    - **Validiert: Anforderung 2.6**
    - Test-Datei: `__tests__/vocal-tag/kategorie-zugriffskontrolle.property.test.ts`

  - [x] 2.12 Unit-Tests für Kategorie-API und Service
    - API-Endpunkte: GET, POST, PUT, DELETE, Validierung, Fehlerbehandlung
    - Service: getAllTagKategorien, createTagKategorie, updateTagKategorie, deleteTagKategorie
    - Test-Datei: `__tests__/vocal-tag/kategorie-api-validation.test.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 3. Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Import/Export um Kategorie-Feld erweitern
  - [x] 4.1 Validierungsfunktion in `src/lib/vocal-tag/tag-config-export.ts` erweitern
    - `validateTagConfigJson()` um Validierung des optionalen `category`-Feldes erweitern
    - Nicht-String-Werte (Zahl, Objekt, Array, Boolean) → Validierungsfehler: "Eintrag {n}: Feld 'category' muss ein String sein."
    - String-Wert oder fehlendes Feld → Validierung bezüglich `category` erfolgreich
    - `TagConfigImportItem` um optionales `category`-Feld erweitern
    - _Requirements: 5.1, 5.5_

  - [x] 4.2 Import-Logik für Kategorie-Auflösung implementieren
    - Neue Funktion `resolveImportCategories()` in `src/lib/vocal-tag/tag-config-export.ts` oder separater Datei
    - Wenn `category`-Feld einem existierenden Kategorie-Slug entspricht → Tag dieser Kategorie zuordnen
    - Wenn `category`-Feld einem nicht-existierenden Slug entspricht → Neue Kategorie automatisch erstellen (Slug als Titel)
    - Wenn kein `category`-Feld → `categoryId` bleibt `null`
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 4.3 Export-Serialisierung in `src/lib/vocal-tag/tag-config-export.ts` erweitern
    - `serializeTagConfig()` um `category`-Feld erweitern
    - Tag mit zugeordneter Kategorie → `category`-Feld mit Kategorie-Slug im JSON
    - Tag ohne Kategorie → kein `category`-Feld im JSON
    - _Requirements: 6.1, 6.2_

  - [x] 4.4 Property-Test: Import-Validierung des category-Feldes (Eigenschaft 6)
    - **Eigenschaft 6: Import-Validierung des category-Feldes**
    - **Validiert: Anforderungen 5.1, 5.5**
    - Test-Datei: `__tests__/vocal-tag/import-category-validierung.property.test.ts`

  - [x] 4.5 Property-Test: Import-Kategorie-Auflösung (Eigenschaft 7)
    - **Eigenschaft 7: Import-Kategorie-Auflösung**
    - **Validiert: Anforderungen 5.2, 5.3, 5.4**
    - Test-Datei: `__tests__/vocal-tag/import-kategorie-aufloesung.property.test.ts`

  - [x] 4.6 Property-Test: Export-Serialisierung (Eigenschaft 8)
    - **Eigenschaft 8: Export-Serialisierung**
    - **Validiert: Anforderungen 6.1, 6.2**
    - Test-Datei: `__tests__/vocal-tag/export-serialisierung.property.test.ts`

  - [x] 4.7 Property-Test: Export/Import-Round-Trip (Eigenschaft 9)
    - **Eigenschaft 9: Export/Import-Round-Trip**
    - **Validiert: Anforderung 6.3**
    - Test-Datei: `__tests__/vocal-tag/export-import-roundtrip.property.test.ts`

- [x] 5. Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Gruppierungs-Hilfsfunktion implementieren
  - [x] 6.1 Gruppierungsfunktion in `src/lib/vocal-tag/tag-gruppierung.ts` erstellen
    - `gruppiereTagsNachKategorie(tags: TagDefinitionData[], kategorien: TagKategorieData[]): GruppierteTagDefinitionen[]`
    - Kategorien nach `orderIndex` sortieren
    - Tags ohne Kategorie in einer Gruppe am Ende (mit `kategorie: null`)
    - Jede Tag-Definition erscheint in genau einer Gruppe
    - Gesamtanzahl der Tags über alle Gruppen entspricht der Eingabe-Anzahl
    - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.3_

  - [x] 6.2 Filterfunktion für gruppierte Tags erstellen
    - Neue Funktion `filtereGruppierteTagDefinitionen(gruppen: GruppierteTagDefinitionen[], suchbegriff: string): GruppierteTagDefinitionen[]`
    - Filtert Tags nach Suchbegriff (in `tag` und `label`)
    - Entfernt leere Gruppen nach Filterung
    - _Requirements: 8.2_

  - [x] 6.3 Property-Test: Gruppierungsfunktion (Eigenschaft 10)
    - **Eigenschaft 10: Gruppierungsfunktion**
    - **Validiert: Anforderungen 7.1, 7.2, 7.3, 8.1, 8.3**
    - Test-Datei: `__tests__/vocal-tag/tag-gruppierung.property.test.ts`
    - Prüft: Jede Tag-Definition in genau einer Gruppe, Gruppen nach orderIndex sortiert, Tags ohne Kategorie am Ende, Gesamtanzahl stimmt

  - [x] 6.4 Property-Test: Filterung blendet leere Gruppen aus (Eigenschaft 11)
    - **Eigenschaft 11: Filterung blendet leere Gruppen aus**
    - **Validiert: Anforderung 8.2**
    - Test-Datei: `__tests__/vocal-tag/tag-gruppierung-filter.property.test.ts`
    - Prüft: Nach Filterung keine leere Gruppe vorhanden

- [x] 7. Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Admin-UI: Kategorie-Verwaltungsseite erstellen
  - [x] 8.1 Kategorie-Verwaltungsseite in `src/app/(admin)/admin/vocal-tag-categories/page.tsx` erstellen
    - Alle Kategorien in einer Liste anzeigen, sortiert nach `orderIndex`
    - Für jede Kategorie: Titel, Slug und Anzahl zugeordneter Tag-Definitionen anzeigen
    - Inline-Editing für `title` und `orderIndex` ermöglichen
    - `aria-label`-Attribut an jedem Listeneintrag mit dem Kategorie-Titel
    - Fehlerbehandlung: Fehlermeldung bei API-Fehlern, Retry-Möglichkeit
    - Bestehende Patterns aus `src/app/(admin)/admin/vocal-tags/page.tsx` folgen
    - _Requirements: 3.1, 3.2, 3.3, 3.6_

  - [x] 8.2 Erstellungs-Dialog (`KategorieCreateDialog`) implementieren
    - Dialog zum Anlegen neuer Kategorien mit Feldern `title` und `slug`
    - Slug-Konflikt-Fehlermeldung im Dialog anzeigen
    - _Requirements: 3.4_

  - [x] 8.3 Lösch-Dialog (`KategorieDeleteDialog`) implementieren
    - Bestätigungsdialog mit Anzahl betroffener Tag-Definitionen
    - Hinweis, dass betroffene Tags keiner Kategorie mehr zugeordnet werden
    - _Requirements: 3.5_

  - [x] 8.4 Unit-Tests für Kategorie-Verwaltungsseite
    - Liste, Inline-Editing, Erstellungs-Dialog, Lösch-Dialog
    - Test-Datei: `__tests__/vocal-tag/kategorie-verwaltung.test.ts`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 9. Admin-UI: Kategorie-Dropdown in Tag-Verwaltung
  - [x] 9.1 Kategorie-Dropdown in `src/app/(admin)/admin/vocal-tags/page.tsx` integrieren
    - Für jede Tag-Definition ein Dropdown-Feld zur Auswahl einer Kategorie anzeigen
    - Option "Keine Kategorie" im Dropdown bereitstellen
    - Auswahl persistiert über die Tag-API (`PUT /api/tag-definitions/[id]` mit `categoryId`)
    - Zugeordnete Kategorie als lesbaren Titel in der Tag-Liste anzeigen
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 9.2 Unit-Tests für Kategorie-Dropdown
    - Dropdown-Rendering, Auswahl, Persistierung
    - Test-Datei: `__tests__/vocal-tag/kategorie-dropdown.test.ts`
    - _Requirements: 4.1, 4.2, 4.4_

- [x] 10. Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Editor-Integration: Tag-Picker und Autocomplete gruppieren
  - [x] 11.1 VocalTagToolbar erweitern für gruppiertes Dropdown
    - Tag-Definitionen im Dropdown nach Kategorien gruppiert anzeigen
    - Kategorie-Titel als Überschrift pro Gruppe
    - Gruppen nach `orderIndex` sortiert
    - Tags ohne Kategorie in separater Gruppe am Ende
    - Top-5-Direkt-Buttons weiterhin unabhängig von Kategorie nach `indexNr` anzeigen
    - Gruppierungsfunktion `gruppiereTagsNachKategorie()` verwenden
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 11.2 AutocompletePlugin und SuggestionDropdown erweitern
    - `AutocompletePlugin` in `src/lib/vocal-tag/autocomplete-plugin.ts` erweitern: Kategorien als zusätzliche Option übergeben, Items gruppiert zurückgeben
    - `SuggestionDropdown` in `src/components/vocal-tag/suggestion-dropdown.tsx` erweitern: Kategorie-Überschriften als nicht-auswählbare Elemente rendern
    - Filterung blendet leere Kategorien aus (Filterfunktion `filtereGruppierteTagDefinitionen()` verwenden)
    - Tags ohne Kategorie in separater Gruppe am Ende
    - Kategorie-Überschriften visuell von Tag-Einträgen unterscheiden
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 11.3 Unit-Tests für Tag-Picker-Gruppierung
    - Top-5 unabhängig, Kategorie-Überschriften, Filterung
    - Test-Datei: `__tests__/vocal-tag/tag-picker-gruppierung.test.ts`
    - _Requirements: 7.4, 8.4_

- [x] 12. Abschluss-Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Tasks mit `*` markiert sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für die Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften aus dem Design-Dokument
- Unit-Tests validieren spezifische Beispiele und Randfälle
- Deutsche Namenskonventionen werden für Komponenten- und Variablennamen verwendet, passend zur bestehenden Codebasis
- Der Service-Layer folgt dem bestehenden Muster aus `src/lib/services/tag-definition-service.ts`
- Die API-Routen folgen dem bestehenden Muster aus `src/app/api/tag-definitions/route.ts`
- Die Admin-Seite folgt dem bestehenden Muster aus `src/app/(admin)/admin/vocal-tags/page.tsx`
- Das Projekt verwendet `fast-check` mit `vitest` für Property-Based Tests
- Slug wird als instanzübergreifender Transfer-Identifier im JSON-Import/Export verwendet
- Beim Löschen einer Kategorie werden Tags nicht gelöscht, sondern deren `categoryId` auf `null` gesetzt (Prisma `onDelete: SetNull`)
