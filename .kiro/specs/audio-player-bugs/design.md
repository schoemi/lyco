# Audio-Player-Bugs — Bugfix-Design

## Übersicht

Dieses Design beschreibt die Behebung zweier zusammenhängender Bugs in der Audio-Player-Funktionalität:

1. **Fehlplatzierte Upload-Komponenten**: `AudioQuellenManager` und `CoverManager` werden im Text-Bearbeitungsmodus (`editingText`) statt im Metadaten-Bearbeitungsmodus (`editing`) angezeigt. Die Zuordnung ist logisch falsch.
2. **Audio-Dateien laden nicht**: Hochgeladene MP3-Dateien mit URLs wie `/api/uploads/audio/{uuid}.mp3` werden vom Player nicht geladen — der Timecode bleibt bei `00:00:00 / 00:00.00`.

## Glossar

- **Bug_Condition (C)**: Die Bedingung, die den Bug auslöst — (1) Metadaten-Bearbeitungsmodus ohne Upload-Komponenten, (2) Audio-Element kann hochgeladene MP3-Dateien nicht laden
- **Property (P)**: Das gewünschte Verhalten — (1) Upload-Komponenten im Metadaten-Modus sichtbar, (2) Audio-Dateien werden korrekt geladen und abgespielt
- **Preservation**: Bestehendes Verhalten, das unverändert bleiben muss — Metadaten-Speicherung, Text-Editor, externe Embeds, Quellen-Umschalter
- **SongEditForm**: Die Komponente in `src/components/songs/song-edit-form.tsx`, die Metadaten-Felder (Titel, Künstler, Sprache, Tags) rendert
- **SharedAudioProvider**: Die Komponente in `src/components/songs/shared-audio-provider.tsx`, die das `<audio>`-Element verwaltet und den Wiedergabe-Kontext bereitstellt
- **editingText**: Boolean-State in `page.tsx`, der den Text-Bearbeitungsmodus steuert
- **editing**: Boolean-State in `page.tsx`, der den Metadaten-Bearbeitungsmodus steuert

## Bug-Details

### Bug-Bedingung

**Bug 1 — Fehlplatzierte Upload-Komponenten:**
Der Bug tritt auf, wenn der Benutzer den Metadaten-Bearbeitungsmodus aktiviert (`editing = true`). Die `SongEditForm`-Komponente zeigt nur Textfelder an. `AudioQuellenManager` und `CoverManager` werden stattdessen im Block `{!istFreigabe && editingText && (...)}` gerendert — also nur im Text-Bearbeitungsmodus sichtbar.

**Bug 2 — Audio-Dateien laden nicht:**
Der Bug tritt auf, wenn eine MP3-Audio-Quelle mit einer internen Upload-URL (`/api/uploads/audio/{uuid}.mp3`) vorhanden ist. Das `<audio>`-Element in `SharedAudioProvider` setzt `src={activeQuelle.url}` und `preload="auto"`. Die Middleware in `middleware.ts` fängt alle API-Routen ab und erfordert Authentifizierung. Der Matcher `/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)` schließt Audio-Dateien (`.mp3`) nicht aus. Wenn das `<audio>`-Element die Datei anfordert und die Session-Validierung fehlschlägt oder verzögert ist, erhält es eine JSON-Fehlerantwort statt Audio-Daten.

**Formale Spezifikation:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { action: string, audioQuelleUrl?: string }
  OUTPUT: boolean
  
  // Bug 1: Upload-Komponenten fehlen im Metadaten-Modus
  IF input.action == "editMetadata"
    RETURN uploadComponentsNotVisible()
  END IF
  
  // Bug 2: Audio-Datei lädt nicht
  IF input.action == "playAudio"
    RETURN input.audioQuelleUrl STARTS_WITH "/api/uploads/audio/"
           AND audioElementCannotLoad(input.audioQuelleUrl)
  END IF
  
  RETURN false
END FUNCTION
```

### Beispiele

- **Bug 1, Beispiel 1**: Benutzer klickt "Bearbeiten" im Aktionsmenü → `editing = true` → `SongEditForm` wird angezeigt, aber ohne `AudioQuellenManager` und `CoverManager`. Erwartet: Beide Upload-Komponenten sollen sichtbar sein.
- **Bug 1, Beispiel 2**: Benutzer klickt "Text bearbeiten" → `editingText = true` → `SongTextEditor` wird angezeigt UND `AudioQuellenManager`/`CoverManager` erscheinen darunter. Erwartet: Nur der Text-Editor soll sichtbar sein.
- **Bug 2, Beispiel 1**: Song hat Audio-Quelle mit URL `/api/uploads/audio/abc-123.mp3` → Player zeigt `00:00:00 / 00:00.00` → Play-Button bewirkt nichts. Erwartet: Dauer wird angezeigt, Wiedergabe funktioniert.
- **Bug 2, Beispiel 2**: Song hat Audio-Quelle mit externer URL `https://example.com/song.mp3` → Player funktioniert korrekt. Dies ist kein Bug-Fall.

## Erwartetes Verhalten

### Preservation-Anforderungen

**Unverändertes Verhalten:**
- Metadaten-Felder (Titel, Künstler, Sprache, Emotions-Tags) müssen weiterhin im Bearbeitungsmodus angezeigt und gespeichert werden können
- Der Songtext-Editor muss weiterhin im Text-Bearbeitungsmodus korrekt funktionieren
- Externe Audio-Quellen (Spotify, YouTube, Apple Music) müssen weiterhin korrekt als Embed angezeigt werden
- Externe MP3-URLs (z.B. `https://example.com/song.mp3`) müssen weiterhin korrekt geladen und abgespielt werden
- Der Quellen-Umschalter bei mehreren Audio-Quellen muss weiterhin funktionieren
- Freigabe-Ansicht (kein Eigentümer) darf keine Bearbeitungsoptionen zeigen

**Scope:**
Alle Eingaben, die NICHT die oben beschriebenen Bug-Bedingungen betreffen, sollen vollständig unverändert bleiben. Dies umfasst:
- Mausklicks auf Buttons und Links
- Navigation zwischen Seiten
- Alle anderen Bearbeitungsfunktionen (Strophen-Editor, Analyse, Übersetzung)

## Hypothese zur Ursache

Basierend auf der Code-Analyse sind die wahrscheinlichsten Ursachen:

1. **Falsche Zuordnung der Upload-Komponenten (Bug 1)**: In `src/app/(main)/songs/[id]/page.tsx` (ca. Zeile 380) werden `CoverManager` und `AudioQuellenManager` innerhalb des Blocks `{!istFreigabe && editingText && (...)}` gerendert. Die korrekte Zuordnung wäre `{!istFreigabe && editing && (...)}`, da Audio- und Cover-Verwaltung zur Metadaten-Bearbeitung gehört, nicht zur Textbearbeitung.

2. **Middleware blockiert Audio-Anfragen (Bug 2)**: Die Middleware in `middleware.ts` erfordert Authentifizierung für alle API-Routen. Der Matcher-Pattern schließt Bild-Dateien aus (`.svg|.png|.jpg|.jpeg|.gif|.webp`), aber NICHT Audio-Dateien (`.mp3`, `.mp4`, `.m4a`). Das `<audio>`-Element sendet zwar Same-Origin-Cookies, aber es gibt mehrere Szenarien, in denen die Authentifizierung fehlschlagen kann:
   - Browser-Preflight oder Range-Requests könnten die Session-Cookies nicht korrekt senden
   - Die Middleware gibt bei fehlender/abgelaufener Session eine JSON-Antwort (`{ error: "Nicht authentifiziert" }`) zurück, die das Audio-Element nicht als Audio-Daten interpretieren kann
   - Der `HEAD`-Request, den Firefox Mobile vor dem Streaming sendet, geht ebenfalls durch die Middleware

3. **Alternative Hypothese für Bug 2**: Die Upload-API-Route `/api/uploads/audio/[...path]/route.ts` funktioniert korrekt, aber die Middleware-Authentifizierung für die Audio-Serving-Route ist unnötig restriktiv. Da Audio-Dateien über UUID-basierte Dateinamen adressiert werden (nicht erratbar), könnte die Route als öffentlich behandelt werden — analog zu statischen Assets.

## Correctness Properties

Property 1: Bug Condition - Upload-Komponenten im korrekten Bearbeitungsmodus

_For any_ Eingabe, bei der der Benutzer den Metadaten-Bearbeitungsmodus aktiviert (`editing = true`), SOLL die Seite die Komponenten `AudioQuellenManager` und `CoverManager` zusammen mit den Metadaten-Feldern anzeigen. Im Text-Bearbeitungsmodus (`editingText = true`) SOLLEN diese Komponenten NICHT angezeigt werden.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition - Audio-Dateien werden korrekt geladen

_For any_ Audio-Quelle mit einer internen Upload-URL (`/api/uploads/audio/{uuid}.mp3`), SOLL das `<audio>`-Element die Datei erfolgreich laden, die korrekte Dauer anzeigen und die Wiedergabe ermöglichen.

**Validates: Requirements 2.3, 2.4**

Property 3: Preservation - Metadaten-Bearbeitung und Text-Editor

_For any_ Eingabe, bei der der Bug-Zustand NICHT vorliegt (externe Audio-Quellen, Metadaten-Speicherung, Text-Editor), SOLL das System exakt das gleiche Verhalten wie vor dem Fix zeigen, einschließlich korrekter Anzeige externer Embeds und funktionierender Speicherung.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix-Implementierung

### Erforderliche Änderungen

Unter der Annahme, dass unsere Ursachenanalyse korrekt ist:

**Datei**: `src/app/(main)/songs/[id]/page.tsx`

**Änderung 1 — Upload-Komponenten verschieben**:
1. **Block entfernen**: Den bestehenden Block `{!istFreigabe && editingText && (...)}` am Ende der Seite (der `CoverManager` und `AudioQuellenManager` enthält) entfernen.
2. **Block hinzufügen**: Die Upload-Komponenten in den `editing`-Block verschieben. Konkret: Innerhalb des `{!istFreigabe && editing ? (<SongEditForm .../>)` Blocks, nach dem `SongEditForm`, die `CoverManager`- und `AudioQuellenManager`-Komponenten einfügen. Alternativ können sie als separate Sektion direkt nach dem `SongEditForm`-Block gerendert werden, geschützt durch `{!istFreigabe && editing && (...)}`.

**Datei**: `middleware.ts`

**Änderung 2 — Audio-Serving-Route von Middleware ausschließen**:
1. **Option A — Matcher erweitern**: Den Middleware-Matcher so anpassen, dass Pfade unter `/api/uploads/` ausgeschlossen werden. Da die Dateien über UUID-basierte Namen adressiert werden, ist eine Authentifizierung nicht zwingend erforderlich.
2. **Option B — Public-Route hinzufügen**: Den Pfad `/api/uploads/` zur `publicApiPrefixes`-Liste hinzufügen, sodass die Middleware diese Routen durchlässt.
3. **Empfehlung**: Option B ist minimal-invasiv und konsistent mit dem bestehenden Pattern. Einfach `"/api/uploads/"` zu `publicApiPrefixes` hinzufügen.

**Datei**: `src/components/songs/song-edit-form.tsx`

**Änderung 3 — Props für Upload-Komponenten (optional)**:
Falls die Upload-Komponenten innerhalb des `SongEditForm` integriert werden sollen (statt als separate Sektionen), müssten Props für `songId`, `audioQuellen`, `coverUrl` und Callback-Funktionen hinzugefügt werden. Die einfachere Variante ist, sie als separate Sektionen neben dem Form zu rendern.

## Teststrategie

### Validierungsansatz

Die Teststrategie folgt einem zweiphasigen Ansatz: Zuerst Gegenbeispiele aufdecken, die den Bug auf dem unfixierten Code demonstrieren, dann verifizieren, dass der Fix korrekt funktioniert und bestehendes Verhalten bewahrt.

### Explorative Bug-Condition-Prüfung

**Ziel**: Gegenbeispiele aufdecken, die den Bug VOR der Implementierung des Fixes demonstrieren. Ursachenanalyse bestätigen oder widerlegen.

**Testplan**: Tests schreiben, die den Rendering-Zustand der Seite in verschiedenen Modi prüfen und Audio-Laden simulieren. Diese Tests auf dem UNFIXIERTEN Code ausführen, um Fehler zu beobachten.

**Testfälle**:
1. **Metadaten-Modus ohne Upload-Komponenten**: Prüfen, ob `AudioQuellenManager` und `CoverManager` im `editing`-Modus gerendert werden (wird auf unfixiertem Code fehlschlagen)
2. **Text-Modus mit Upload-Komponenten**: Prüfen, ob `AudioQuellenManager` und `CoverManager` im `editingText`-Modus NICHT gerendert werden (wird auf unfixiertem Code fehlschlagen)
3. **Audio-Laden mit interner URL**: Prüfen, ob ein Audio-Element mit `/api/uploads/audio/test.mp3` die Datei laden kann (wird auf unfixiertem Code fehlschlagen, wenn Middleware blockiert)
4. **Audio-Laden mit externer URL**: Prüfen, ob ein Audio-Element mit `https://example.com/song.mp3` funktioniert (sollte auch auf unfixiertem Code bestehen)

**Erwartete Gegenbeispiele**:
- `AudioQuellenManager` und `CoverManager` werden im `editing`-Modus nicht gefunden
- Audio-Anfragen an `/api/uploads/audio/` erhalten 401-Antworten oder werden von der Middleware blockiert

### Fix-Prüfung

**Ziel**: Verifizieren, dass für alle Eingaben, bei denen die Bug-Bedingung gilt, die fixierte Funktion das erwartete Verhalten produziert.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedBehavior(input)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation-Prüfung

**Ziel**: Verifizieren, dass für alle Eingaben, bei denen die Bug-Bedingung NICHT gilt, die fixierte Funktion das gleiche Ergebnis wie die ursprüngliche Funktion produziert.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalBehavior(input) = fixedBehavior(input)
END FOR
```

**Testansatz**: Property-Based Testing wird für die Preservation-Prüfung empfohlen, weil:
- Es automatisch viele Testfälle über den Eingabebereich generiert
- Es Randfälle findet, die manuelle Unit-Tests übersehen könnten
- Es starke Garantien bietet, dass das Verhalten für alle nicht-fehlerhaften Eingaben unverändert bleibt

**Testplan**: Verhalten auf UNFIXIERTEM Code zuerst beobachten für Metadaten-Speicherung, externe Embeds und Quellen-Umschalter, dann Property-Based Tests schreiben, die dieses Verhalten erfassen.

**Testfälle**:
1. **Metadaten-Speicherung Preservation**: Beobachten, dass Titel/Künstler/Sprache/Tags korrekt gespeichert werden, dann Test schreiben, der dies nach dem Fix verifiziert
2. **Externe Embed Preservation**: Beobachten, dass Spotify/YouTube/Apple Music Embeds korrekt angezeigt werden, dann Test schreiben
3. **Quellen-Umschalter Preservation**: Beobachten, dass der Wechsel zwischen Audio-Quellen funktioniert, dann Test schreiben
4. **Text-Editor Preservation**: Beobachten, dass der Songtext-Editor im `editingText`-Modus korrekt funktioniert

### Unit Tests

- Test: `AudioQuellenManager` wird im `editing`-Modus gerendert
- Test: `CoverManager` wird im `editing`-Modus gerendert
- Test: Upload-Komponenten werden im `editingText`-Modus NICHT gerendert
- Test: Audio-Serving-Route gibt korrekte Audio-Daten zurück (ohne Auth-Blockade)
- Test: Audio-Serving-Route unterstützt Range-Requests korrekt

### Property-Based Tests

- Generiere zufällige Song-Zustände und verifiziere, dass Upload-Komponenten nur im korrekten Modus sichtbar sind
- Generiere zufällige Audio-Quellen-Konfigurationen und verifiziere, dass interne URLs korrekt geladen werden
- Generiere zufällige Nicht-Bug-Eingaben und verifiziere, dass bestehendes Verhalten unverändert bleibt

### Integration Tests

- Test: Vollständiger Bearbeitungsfluss — Metadaten bearbeiten, Audio hochladen, Cover hochladen, speichern
- Test: Audio-Wiedergabe mit hochgeladener MP3-Datei — Play, Pause, Seek, Timecode-Anzeige
- Test: Wechsel zwischen Bearbeitungsmodi — `editing` → `editingText` → zurück
