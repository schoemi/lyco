# Cover-URL-Bearbeitung Bugfix Design

## Overview

Die Song-Detailseite (`/songs/[id]`) bietet keine Möglichkeit, das Cover-Bild eines Songs zu setzen oder zu ändern. Obwohl das Datenmodell ein `coverUrl`-Feld besitzt und ein Upload-Endpunkt existiert, fehlt die UI-Komponente vollständig. Der Fix fügt eine `CoverManager`-Komponente hinzu (analog zum bestehenden `AudioQuellenManager`), erweitert den `UpdateSongInput`-Typ um `coverUrl` und passt die `updateSong`-Service-Funktion an.

## Glossary

- **Bug_Condition (C)**: Der Zustand, dass auf der Song-Detailseite keine UI zum Setzen/Ändern der coverUrl existiert
- **Property (P)**: Die CoverManager-Komponente ist sichtbar und ermöglicht URL-Eingabe, Datei-Upload, Vorschau und Entfernen des Covers
- **Preservation**: Bestehende Song-Bearbeitungsfelder (Titel, Künstler, Sprache, Tags), der Upload-Endpunkt, der Genius-Import und die Song-Karten-Anzeige bleiben unverändert
- **CoverManager**: Neue React-Komponente in `src/components/songs/cover-manager.tsx`, die Cover-Verwaltung auf der Detailseite bereitstellt
- **UpdateSongInput**: TypeScript-Interface in `src/types/song.ts`, das die erlaubten Felder für Song-Updates definiert
- **updateSong**: Service-Funktion in `src/lib/services/song-service.ts`, die Song-Updates in der Datenbank persistiert

## Bug Details

### Bug Condition

Der Bug tritt auf, wenn ein Nutzer auf der Song-Detailseite die coverUrl setzen, ändern oder entfernen möchte. Es existiert kein UI-Element dafür. Zusätzlich ignoriert die `updateSong`-Funktion das `coverUrl`-Feld, da es nicht im `UpdateSongInput`-Typ enthalten ist und nicht in `updateData` übernommen wird.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type SongDetailPageInteraction
  OUTPUT: boolean

  RETURN input.action IN ["setCoverUrl", "uploadCoverImage", "removeCover"]
         AND input.page = "SongDetailPage"
         AND coverManagerComponent NOT rendered
END FUNCTION
```

### Examples

- Nutzer öffnet Song-Detailseite → Kein Cover-Verwaltungsbereich sichtbar (erwartet: CoverManager-Komponente wird angezeigt)
- Nutzer möchte Cover-URL `https://example.com/cover.jpg` eingeben → Kein Eingabefeld vorhanden (erwartet: URL-Eingabefeld mit Speichern-Button)
- Nutzer möchte ein lokales Bild als Cover hochladen → Kein Upload-Button auf der Detailseite (erwartet: Datei-Upload-Bereich analog zu AudioQuellenManager)
- Nutzer sendet PUT `/api/songs/[id]` mit `{ coverUrl: "https://example.com/cover.jpg" }` → coverUrl wird ignoriert (erwartet: coverUrl wird am Song persistiert)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Song-Bearbeitungsformular (SongEditForm) speichert Titel, Künstler, Sprache und Emotions-Tags weiterhin korrekt
- POST `/api/songs/[id]/cover/upload` Endpunkt funktioniert weiterhin unverändert
- Genius-Import setzt coverUrl weiterhin automatisch über `importSong`
- Song-Karten im Dashboard zeigen das Cover-Bild weiterhin als Hintergrund an

**Scope:**
Alle Interaktionen, die NICHT die Cover-Verwaltung betreffen, bleiben vollständig unberührt. Dies umfasst:
- Bearbeitung von Titel, Künstler, Sprache, Emotions-Tags
- Audio-Quellen-Verwaltung
- Strophen-Bearbeitung und Lernmodi
- Alle bestehenden API-Endpunkte (außer der Erweiterung von PUT `/api/songs/[id]`)

## Hypothesized Root Cause

Based on the bug analysis, the issues are:

1. **Fehlende UI-Komponente**: Es existiert keine `CoverManager`-Komponente. Die Song-Detailseite (`page.tsx`) rendert keinen Bereich zur Cover-Verwaltung. Der `AudioQuellenManager` zeigt das Pattern, aber ein analoges Pendant für Covers fehlt.

2. **Unvollständiger UpdateSongInput-Typ**: Das Interface `UpdateSongInput` in `src/types/song.ts` enthält nur `titel`, `kuenstler`, `sprache` und `emotionsTags` – kein `coverUrl`-Feld. Dadurch kann die PUT-Route das Feld nicht typsicher entgegennehmen.

3. **updateSong ignoriert coverUrl**: Die `updateSong`-Funktion in `src/lib/services/song-service.ts` baut `updateData` nur aus den vier bekannten Feldern auf. Selbst wenn `coverUrl` im Request-Body mitgesendet wird, wird es nicht in das Prisma-Update übernommen.

4. **Keine Integration in die Detailseite**: Die `page.tsx` bindet keinen Cover-Verwaltungsbereich ein. Es fehlt sowohl der Import als auch das Rendering einer entsprechenden Komponente.

## Correctness Properties

Property 1: Bug Condition - Cover-URL über PUT-Endpunkt aktualisierbar

_For any_ input where a valid `coverUrl` (string or null) is sent via PUT `/api/songs/[id]`, the fixed `updateSong` function SHALL persist the `coverUrl` value on the song record and return the updated song.

**Validates: Requirements 2.2, 2.4**

Property 2: Preservation - Bestehende Song-Felder unverändert

_For any_ input where the PUT `/api/songs/[id]` request does NOT include a `coverUrl` field, the fixed `updateSong` function SHALL produce the same result as the original function, preserving the existing behavior for `titel`, `kuenstler`, `sprache`, and `emotionsTags` updates.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/types/song.ts`

**Type**: `UpdateSongInput`

**Specific Changes**:
1. **coverUrl-Feld hinzufügen**: `coverUrl?: string | null` zum `UpdateSongInput`-Interface hinzufügen, damit die PUT-Route das Feld typsicher akzeptiert.

---

**File**: `src/lib/services/song-service.ts`

**Function**: `updateSong`

**Specific Changes**:
2. **coverUrl in updateData aufnehmen**: In der `updateSong`-Funktion die Zeile `if (data.coverUrl !== undefined) updateData.coverUrl = data.coverUrl;` ergänzen, analog zu den bestehenden Feldern.

---

**File**: `src/components/songs/cover-manager.tsx`

**Component**: `CoverManager` (neu)

**Specific Changes**:
3. **CoverManager-Komponente erstellen**: Neue Client-Komponente analog zum `AudioQuellenManager`-Pattern mit:
   - Toggle zwischen "URL eingeben" und "Datei hochladen" (wie bei AudioQuellenManager)
   - URL-Eingabefeld mit Speichern-Button (ruft PUT `/api/songs/[id]` mit `{ coverUrl }` auf)
   - Datei-Upload-Bereich (ruft POST `/api/songs/[id]/cover/upload` auf, akzeptiert JPEG/PNG/WebP, max 5 MB)
   - Vorschau des aktuellen Cover-Bildes (wenn coverUrl gesetzt)
   - "Entfernen"-Button (setzt coverUrl auf null via PUT)
   - Fehler- und Ladezustände
   - Deutsche Labels konsistent mit dem Rest der App

---

**File**: `src/app/(main)/songs/[id]/page.tsx`

**Component**: `SongDetailPage`

**Specific Changes**:
4. **CoverManager importieren und einbinden**: Import der neuen Komponente und Rendering auf der Detailseite, platziert vor dem Audio-Quellen-Bereich. Props: `songId`, `coverUrl`, `onCoverChanged` (ruft `refreshSong` auf, analog zu `onQuellenChanged`).

5. **Cover-Vorschau im Header**: Optional eine kleine Cover-Vorschau im Song-Header-Bereich anzeigen, wenn eine coverUrl gesetzt ist.

## Testing Strategy

### Validation Approach

Die Teststrategie folgt einem zweiphasigen Ansatz: Zuerst Gegenbeispiele auf dem unfixierten Code aufdecken, dann den Fix verifizieren und bestehende Funktionalität bewahren.

### Exploratory Bug Condition Checking

**Goal**: Gegenbeispiele aufdecken, die den Bug BEFORE der Implementierung demonstrieren. Root-Cause-Analyse bestätigen oder widerlegen.

**Test Plan**: Tests schreiben, die prüfen, ob `updateSong` das `coverUrl`-Feld akzeptiert und persistiert. Auf dem unfixierten Code ausführen, um Fehler zu beobachten.

**Test Cases**:
1. **UpdateSongInput-Typ-Test**: Prüfen, ob `UpdateSongInput` ein `coverUrl`-Feld hat (wird auf unfixiertem Code fehlschlagen)
2. **updateSong coverUrl-Test**: `updateSong` mit `{ coverUrl: "https://example.com/cover.jpg" }` aufrufen und prüfen, ob die coverUrl persistiert wird (wird auf unfixiertem Code fehlschlagen)
3. **PUT-Route coverUrl-Test**: PUT-Request mit coverUrl-Feld senden und prüfen, ob die Antwort die aktualisierte coverUrl enthält (wird auf unfixiertem Code fehlschlagen)
4. **coverUrl auf null setzen**: `updateSong` mit `{ coverUrl: null }` aufrufen und prüfen, ob die coverUrl entfernt wird (wird auf unfixiertem Code fehlschlagen)

**Expected Counterexamples**:
- `updateSong` ignoriert das coverUrl-Feld, die Datenbank wird nicht aktualisiert
- Mögliche Ursachen: coverUrl nicht in UpdateSongInput, coverUrl nicht in updateData-Objekt aufgenommen

### Fix Checking

**Goal**: Verifizieren, dass für alle Eingaben, bei denen die Bug-Bedingung gilt, die fixierte Funktion das erwartete Verhalten zeigt.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := updateSong_fixed(userId, songId, { coverUrl: input.coverUrl })
  ASSERT result.coverUrl = input.coverUrl
END FOR
```

### Preservation Checking

**Goal**: Verifizieren, dass für alle Eingaben, bei denen die Bug-Bedingung NICHT gilt, die fixierte Funktion dasselbe Ergebnis wie die ursprüngliche Funktion liefert.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT updateSong_original(userId, songId, input) = updateSong_fixed(userId, songId, input)
END FOR
```

**Testing Approach**: Property-based Testing wird für Preservation Checking empfohlen, weil:
- Es automatisch viele Testfälle über den Eingabebereich generiert
- Es Randfälle findet, die manuelle Unit-Tests übersehen könnten
- Es starke Garantien bietet, dass das Verhalten für alle Nicht-Bug-Eingaben unverändert bleibt

**Test Plan**: Verhalten auf dem unfixierten Code für bestehende Felder beobachten, dann Property-based Tests schreiben, die dieses Verhalten nach dem Fix verifizieren.

**Test Cases**:
1. **Titel-Update Preservation**: Prüfen, dass Titel-Updates weiterhin korrekt funktionieren nach dem Fix
2. **Künstler/Sprache/Tags Preservation**: Prüfen, dass alle bestehenden Felder weiterhin korrekt gespeichert werden
3. **Upload-Endpunkt Preservation**: Prüfen, dass POST `/api/songs/[id]/cover/upload` weiterhin funktioniert
4. **Leere Updates Preservation**: Prüfen, dass ein PUT ohne Felder weiterhin keine Änderungen verursacht

### Unit Tests

- CoverManager-Komponente rendert korrekt mit und ohne bestehende coverUrl
- URL-Eingabe validiert und speichert korrekt
- Datei-Upload ruft den richtigen Endpunkt auf
- Entfernen-Button setzt coverUrl auf null
- Fehler- und Ladezustände werden korrekt angezeigt

### Property-Based Tests

- Für beliebige gültige URL-Strings: `updateSong` mit coverUrl persistiert den Wert korrekt
- Für beliebige Updates ohne coverUrl: Verhalten identisch zur ursprünglichen Funktion
- Für beliebige Kombinationen von Feldern (titel + coverUrl, nur coverUrl, etc.): Alle Felder werden korrekt gespeichert

### Integration Tests

- Vollständiger Flow: URL eingeben → Speichern → Vorschau wird aktualisiert
- Vollständiger Flow: Datei hochladen → coverUrl wird gesetzt → Vorschau wird angezeigt
- Cover entfernen → coverUrl wird null → Vorschau verschwindet
- Song-Karte im Dashboard zeigt aktualisiertes Cover nach Änderung
