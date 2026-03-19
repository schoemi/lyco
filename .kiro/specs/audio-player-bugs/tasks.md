# Implementierungsplan

- [x] 1. Bug-Condition Explorationstest schreiben
  - **Property 1: Bug Condition** - Upload-Komponenten im falschen Modus & Audio-Dateien laden nicht
  - **WICHTIG**: Diesen Property-Based Test VOR der Implementierung des Fixes schreiben
  - **ZIEL**: Gegenbeispiele aufdecken, die die Bugs auf dem unfixierten Code demonstrieren
  - **Scoped PBT Ansatz**: Für deterministische Bugs die Property auf die konkreten Fehlerfälle einschränken
  - **Bug 1 — Upload-Komponenten**: Prüfen, dass im `editing`-Modus (`editing=true, editingText=false`) die Komponenten `AudioQuellenManager` und `CoverManager` gerendert werden. Auf unfixiertem Code: Sie fehlen, weil sie an `editingText` statt `editing` gebunden sind.
  - **Bug 1 — Text-Modus**: Prüfen, dass im `editingText`-Modus (`editing=false, editingText=true`) die Komponenten `AudioQuellenManager` und `CoverManager` NICHT gerendert werden. Auf unfixiertem Code: Sie werden fälschlicherweise angezeigt.
  - **Bug 2 — Middleware blockiert Audio**: Prüfen, dass die `publicApiPrefixes`-Liste in `middleware.ts` den Pfad `/api/uploads/` enthält, sodass Audio-Anfragen nicht mit 401 blockiert werden. Auf unfixiertem Code: `/api/uploads/` fehlt in der Liste.
  - **Bug-Bedingung aus Design**: `isBugCondition(input)` — (1) `input.action == "editMetadata"` UND Upload-Komponenten nicht sichtbar, (2) `input.audioQuelleUrl STARTS_WITH "/api/uploads/audio/"` UND Audio-Element kann nicht laden
  - **Erwartetes Verhalten**: (1) Upload-Komponenten im `editing`-Modus sichtbar, im `editingText`-Modus nicht, (2) `/api/uploads/` als öffentliche Route behandelt
  - Test auf UNFIXIERTEM Code ausführen
  - **ERWARTETES ERGEBNIS**: Test SCHLÄGT FEHL (das ist korrekt — es beweist, dass die Bugs existieren)
  - Gegenbeispiele dokumentieren, um die Ursache zu verstehen
  - Task als abgeschlossen markieren, wenn Test geschrieben, ausgeführt und Fehler dokumentiert ist
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [x] 2. Preservation Property-Tests schreiben (VOR der Implementierung des Fixes)
  - **Property 2: Preservation** - Bestehendes Verhalten bewahren
  - **WICHTIG**: Observation-First-Methodik befolgen
  - **Beobachten auf UNFIXIERTEM Code**:
  - Beobachten: `SongEditForm` rendert Metadaten-Felder (Titel, Künstler, Sprache, Emotions-Tags) korrekt im `editing`-Modus
  - Beobachten: `SongTextEditor` wird im `editingText`-Modus korrekt angezeigt
  - Beobachten: Externe Audio-Quellen (Spotify, YouTube, Apple Music) werden als Embed korrekt angezeigt
  - Beobachten: Externe MP3-URLs (`https://example.com/song.mp3`) werden korrekt geladen
  - Beobachten: Quellen-Umschalter bei mehreren Audio-Quellen funktioniert
  - Beobachten: Freigabe-Ansicht (kein Eigentümer) zeigt keine Bearbeitungsoptionen
  - **Property-Based Tests schreiben**:
  - Für beliebige Song-Zustände mit `editing=true`: `SongEditForm` wird gerendert mit allen Metadaten-Feldern
  - Für beliebige Song-Zustände mit `editingText=true`: `SongTextEditor` wird gerendert
  - Für beliebige Audio-Quellen mit Typ SPOTIFY/YOUTUBE/APPLE_MUSIC: Embed-iframe wird korrekt gerendert
  - Für beliebige Audio-Quellen mit externer MP3-URL: Audio-Element wird mit korrekter `src` gerendert
  - Für beliebige Song-Zustände mit `istFreigabe=true`: Keine Bearbeitungsoptionen sichtbar
  - Tests auf UNFIXIERTEM Code ausführen
  - **ERWARTETES ERGEBNIS**: Tests BESTEHEN (bestätigt das Baseline-Verhalten, das bewahrt werden muss)
  - Task als abgeschlossen markieren, wenn Tests geschrieben, ausgeführt und bestanden auf unfixiertem Code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix für Audio-Player-Bugs

  - [x] 3.1 Upload-Komponenten von `editingText` nach `editing` verschieben
    - In `src/app/(main)/songs/[id]/page.tsx`: Den Block `{!istFreigabe && editingText && (...)}` am Ende der Datei (der `CoverManager` und `AudioQuellenManager` enthält) entfernen
    - Stattdessen die Upload-Komponenten in den `editing`-Block verschieben: Nach dem `SongEditForm` innerhalb des `{!istFreigabe && editing ? ...}` Blocks oder als separaten Block `{!istFreigabe && editing && (...)}`
    - _Bug_Condition: isBugCondition(input) where input.action == "editMetadata" AND uploadComponentsNotVisible()_
    - _Expected_Behavior: Upload-Komponenten (AudioQuellenManager, CoverManager) im editing-Modus sichtbar, im editingText-Modus nicht_
    - _Preservation: SongEditForm Metadaten-Felder weiterhin korrekt, SongTextEditor weiterhin korrekt_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2_

  - [x] 3.2 `/api/uploads/` zu publicApiPrefixes in middleware.ts hinzufügen
    - In `middleware.ts`: `"/api/uploads/"` zur `publicApiPrefixes`-Liste hinzufügen
    - Aktuelle Liste: `["/api/auth/", "/api/setup"]` → Neue Liste: `["/api/auth/", "/api/setup", "/api/uploads/"]`
    - Dies ist minimal-invasiv und konsistent mit dem bestehenden Pattern (Option B aus dem Design)
    - Audio-Dateien werden über UUID-basierte Dateinamen adressiert (nicht erratbar), daher ist Authentifizierung nicht zwingend erforderlich
    - _Bug_Condition: isBugCondition(input) where input.audioQuelleUrl STARTS_WITH "/api/uploads/audio/" AND audioElementCannotLoad()_
    - _Expected_Behavior: Audio-Dateien werden korrekt geladen, Dauer wird angezeigt, Wiedergabe funktioniert_
    - _Preservation: Externe Audio-Quellen (Spotify, YouTube, Apple Music) weiterhin korrekt, externe MP3-URLs weiterhin korrekt_
    - _Requirements: 1.3, 1.4, 2.3, 2.4, 3.3, 3.4_

  - [x] 3.3 Bug-Condition Explorationstest erneut ausführen — Verifizieren, dass er jetzt besteht
    - **Property 1: Expected Behavior** - Upload-Komponenten im korrekten Modus & Audio-Dateien laden
    - **WICHTIG**: Den GLEICHEN Test aus Task 1 erneut ausführen — KEINEN neuen Test schreiben
    - Der Test aus Task 1 kodiert das erwartete Verhalten
    - Wenn dieser Test besteht, bestätigt er, dass das erwartete Verhalten erfüllt ist
    - **ERWARTETES ERGEBNIS**: Test BESTEHT (bestätigt, dass die Bugs behoben sind)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.4 Preservation-Tests erneut ausführen — Verifizieren, dass sie weiterhin bestehen
    - **Property 2: Preservation** - Bestehendes Verhalten bewahrt
    - **WICHTIG**: Die GLEICHEN Tests aus Task 2 erneut ausführen — KEINE neuen Tests schreiben
    - **ERWARTETES ERGEBNIS**: Tests BESTEHEN (bestätigt keine Regressionen)
    - Bestätigen, dass alle Tests nach dem Fix weiterhin bestehen

- [x] 4. Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Sicherstellen, dass alle Tests bestehen, bei Fragen den Benutzer konsultieren.
