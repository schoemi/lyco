# Implementierungsplan: Vocal Trainer

## Übersicht

Schrittweise Implementierung des Vocal-Trainer-Moduls: Zuerst Datenmodell-Erweiterungen und Typen, dann Kern-Algorithmen (Frequenz-Utils, Serialisierung, DTW, Scoring), anschließend UI-Komponenten (Aufnahme, Karaoke-Text, Feedback) und zuletzt Integration aller Teile. Property-Based Tests sichern Serialisierung, Konvertierungen, Scoring und Rollen-Constraints ab.

## Tasks

- [x] 1. Datenmodell und Typen anlegen
  - [x] 1.1 Prisma-Schema erweitern: `AudioRolle`-Enum und `rolle`-Feld auf `AudioQuelle`, `VOCAL_TRAINER` zu `Lernmethode` hinzufügen, Migration ausführen
    - `enum AudioRolle { STANDARD INSTRUMENTAL REFERENZ_VOKAL }` anlegen
    - `rolle AudioRolle @default(STANDARD)` zu `AudioQuelle` hinzufügen
    - `VOCAL_TRAINER` zu `Lernmethode`-Enum hinzufügen
    - `npx prisma migrate dev` ausführen
    - _Anforderungen: 16.1, 16.2, 13.1_

  - [x] 1.2 TypeScript-Typen erstellen
    - `src/types/vocal-trainer.ts` anlegen mit `AufnahmeZustand`, `ReferenzFrame`, `ReferenzDaten`, `PitchFrame`, `AnalyseErgebnis`, `WorkerRequest`, `WorkerResponse`
    - `src/types/audio.ts` um `rolle: AudioRolle` in `AudioQuelleResponse` und `UpdateAudioQuelleInput` erweitern
    - _Anforderungen: 11.1, 12.1, 3.2, 16.1_

- [x] 2. Frequenz-Utilities und Serialisierung
  - [x] 2.1 `src/lib/vocal-trainer/frequenz-utils.ts` implementieren
    - `hzToMidi(hz)`, `midiToHz(midi)`, `centsDiff(hzA, hzB)` gemäß Design
    - _Anforderungen: 6.6_

  - [x]* 2.2 Property-Test: Frequenz-Konvertierung Round-Trip
    - **Property 1: hzToMidi/midiToHz Round-Trip** – Für beliebige Frequenzen im Bereich 50–1000 Hz gilt: `midiToHz(hzToMidi(hz)) ≈ hz` (Toleranz < 0.01 Hz)
    - **Property 2: centsDiff Symmetrie** – `centsDiff(a, b) === -centsDiff(b, a)` für beliebige positive Frequenzen
    - **Property 3: centsDiff Halbton** – `centsDiff(hz, hz * 2^(1/12)) ≈ -100` (ein Halbton = 100 Cents)
    - **Validiert: Anforderungen 6.6**

  - [x] 2.3 `src/lib/vocal-trainer/referenz-daten.ts` implementieren
    - `serializeReferenzDaten(data: ReferenzDaten): string` und `deserializeReferenzDaten(json: string): ReferenzDaten`
    - Validierung bei Deserialisierung mit beschreibendem Fehler bei ungültigem JSON
    - _Anforderungen: 11.1, 11.2, 11.3_

  - [x]* 2.4 Property-Test: Referenz-Daten Round-Trip
    - **Property 4: Referenz-Daten Serialisierung Round-Trip** – Für beliebige gültige `ReferenzDaten`-Objekte gilt: `deserializeReferenzDaten(serializeReferenzDaten(data))` erzeugt ein äquivalentes Objekt
    - **Validiert: Anforderungen 11.4**

  - [x] 2.5 `src/lib/vocal-trainer/pitch-daten.ts` implementieren
    - `serializePitchDaten(frames: PitchFrame[]): string` und `deserializePitchDaten(json: string): PitchFrame[]`
    - _Anforderungen: 12.1, 12.2_

  - [x]* 2.6 Property-Test: Pitch-Daten Round-Trip
    - **Property 5: Pitch-Daten Serialisierung Round-Trip** – Für beliebige gültige `PitchFrame[]`-Arrays gilt: `deserializePitchDaten(serializePitchDaten(frames))` erzeugt ein äquivalentes Array
    - **Validiert: Anforderungen 12.3**

- [x] 3. Checkpoint – Sicherstellen, dass alle Tests bestehen
  - Sicherstellen, dass alle Tests bestehen, bei Fragen den Benutzer konsultieren.

- [x] 4. Scoring und DTW-Algorithmen
  - [x] 4.1 `src/lib/vocal-trainer/scoring.ts` implementieren
    - `berechneAbweichungKategorie(cents: number): 'gut' | 'akzeptabel' | 'fehlerhaft'` (< 50 gut, 50–100 akzeptabel, > 100 fehlerhaft)
    - `berechnePitchScore(nutzerFrames, referenzFrames): number` (0–100)
    - `berechneTimingScore(nutzerOnsets, referenzOnsets): number` (0–100)
    - `berechneGesamtScore(pitchScore, timingScore): number` (gewichteter Durchschnitt, 0–100)
    - _Anforderungen: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x]* 4.2 Property-Test: Scoring-Algorithmen
    - **Property 6: Pitch-Score Bereich** – Für beliebige Eingaben gilt: `0 ≤ pitchScore ≤ 100`
    - **Property 7: Timing-Score Bereich** – Für beliebige Eingaben gilt: `0 ≤ timingScore ≤ 100`
    - **Property 8: Gesamt-Score Bereich** – Für beliebige pitchScore/timingScore in [0,100] gilt: `0 ≤ gesamtScore ≤ 100`
    - **Property 9: Gesamt-Score Monotonie** – Wenn pitchScore und timingScore steigen, steigt auch gesamtScore
    - **Property 10: Perfekter Pitch-Score** – Wenn alle Abweichungen 0 Cents sind, ist pitchScore = 100
    - **Property 11: Abweichungskategorie-Grenzen** – `< 50 → gut`, `50–100 → akzeptabel`, `> 100 → fehlerhaft` für beliebige nicht-negative Cents-Werte
    - **Validiert: Anforderungen 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**

  - [x] 4.3 `src/lib/vocal-trainer/dtw.ts` implementieren
    - DTW-Algorithmus für Zeitreihen-Alignment zweier Pitch-Kurven
    - Rückgabe: ausgerichtete Paare von (Referenz-Frame, Nutzer-Frame)
    - _Anforderungen: 7.1_

  - [x]* 4.4 Property-Test: DTW-Algorithmus
    - **Property 12: DTW Identität** – DTW einer Sequenz mit sich selbst ergibt perfektes 1:1-Alignment
    - **Property 13: DTW Symmetrie** – `dtw(a, b).cost === dtw(b, a).cost` für beliebige Sequenzen
    - **Property 14: DTW Nicht-Negativität** – Die DTW-Kosten sind immer ≥ 0
    - **Validiert: Anforderungen 7.1**

  - [x] 4.5 `src/lib/vocal-trainer/pitch-extraktor.ts` implementieren
    - YIN-Algorithmus für F0-Extraktion aus Float32Array-Audiodaten
    - Zeitfenster 20–40 ms, Frequenzbereich 50–1000 Hz
    - VAD: Frames ohne Stimmaktivität als `isVoiced: false` markieren
    - Noise-Gate: Signale unter Schwellenwert als Stille behandeln
    - Confidence-Wert pro Frame, Frames mit confidence < 0.5 ausschließen
    - _Anforderungen: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 15.1, 15.2_

  - [x] 4.6 `src/lib/vocal-trainer/latenz.ts` implementieren
    - `messeLatenz(): Promise<number>` – Round-Trip-Latenz des Audio-Systems messen
    - `kompensiere(audioBuffer, latenzMs): Float32Array` – Aufnahme zeitlich verschieben
    - _Anforderungen: 5.1, 5.2, 5.3_

- [x] 5. Checkpoint – Sicherstellen, dass alle Tests bestehen
  - Sicherstellen, dass alle Tests bestehen, bei Fragen den Benutzer konsultieren.

- [x] 6. Audio-Rollen Service und API
  - [x] 6.1 `src/lib/services/audio-quelle-service.ts` erweitern
    - `setRolle(quelleId, rolle, songId)` implementieren: Bei INSTRUMENTAL/REFERENZ_VOKAL bestehende Quelle mit gleicher Rolle auf STANDARD zurücksetzen
    - Bestehende CRUD-Methoden um `rolle`-Feld erweitern
    - _Anforderungen: 16.4, 16.5, 16.6, 16.10_

  - [x]* 6.2 Property-Test: Rollen-Constraint
    - **Property 15: Eindeutige Instrumental-Rolle** – Nach beliebiger Sequenz von `setRolle`-Aufrufen hat maximal eine AudioQuelle pro Song die Rolle INSTRUMENTAL
    - **Property 16: Eindeutige Referenz-Vokal-Rolle** – Nach beliebiger Sequenz von `setRolle`-Aufrufen hat maximal eine AudioQuelle pro Song die Rolle REFERENZ_VOKAL
    - **Property 17: Standard-Rolle Default** – Neue AudioQuellen haben immer die Rolle STANDARD
    - **Validiert: Anforderungen 16.2, 16.4, 16.5, 16.6**

  - [x] 6.3 API-Route `/api/songs/[id]/audio-quellen/[quelleId]` um `rolle`-Feld erweitern
    - PUT/PATCH-Handler um `rolle`-Validierung und `setRolle`-Aufruf erweitern
    - _Anforderungen: 16.10_

  - [x] 6.4 API-Route `/api/songs/[id]/referenz-daten` (GET) erstellen
    - Referenz-JSON für den Song laden und ausliefern
    - 404 zurückgeben, wenn keine Referenz-Daten vorhanden
    - _Anforderungen: 3.1, 3.3_

- [x] 7. Analyse-Worker
  - [x] 7.1 `src/lib/vocal-trainer/analyse-worker.ts` als Web Worker implementieren
    - `onmessage`-Handler für `WorkerRequest` mit type `ANALYSE`
    - Pipeline: Pitch-Extraktion → DTW-Alignment → Score-Berechnung
    - Fortschritts-Updates via `postMessage({ type: 'FORTSCHRITT', fortschritt })` senden
    - Ergebnis via `postMessage({ type: 'ERGEBNIS', ergebnis })` senden
    - Fehlerbehandlung via `postMessage({ type: 'FEHLER', fehler })` senden
    - Analyse eines 30s-Clips in maximal 5 Sekunden
    - _Anforderungen: 7.8, 8.1, 8.3, 8.4, 8.5_

- [x] 8. UI-Komponenten: Kopfhörer-Hinweis und Rollen-Auswahl
  - [x] 8.1 `src/components/vocal-trainer/kopfhoerer-hinweis.tsx` implementieren
    - Modaler Dialog mit Kopfhörer-Empfehlung
    - Bestätigung speichert Flag in `localStorage`
    - Dialog wird nur angezeigt, wenn Flag nicht gesetzt
    - `aria-label`, `aria-modal`, Fokus-Trap
    - _Anforderungen: 2.1, 2.2, 2.3_

  - [x] 8.2 `src/components/vocal-trainer/rollen-auswahl.tsx` implementieren
    - Dropdown/Segmented Control für Audio_Rolle (STANDARD, INSTRUMENTAL, REFERENZ_VOKAL)
    - `aria-label="Rolle der Audio-Quelle"`
    - PATCH-Request an `/api/songs/[id]/audio-quellen/[quelleId]` bei Änderung
    - _Anforderungen: 16.3, 16.11_

  - [x] 8.3 `RollenAuswahl` in bestehende AudioQuellen-Verwaltung integrieren
    - In der Song-Detailseite pro AudioQuelle die `RollenAuswahl`-Komponente einbinden
    - _Anforderungen: 16.3_

- [x] 9. Checkpoint – Sicherstellen, dass alle Tests bestehen
  - Sicherstellen, dass alle Tests bestehen, bei Fragen den Benutzer konsultieren.

- [x] 10. UI-Komponenten: Aufnahme-Controls und Feedback
  - [x] 10.1 `src/components/vocal-trainer/aufnahme-controls.tsx` implementieren
    - Aufnahme-Button (Start/Stopp), Abbrechen-Button
    - Zustandsabhängige Darstellung: BEREIT → Start, AUFNAHME → Stopp + Abbrechen
    - `aria-label` je nach Zustand ("Aufnahme starten", "Aufnahme stoppen", "Neue Aufnahme starten")
    - Mindest-Tippfläche 44×44px
    - _Anforderungen: 4.1, 4.6, 4.7, 14.2, 14.5_

  - [x] 10.2 `src/components/vocal-trainer/vergleichs-graph.tsx` implementieren
    - Canvas- oder SVG-basierter Pitch-Kurvenvergleich (Referenz + Nutzer)
    - Farbkodierung: Grün (< 50 Cents), Gelb (50–100 Cents), Rot (> 100 Cents)
    - `aria-label` mit textueller Zusammenfassung der Ergebnisse
    - _Anforderungen: 9.1, 9.2, 14.8_

  - [x] 10.3 `src/components/vocal-trainer/feedback-ansicht.tsx` implementieren
    - Pitch-Score, Timing-Score, Gesamt-Score als prozentuale Werte anzeigen
    - `VergleichsGraph` einbinden
    - Buttons: "Neue Aufnahme" und "Zurück zur Song-Seite"
    - `aria-label` für Score-Werte (z.B. "Pitch-Score: 85 Prozent")
    - _Anforderungen: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 14.4_

- [x] 11. Vocal-Trainer-Hauptansicht und Page
  - [x] 11.1 `src/components/vocal-trainer/vocal-trainer-view.tsx` implementieren
    - Zustandsmaschine: BEREIT → AUFNAHME → ANALYSE → ERGEBNIS
    - BEREIT: Aufnahme-Button, Kopfhörer-Hinweis (falls nötig)
    - AUFNAHME: Karaoke-Textanzeige (bestehende `TextAnzeige`, `StrophenTitel`, `SongInfo` wiederverwenden), Instrumental-Wiedergabe, Mikrofon-Aufnahme
    - ANALYSE: Ladeindikator mit Fortschrittsanzeige, Worker-Kommunikation
    - ERGEBNIS: `FeedbackAnsicht` anzeigen
    - `aria-live="polite"` Region für Zustandswechsel
    - Escape-Taste → Navigation zur Song-Detailseite
    - Mikrofon-Berechtigung anfordern bei Aufnahme-Start
    - Fehlerbehandlung: Mikrofon verweigert, kein Mikrofon, kein Instrumental, kein Referenz-Stem
    - Warnung bei < 20% stimmaktiven Frames
    - _Anforderungen: 1.3, 1.4, 1.5, 1.6, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 8.2, 8.4, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 14.1, 14.3, 14.5, 14.6, 14.7, 15.3, 16.7, 16.8, 16.9_

  - [x] 11.2 `src/app/(main)/songs/[id]/vocal-trainer/page.tsx` implementieren
    - Song-Daten über `/api/songs/[id]` laden
    - AudioQuellen über `/api/songs/[id]/audio-quellen` laden (Instrumental + Referenz-Vokal filtern)
    - Referenz-Daten über `/api/songs/[id]/referenz-daten` laden
    - Fehlerbehandlung bei fehlenden Daten
    - Zurück-Button mit `aria-label="Zurück zur Song-Detailseite"`
    - `VocalTrainerView` rendern
    - _Anforderungen: 1.1, 1.2, 1.7, 3.1, 3.3, 3.4, 14.1_

- [x] 12. Session-Speicherung und Integration
  - [x] 12.1 Session-Speicherung nach Analyse implementieren
    - POST an `/api/sessions` mit `{ songId, lernmethode: 'VOCAL_TRAINER' }` und `gesamtScore`
    - Fehlerbehandlung: Bei Fehler trotzdem Ergebnisse anzeigen, unauffällige Fehlermeldung
    - _Anforderungen: 13.1, 13.2, 13.3_

  - [x] 12.2 Navigation zum Vocal Trainer in Song-Detailseite einbinden
    - Link/Button zur Route `/songs/[id]/vocal-trainer/` auf der Song-Detailseite hinzufügen
    - Nur anzeigen, wenn mindestens eine AudioQuelle mit Rolle INSTRUMENTAL vorhanden ist
    - _Anforderungen: 1.1, 16.7, 16.9_

- [x] 13. Abschluss-Checkpoint – Sicherstellen, dass alle Tests bestehen
  - Sicherstellen, dass alle Tests bestehen, bei Fragen den Benutzer konsultieren.

## Hinweise

- Tasks mit `*` markiert sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachvollziehbarkeit
- Checkpoints sichern inkrementelle Validierung
- Property-Tests validieren universelle Korrektheitseigenschaften (fast-check)
- Bestehende Karaoke-Komponenten (`TextAnzeige`, `StrophenTitel`, `SongInfo`, `ZurueckButton`, `flattenLines`) werden wiederverwendet
