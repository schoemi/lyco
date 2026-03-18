# Design-Dokument: Vocal Tag Editor (ChordPro-basiert)

## Übersicht

Der Vocal Tag Editor erweitert die bestehende Song-Bearbeitungsseite um einen spezialisierten Inline-Annotationseditor für Gesangstechniken. Das System nutzt eine erweiterte ChordPro-Syntax (`{tag: zusatztext}`) und basiert auf TipTap (ProseMirror) mit einer Custom Node Extension. Tag-Definitionen werden zentral in der Datenbank verwaltet (Prisma-Modell `TagDefinition`) und über REST-API-Endpunkte bereitgestellt. Die Darstellung erfolgt in drei Modi: Edit-Mode (Inline-Badges), Kompakte Ansicht (nur Icons) und Detail-Ansicht (Icons + Zusatztext als Annotation-Layer). Ein ChordPro-Parser/Serializer-Paar konvertiert zwischen Rohtext und TipTap-Nodes.

### Zentrale Design-Entscheidungen

1. **Neues Prisma-Modell `TagDefinition`** statt Erweiterung des bestehenden `Markup`-Modells – die ChordPro-Tags sind konzeptionell unabhängig von den bestehenden `MarkupTyp`-Enums und benötigen dynamische Konfiguration (CRUD durch Admins).
2. **Regex-basierter Parser** statt vollständigem PEG-Parser – die ChordPro-Syntax `{tag: zusatztext}` ist einfach genug für Regex-Matching, und die Komplexität eines Parser-Generators ist nicht gerechtfertigt.
3. **TipTap Inline-Node Extension** statt Mark – Tags sind eigenständige Inline-Elemente (nicht Textformatierung), die vor Textstellen eingefügt werden.
4. **Tag-Definitionen werden zur Renderzeit geladen** – der Song-Text speichert nur `{tag: zusatztext}`, Farbe/Icon kommen aus der TagDefinition-Tabelle. Änderungen an Definitionen kaskadieren sofort global.
5. **Bestehende Architektur-Patterns** werden beibehalten: Service-Layer in `src/lib/services/`, API-Routen in `src/app/api/`, Komponenten in `src/components/`, Typen in `src/types/`.

## Architektur

```mermaid
graph TD
    subgraph Frontend
        A[Song-Edit-Seite] --> B[VocalTagEditor]
        B --> C[TipTap Editor + ChordProNode Extension]
        B --> D[VocalTagToolbar]
        B --> E[AutocompletePlugin]
        B --> F[LivePreview]
        F --> G[CompactView]
        F --> H[DetailView]
        I[Song-Detail-Seite] --> J[ViewToggle]
        J --> G
        J --> H
    end

    subgraph Admin
        K[TagVerwaltungsSeite] --> L[TagCreateDialog]
        K --> M[TagList mit DnD]
        K --> N[TagDeleteDialog]
    end

    subgraph API-Routen
        O["GET /api/tag-definitions"] --> P[TagDefinitionService]
        Q["POST /api/tag-definitions"] --> P
        R["PUT /api/tag-definitions/[id]"] --> P
        S["DELETE /api/tag-definitions/[id]"] --> P
    end

    subgraph Parser-Layer
        T[ChordProParser] --> U[ChordProNode[]]
        V[ChordProSerializer] --> W[ChordPro-Rohtext]
    end

    subgraph Datenbank
        X[TagDefinition-Modell]
        Y[Zeile.text mit ChordPro-Tags]
    end

    P --> X
    C --> T
    C --> V
    G --> T
    H --> T
```

### Datenfluss

1. **Tag-Verwaltung**: Admin erstellt/bearbeitet Tags über `/admin/vocal-tags` → API-Route → `TagDefinitionService` → Prisma → `TagDefinition`-Tabelle.
2. **Editor**: Beim Öffnen eines Songs werden Tag-Definitionen per `GET /api/tag-definitions` geladen. Der `ChordProParser` wandelt `Zeile.text` in TipTap-Nodes um. Beim Speichern serialisiert der `ChordProSerializer` zurück in Rohtext.
3. **Read-Only-Ansichten**: `CompactView` und `DetailView` laden Tag-Definitionen und parsen den Rohtext. Kompakt zeigt nur Icons, Detail zeigt Icons + Zusatztext als Annotation-Layer.
4. **Import/Export**: ChordPro-Export serialisiert Editor-Inhalt als `.chopro`-Datei. Import parst `.chopro`-Dateien und lädt sie in den Editor. Tag-Konfigurations-Export/Import nutzt JSON.

## Komponenten und Schnittstellen

### 1. TagDefinitionService

**Datei:** `src/lib/services/tag-definition-service.ts`

```typescript
export async function getAllTagDefinitions(): Promise<TagDefinitionData[]>
export async function createTagDefinition(input: CreateTagDefinitionInput): Promise<TagDefinitionData>
export async function updateTagDefinition(id: string, input: UpdateTagDefinitionInput): Promise<TagDefinitionData>
export async function deleteTagDefinition(id: string): Promise<{ deleted: boolean; affectedSongs?: number }>
export async function countSongsUsingTag(tag: string): Promise<number>
```

- `getAllTagDefinitions()` gibt alle Definitionen sortiert nach `indexNr` ASC zurück
- `createTagDefinition()` prüft Eindeutigkeit des `tag`-Felds, wirft bei Duplikat
- `deleteTagDefinition()` prüft Verwendung in `Zeile.text` per Regex-Suche nach `{tag:`
- `countSongsUsingTag()` zählt distinct Songs, deren Zeilen den Tag enthalten

### 2. API-Routen

**`src/app/api/tag-definitions/route.ts`** (GET, POST)
**`src/app/api/tag-definitions/[id]/route.ts`** (PUT, DELETE)

- Alle Mutation-Endpunkte (POST, PUT, DELETE) erfordern `role === 'ADMIN'`, sonst HTTP 403
- GET erfordert Authentifizierung (beliebige Rolle)
- POST validiert Pflichtfelder (`tag`, `label`, `icon`, `color`, `indexNr`), HTTP 400 bei fehlenden Feldern
- POST gibt HTTP 409 bei doppeltem `tag`-Wert zurück
- DELETE gibt `{ deleted: true, affectedSongs: number }` zurück

### 3. ChordProParser

**Datei:** `src/lib/vocal-tag/chordpro-parser.ts`

```typescript
interface ChordProNode {
  type: 'text' | 'chordpro-tag';
  content?: string;        // für text-Nodes
  tag?: string;            // für chordpro-tag-Nodes
  zusatztext?: string;     // für chordpro-tag-Nodes
  unknown?: boolean;       // true wenn tag nicht in knownTags
}

interface ChordProParseResult {
  nodes: ChordProNode[];
  warnings: string[];      // unbekannte Tags
  errors: ChordProParseError[];
}

interface ChordProParseError {
  message: string;
  position: number;
  line?: number;
}

export function parseChordPro(rawText: string, knownTags: string[]): ChordProParseResult
```

- Regex-Pattern: `\{([a-zA-Z][a-zA-Z0-9]*):([^}]*)\}` für `{tag: zusatztext}`
- Unbekannte Tags (nicht in `knownTags`) werden mit `unknown: true` geparst
- Nicht geschlossene `{` ohne passendes `}` erzeugen einen `ChordProParseError` mit Position
- Tags ohne Zusatztext (`{tag:}`) werden mit `zusatztext: ''` geparst

### 4. ChordProSerializer

**Datei:** `src/lib/vocal-tag/chordpro-serializer.ts`

```typescript
export function serializeChordPro(nodes: ChordProNode[]): string
```

- Text-Nodes werden direkt ausgegeben
- ChordPro-Tag-Nodes werden als `{tag: zusatztext}` serialisiert
- Bei leerem Zusatztext: `{tag:}`

### 5. TipTap ChordProNode Extension

**Datei:** `src/lib/vocal-tag/chordpro-node-extension.ts`

- Inline-Node mit Attributen: `tag` (string), `zusatztext` (string), `unknown` (boolean)
- `parseHTML`: Erkennt `<span data-chordpro-tag="...">` Elemente
- `renderHTML`: Rendert als `<span>` mit `data-chordpro-tag`, `data-zusatztext`, `aria-label`
- NodeView: Nutzt `InlineBadge`-Komponente für visuelle Darstellung
- Keyboard-Shortcuts: `Mod-1` bis `Mod-9` für Schnelleinfügung

### 6. InlineBadge-Komponente

**Datei:** `src/components/vocal-tag/inline-badge.tsx`

- NodeViewWrapper-basierte Komponente
- Zeigt Icon in Tag-Farbe, Zusatztext als Tooltip
- Klick öffnet TagPopover

### 7. TagPopover-Komponente

**Datei:** `src/components/vocal-tag/tag-popover.tsx`

- Textfeld zur Bearbeitung des Zusatztexts
- Bestätigung aktualisiert den Node im Dokument

### 8. VocalTagToolbar

**Datei:** `src/components/vocal-tag/vocal-tag-toolbar.tsx`

- Top-5 Tags (nach `indexNr`) als Direkt-Buttons mit Icon und Label in Tag-Farbe
- Dropdown "Weitere Techniken" für restliche Tags
- Jeder Button hat `aria-label` mit Tag-Label
- Button-Klick fügt ChordPro-Tag an Cursor-Position oder vor Textauswahl ein

### 9. AutocompletePlugin

**Datei:** `src/lib/vocal-tag/autocomplete-plugin.ts`

- TipTap Suggestion Plugin, Trigger bei `{`
- Zeigt alle Tags mit Icon, Label und Kürzel
- Filtert nach eingegebenem Text (Suche in `tag` und `label`)
- Sortierung nach `indexNr`, Navigation per Pfeiltasten
- Auswahl fügt Tag ein und öffnet TagPopover
- Escape schließt ohne Einfügen

### 10. CompactView

**Datei:** `src/components/vocal-tag/compact-view.tsx`

- Parst Rohtext, rendert ohne ChordPro-Syntax
- Zeigt nur Icons über Textstellen in Tag-Farbe
- Ignoriert Zusatztext
- Generisches Warn-Icon bei unbekannten Tags

### 11. DetailView

**Datei:** `src/components/vocal-tag/detail-view.tsx`

- Parst Rohtext, rendert mit vergrößertem Zeilenabstand
- Icon über Wortbeginn, Zusatztext in kleinerer Schrift neben Icon in Tag-Farbe
- Annotation-Layer über dem Text (CSS `::before` oder dedizierter Layer)
- Generisches Warn-Icon und grauer Text bei unbekannten Tags

### 12. LivePreview

**Datei:** `src/components/vocal-tag/live-preview.tsx`

- Split-Screen: links Editor, rechts Render-Vorschau
- Toggle zwischen Kompakt/Detail im Vorschau-Bereich
- Ein-/Ausschalt-Button, bei Deaktivierung Editor auf volle Breite

### 13. TagVerwaltungsSeite

**Datei:** `src/app/(admin)/admin/vocal-tags/page.tsx`

- Liste aller Tags sortiert nach `indexNr`
- Inline-Editing für `label`, `color`, `indexNr`
- Erstellungs-Dialog, Icon-Picker, Color-Picker
- Drag-and-Drop-Sortierung
- Lösch-Dialog mit Verwendungswarnung
- `aria-label` an jedem Listeneintrag

## Datenmodelle

### Prisma-Schema-Erweiterung

```prisma
model TagDefinition {
  id       String @id @default(cuid())
  tag      String @unique
  label    String
  icon     String
  color    String
  indexNr  Int

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("tag_definitions")
}
```

**Migration:** `npx prisma migrate dev --name add-tag-definition`

### TypeScript-Typen

**Datei:** `src/types/vocal-tag.ts`

```typescript
export interface TagDefinitionData {
  id: string;
  tag: string;
  label: string;
  icon: string;
  color: string;
  indexNr: number;
}

export interface CreateTagDefinitionInput {
  tag: string;
  label: string;
  icon: string;
  color: string;
  indexNr: number;
}

export interface UpdateTagDefinitionInput {
  label?: string;
  icon?: string;
  color?: string;
  indexNr?: number;
}

export interface ChordProTag {
  tag: string;
  zusatztext: string;
  unknown?: boolean;
}

export interface ChordProParseResult {
  nodes: ChordProNode[];
  warnings: string[];
  errors: ChordProParseError[];
}

export interface ChordProNode {
  type: 'text' | 'chordpro-tag';
  content?: string;
  tag?: string;
  zusatztext?: string;
  unknown?: boolean;
}

export interface ChordProParseError {
  message: string;
  position: number;
  line?: number;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Tag-Kürzel-Eindeutigkeit

*For any* two attempts to create TagDefinitions with the same `tag`-Wert, the second creation shall fail with HTTP 409, and the database shall contain exactly one TagDefinition with that `tag`-Wert.

**Validates: Requirements 1.2, 2.5**

### Property 2: Nur ADMIN-Rolle kann Tag-Definitionen mutieren

*For any* HTTP request to a mutation endpoint (POST, PUT, DELETE on `/api/tag-definitions`) with a user role other than ADMIN, the API shall return HTTP 403 and the database state shall remain unchanged.

**Validates: Requirements 1.4**

### Property 3: Parse-Serialize Round-Trip

*For any* valid ChordPro raw text, `parse(serialize(parse(text)))` shall produce a result equivalent to `parse(text)`. This ensures the parser and serializer are consistent inverses.

**Validates: Requirements 4.5**

### Property 4: Ungültige Syntax liefert Fehler mit Positionsangabe

*For any* text containing unclosed curly braces (a `{` without a matching `}`), the parser shall return at least one error object whose `position` field points to the location of the unclosed brace.

**Validates: Requirements 4.6**

### Property 5: Kompakte Ansicht unterdrückt Zusatztext

*For any* ChordPro tag with non-empty Zusatztext, the compact view's rendered output shall not contain the Zusatztext string.

**Validates: Requirements 9.4**

### Property 6: Detail-Ansicht zeigt alle Annotationen

*For any* ChordPro tag in a song text, the detail view's rendered output shall contain both the tag's icon and the Zusatztext.

**Validates: Requirements 10.2, 10.3**

### Property 7: Tag-Konfigurations-Export-Import Round-Trip

*For any* set of TagDefinitions, exporting them as JSON and then importing the resulting JSON shall produce an identical set of TagDefinitions (same `tag`, `label`, `icon`, `color`, `indexNr` values).

**Validates: Requirements 15.1, 15.2**

## Error Handling

### API-Fehler

| Szenario | HTTP-Status | Response |
|---|---|---|
| Nicht authentifiziert | 401 | `{ error: "Nicht authentifiziert" }` |
| Keine ADMIN-Rolle bei Mutation | 403 | `{ error: "Keine Berechtigung" }` |
| Pflichtfeld fehlt bei POST | 400 | `{ error: "Feld '{field}' ist erforderlich" }` |
| Doppelter `tag`-Wert | 409 | `{ error: "Ein Tag mit diesem Kürzel existiert bereits" }` |
| TagDefinition nicht gefunden | 404 | `{ error: "Tag-Definition nicht gefunden" }` |
| Löschen eines verwendeten Tags | 200 | `{ deleted: true, affectedSongs: number, warning: "..." }` |

### Parser-Fehler

- Nicht geschlossene `{`: `ChordProParseError` mit `message`, `position` und optionaler `line`
- Unbekannte Tags: Kein Fehler, sondern `unknown: true` am Node und Eintrag in `warnings`-Array
- Leerer Zusatztext (`{tag:}`): Kein Fehler, `zusatztext: ''`

### Import-Fehler

- Ungültige ChordPro-Syntax: Fehlermeldung mit Zeilennummer
- Ungültiges JSON-Format bei Tag-Konfigurations-Import: Validierungsfehler mit Beschreibung
- Bestätigungsdialog bei bestehendem Editor-Inhalt vor Überschreiben

## Testing Strategy

### Property-Based Testing

- **Library:** `fast-check` (bereits im Projekt als devDependency)
- **Konfiguration:** Minimum 100 Iterationen pro Property-Test
- **Tag-Format:** `Feature: vocal-tag-editor, Property {number}: {property_text}`
- Jede Correctness Property wird durch genau einen Property-Based Test validiert

| Property | Testdatei | Beschreibung |
|---|---|---|
| Property 1 | `__tests__/vocal-tag/tag-uniqueness.property.test.ts` | Generiert zufällige Tag-Kürzel, prüft Duplikat-Ablehnung |
| Property 2 | `__tests__/vocal-tag/tag-admin-access.property.test.ts` | Generiert zufällige Rollen/Endpunkte, prüft 403 für Nicht-Admins |
| Property 3 | `__tests__/vocal-tag/chordpro-roundtrip.property.test.ts` | Generiert zufällige ChordPro-Texte, prüft Round-Trip-Konsistenz |
| Property 4 | `__tests__/vocal-tag/chordpro-error-position.property.test.ts` | Generiert Texte mit nicht geschlossenen Klammern, prüft Fehlerposition |
| Property 5 | `__tests__/vocal-tag/compact-view-no-zusatztext.property.test.ts` | Generiert Tags mit Zusatztext, prüft Abwesenheit in Kompaktansicht |
| Property 6 | `__tests__/vocal-tag/detail-view-annotations.property.test.ts` | Generiert Tags, prüft Anwesenheit von Icon und Zusatztext in Detailansicht |
| Property 7 | `__tests__/vocal-tag/tag-config-roundtrip.property.test.ts` | Generiert Tag-Definitionen, prüft Export-Import-Identität |

### Unit-Tests

Unit-Tests ergänzen die Property-Tests mit spezifischen Beispielen und Edge-Cases:

| Testdatei | Fokus |
|---|---|
| `__tests__/vocal-tag/tag-definition-service.test.ts` | CRUD-Operationen, Sortierung, Lösch-Warnung |
| `__tests__/vocal-tag/tag-definition-api.test.ts` | Auth-Check, Validierung, Fehler-Responses |
| `__tests__/vocal-tag/chordpro-parser.test.ts` | Gültige Tags, unbekannte Tags, leerer Zusatztext, verschachtelte Klammern |
| `__tests__/vocal-tag/tag-verwaltung.test.ts` | Listendarstellung, Inline-Editing, Dialoge |

### Testabdeckung

- **Property-Tests:** Universelle Korrektheitseigenschaften über alle gültigen Eingaben
- **Unit-Tests:** Spezifische Beispiele, Edge-Cases (leerer Zusatztext, unbekannte Tags, nicht geschlossene Klammern), Integrationspunkte (API-Auth, Service-Layer)
- **Edge-Cases in Generatoren:** Unbekannte Tags, leerer Zusatztext, macOS-Shortcuts, Tags mit Sonderzeichen werden durch die fast-check-Generatoren abgedeckt
