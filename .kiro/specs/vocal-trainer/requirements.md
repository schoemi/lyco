# Anforderungsdokument: Vocal Trainer

## Einleitung

Der Vocal Trainer ist ein Modul, das den Gesang eines Nutzers gegen eine Referenzspur (Vocal Stem) prüft. Nach einer synchronen Aufnahme über Mikrofon analysiert das System Pitch (Intonation) und Timing (Rhythmus) und liefert dem Nutzer ein detailliertes visuelles Feedback mit Score und Kurvenvergleich. Das UI orientiert sich am bestehenden Karaoke-Lesemodus mit Vollbild-Ansicht, Auto-Scroll und Textanzeige. Die Analyse erfolgt client-seitig via Web Worker oder serverseitig, um das UI nicht zu blockieren.

## Glossar

- **System**: Die Lyco Song Text Trainer Webanwendung (Next.js App Router)
- **Nutzer**: Ein authentifizierter Benutzer der Anwendung
- **Song**: Ein Songtext mit Metadaten (Titel, Künstler), bestehend aus Strophen und Zeilen
- **Strophe**: Ein benannter Textabschnitt innerhalb eines Songs (z.B. Intro, Verse, Chorus, Bridge)
- **Zeile**: Eine einzelne Textzeile innerhalb einer Strophe
- **Vocal_Trainer_Ansicht**: Die Vollbild-Komponente unter der Route `/songs/[id]/vocal-trainer/`, die Aufnahme, Analyse und Feedback bereitstellt
- **Referenz_Stem**: Die vor-analysierte Vocal-Spur des Songs, gespeichert als JSON-Datei mit Pitch- und Timing-Daten
- **Referenz_Daten**: Die JSON-Struktur der Referenz_Stem, bestehend aus Zeitstempeln, Grundfrequenzen (F0) und Onset-Markierungen
- **Instrumental**: Die Begleitmusik des Songs ohne Gesang, die während der Aufnahme über Kopfhörer abgespielt wird
- **Aufnahme**: Die über das Mikrofon aufgezeichnete Gesangsspur des Nutzers
- **Pitch**: Die Grundfrequenz (F0) eines Tons, gemessen in Hertz und umgerechnet in Cents oder MIDI-Werte
- **Cents**: Eine logarithmische Einheit zur Messung von Tonhöhenunterschieden (100 Cents = 1 Halbton)
- **MIDI_Wert**: Eine numerische Repräsentation einer Tonhöhe (z.B. 69 = A4 = 440 Hz)
- **Onset**: Der Startpunkt einer gesungenen Silbe oder Note in der Zeitleiste
- **Pitch_Extraktor**: Die Komponente, die aus einem Audiosignal die Grundfrequenz (F0) in regelmäßigen Zeitfenstern extrahiert
- **VAD**: Voice Activity Detection – Erkennung, ob in einem Zeitfenster Stimme vorhanden ist oder Stille herrscht
- **DTW**: Dynamic Time Warping – ein Algorithmus zum Abgleich zweier Zeitreihen mit unterschiedlichem Tempo
- **Pitch_Score**: Ein prozentualer Wert, der die Genauigkeit der Intonation des Nutzers im Vergleich zur Referenz bewertet
- **Timing_Score**: Ein prozentualer Wert, der die zeitliche Übereinstimmung der Onsets des Nutzers mit der Referenz bewertet
- **Gesamt_Score**: Ein gewichteter prozentualer Gesamtwert aus Pitch_Score und Timing_Score
- **Vergleichs_Graph**: Eine grafische Darstellung, die die Pitch-Kurve der Referenz und die Pitch-Kurve des Nutzers übereinander anzeigt
- **Analyse_Worker**: Ein Web Worker oder Backend-Prozess, der die Pitch-Extraktion und den Vergleichsalgorithmus ausführt, ohne das UI zu blockieren
- **Latenz_Kompensation**: Die Korrektur des zeitlichen Versatzes zwischen Instrumental-Wiedergabe und Mikrofonaufnahme
- **Kopfhörer_Hinweis**: Ein modaler Dialog, der den Nutzer auffordert, Kopfhörer zu verwenden, um akustische Rückkopplungen zu vermeiden
- **Feedback_Ansicht**: Der Bereich der Vocal_Trainer_Ansicht, der nach der Analyse den Vergleichs_Graph und die Scores anzeigt
- **Aufnahme_Zustand**: Der aktuelle Status des Vocal Trainers: BEREIT, AUFNAHME, ANALYSE oder ERGEBNIS
- **Audio_Rolle**: Die funktionale Zuordnung einer AudioQuelle innerhalb des Vocal Trainers: INSTRUMENTAL (Playback-Track), REFERENZ_VOKAL (Vocal Stem für die Analyse) oder STANDARD (keine spezielle Rolle, Default)
- **AudioQuelle**: Ein bestehendes Datenmodell, das eine Audio-Datei oder einen Streaming-Link einem Song zuordnet (Felder: id, songId, url, typ, label, orderIndex)

## Anforderungen

### Anforderung 1: Vocal-Trainer-Ansicht und Zustandssteuerung

**User Story:** Als Nutzer möchte ich eine dedizierte Vollbild-Ansicht für das Gesangstraining aufrufen können, damit ich mich voll auf die Aufnahme und das Feedback konzentrieren kann.

#### Akzeptanzkriterien

1. THE Vocal_Trainer_Ansicht SHALL unter der Route `/songs/[id]/vocal-trainer/` erreichbar sein und den gesamten Viewport als Vollbild-Ansicht nutzen.
2. THE Vocal_Trainer_Ansicht SHALL die Song-Daten (Strophen und Zeilen) über die bestehende API `/api/songs/[id]` laden.
3. THE Vocal_Trainer_Ansicht SHALL vier Aufnahme_Zustände verwalten: BEREIT, AUFNAHME, ANALYSE und ERGEBNIS.
4. WHEN die Vocal_Trainer_Ansicht geöffnet wird, THE System SHALL den Aufnahme_Zustand auf BEREIT setzen.
5. IF die Song-Daten nicht geladen werden können, THEN THE Vocal_Trainer_Ansicht SHALL eine Fehlermeldung anzeigen und den Aufnahme_Zustand auf BEREIT belassen.
6. IF der Song keine Strophen enthält, THEN THE Vocal_Trainer_Ansicht SHALL einen Hinweis anzeigen, dass keine Texte vorhanden sind.
7. THE Vocal_Trainer_Ansicht SHALL einen Zurück-Button oben links anzeigen, der zur Song-Detailseite (`/songs/[id]`) navigiert.

### Anforderung 2: Kopfhörer-Hinweis und Mikrofon-Berechtigung

**User Story:** Als Nutzer möchte ich vor der Aufnahme darauf hingewiesen werden, Kopfhörer zu verwenden, damit keine akustische Rückkopplung die Analyse verfälscht.

#### Akzeptanzkriterien

1. WHEN die Vocal_Trainer_Ansicht zum ersten Mal geöffnet wird und der Nutzer den Kopfhörer_Hinweis noch nicht bestätigt hat, THE System SHALL den Kopfhörer_Hinweis als modalen Dialog anzeigen.
2. THE Kopfhörer_Hinweis SHALL den Nutzer auffordern, Kopfhörer anzuschließen, bevor die Aufnahme gestartet wird.
3. WHEN der Nutzer den Kopfhörer_Hinweis bestätigt, THE System SHALL die Bestätigung im localStorage speichern, sodass der Hinweis bei zukünftigen Besuchen nicht erneut erscheint.
4. WHEN der Nutzer die Aufnahme startet und die Mikrofon-Berechtigung noch nicht erteilt wurde, THE System SHALL die Berechtigung über `MediaDevices.getUserMedia` anfordern.
5. IF der Nutzer die Mikrofon-Berechtigung verweigert, THEN THE System SHALL eine Fehlermeldung anzeigen, die erklärt, dass die Mikrofon-Berechtigung für die Aufnahme erforderlich ist.
6. IF kein Mikrofon am Gerät verfügbar ist, THEN THE System SHALL eine Fehlermeldung anzeigen, die erklärt, dass ein Mikrofon für die Aufnahme benötigt wird.

### Anforderung 3: Referenz-Daten laden

**User Story:** Als Nutzer möchte ich, dass die Referenz-Daten des Vocal Stems automatisch geladen werden, damit die Analyse nach der Aufnahme sofort starten kann.

#### Akzeptanzkriterien

1. WHEN die Vocal_Trainer_Ansicht geöffnet wird, THE System SHALL die Referenz_Daten für den ausgewählten Song laden.
2. THE Referenz_Daten SHALL als JSON-Struktur vorliegen, die Zeitstempel (in Millisekunden), Grundfrequenzen (F0 in Hertz) und Onset-Markierungen enthält.
3. IF keine Referenz_Daten für den Song vorhanden sind, THEN THE System SHALL eine Meldung anzeigen, dass für diesen Song kein Vocal Stem verfügbar ist, und den Aufnahme-Button deaktivieren.
4. THE System SHALL die Referenz_Daten im Speicher halten, bis die Vocal_Trainer_Ansicht geschlossen wird.

### Anforderung 4: Synchrone Aufnahme mit Instrumental-Wiedergabe

**User Story:** Als Nutzer möchte ich meine Stimme synchron zum Instrumental aufnehmen, damit die Analyse meine Leistung korrekt mit der Referenz vergleichen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer den Aufnahme-Button betätigt, THE System SHALL den Aufnahme_Zustand auf AUFNAHME setzen und gleichzeitig die Instrumental-Wiedergabe starten und die Mikrofonaufnahme beginnen.
2. THE System SHALL die Aufnahme in Mono mit einer Abtastrate von 44.1 kHz oder 48 kHz über `MediaDevices.getUserMedia` durchführen.
3. THE System SHALL die Latenz_Kompensation anwenden, um den zeitlichen Versatz zwischen Instrumental-Wiedergabe und Mikrofonaufnahme auszugleichen.
4. WHILE der Aufnahme_Zustand AUFNAHME ist, THE Vocal_Trainer_Ansicht SHALL den Songtext im Karaoke-Stil anzeigen, wobei die aktive Zeile zentriert und hervorgehoben dargestellt wird.
5. WHILE der Aufnahme_Zustand AUFNAHME ist, THE Vocal_Trainer_Ansicht SHALL die aktive Zeile synchron zu den Timecodes der Strophen wechseln.
6. WHEN der Nutzer den Stopp-Button betätigt oder das Instrumental endet, THE System SHALL die Aufnahme beenden und den Aufnahme_Zustand auf ANALYSE setzen.
7. WHEN der Nutzer während der Aufnahme den Abbrechen-Button betätigt, THE System SHALL die Aufnahme verwerfen und den Aufnahme_Zustand auf BEREIT zurücksetzen.

### Anforderung 5: Latenz-Kompensation

**User Story:** Als Nutzer möchte ich, dass meine Aufnahme exakt auf das Instrumental ausgerichtet wird, damit die Analyse nicht durch Systemlatenz verfälscht wird.

#### Akzeptanzkriterien

1. THE System SHALL die Round-Trip-Latenz des Audio-Systems messen, bevor die erste Aufnahme gestartet wird.
2. THE System SHALL die gemessene Latenz verwenden, um die aufgenommene Spur zeitlich auf den Startzeitpunkt des Instrumentals auszurichten.
3. THE System SHALL die Aufnahme exakt synchron zum Instrumental starten, sodass der zeitliche Versatz nach Latenz_Kompensation unter 20 Millisekunden liegt.

### Anforderung 6: Pitch-Extraktion

**User Story:** Als Nutzer möchte ich, dass meine gesungenen Töne präzise erkannt werden, damit die Analyse meine Intonation korrekt bewerten kann.

#### Akzeptanzkriterien

1. THE Pitch_Extraktor SHALL die Grundfrequenz (F0) der Aufnahme in Zeitfenstern von 20 bis 40 Millisekunden extrahieren.
2. THE Pitch_Extraktor SHALL einen robusten Algorithmus (YIN oder MPM) verwenden, um Oberschwingungen zu ignorieren und die korrekte Grundfrequenz zu ermitteln.
3. THE Pitch_Extraktor SHALL Frequenzen im Bereich von 50 Hz bis 1000 Hz analysieren, um den typischen Stimmumfang der menschlichen Stimme abzudecken.
4. THE Pitch_Extraktor SHALL die VAD anwenden, um Zeitfenster ohne Stimmaktivität als Pausen zu markieren und von der Pitch-Bewertung auszuschließen.
5. THE Pitch_Extraktor SHALL Töne auf mindestens einen halben Halbton (50 Cents) genau erkennen.
6. THE Pitch_Extraktor SHALL die extrahierten Frequenzen in MIDI_Werte oder Cents umrechnen, um eine normalisierte Vergleichsbasis zu schaffen.

### Anforderung 7: Vergleichsalgorithmus (Pitch und Timing)

**User Story:** Als Nutzer möchte ich, dass mein Gesang fair mit der Referenz verglichen wird, auch wenn ich leichte Tempo-Schwankungen habe, damit die Bewertung meine tatsächliche Leistung widerspiegelt.

#### Akzeptanzkriterien

1. THE Analyse_Worker SHALL die DTW-Methode verwenden, um die Zeitachsen der Nutzer-Aufnahme und der Referenz_Daten abzugleichen und geringfügige Tempo-Schwankungen auszugleichen.
2. THE Analyse_Worker SHALL den Pitch_Score berechnen, indem die Differenz in Cents zwischen den ausgerichteten Pitch-Werten des Nutzers und der Referenz ermittelt wird.
3. THE Analyse_Worker SHALL Pitch-Abweichungen unter 50 Cents als korrekt (Gut) bewerten.
4. THE Analyse_Worker SHALL Pitch-Abweichungen zwischen 50 und 100 Cents als akzeptabel bewerten.
5. THE Analyse_Worker SHALL Pitch-Abweichungen über 100 Cents als fehlerhaft bewerten.
6. THE Analyse_Worker SHALL den Timing_Score berechnen, indem die zeitliche Abweichung der Onsets des Nutzers von den Onsets der Referenz ermittelt wird.
7. THE Analyse_Worker SHALL den Gesamt_Score als gewichteten Durchschnitt aus Pitch_Score und Timing_Score berechnen.
8. THE Analyse_Worker SHALL die Analyse eines 30-sekündigen Clips in maximal 5 Sekunden abschließen.

### Anforderung 8: Analyse im Hintergrund

**User Story:** Als Nutzer möchte ich, dass die Analyse im Hintergrund läuft, damit das UI während der Verarbeitung reaktionsfähig bleibt.

#### Akzeptanzkriterien

1. THE System SHALL die Pitch-Extraktion und den Vergleichsalgorithmus in einem Analyse_Worker ausführen, um den Haupt-Thread nicht zu blockieren.
2. WHILE der Aufnahme_Zustand ANALYSE ist, THE Vocal_Trainer_Ansicht SHALL einen Ladeindikator mit Fortschrittsanzeige darstellen.
3. WHEN die Analyse abgeschlossen ist, THE Analyse_Worker SHALL die Ergebnisse (Pitch_Score, Timing_Score, Gesamt_Score und die ausgerichteten Pitch-Kurven) an den Haupt-Thread übermitteln.
4. WHEN die Ergebnisse empfangen werden, THE System SHALL den Aufnahme_Zustand auf ERGEBNIS setzen.
5. IF während der Analyse ein Fehler auftritt, THEN THE System SHALL eine Fehlermeldung anzeigen und den Aufnahme_Zustand auf BEREIT zurücksetzen.

### Anforderung 9: Feedback-Visualisierung

**User Story:** Als Nutzer möchte ich eine grafische Auswertung meiner Leistung sehen, damit ich verstehe, wo ich gut gesungen habe und wo ich mich verbessern kann.

#### Akzeptanzkriterien

1. WHEN der Aufnahme_Zustand ERGEBNIS ist, THE Feedback_Ansicht SHALL den Vergleichs_Graph anzeigen, der die Pitch-Kurve der Referenz und die Pitch-Kurve des Nutzers übereinander darstellt.
2. THE Feedback_Ansicht SHALL die Pitch-Kurve des Nutzers farbkodiert darstellen: Grün für Abweichungen unter 50 Cents, Gelb für Abweichungen zwischen 50 und 100 Cents, Rot für Abweichungen über 100 Cents.
3. THE Feedback_Ansicht SHALL den Pitch_Score als prozentualen Wert anzeigen.
4. THE Feedback_Ansicht SHALL den Timing_Score als prozentualen Wert anzeigen.
5. THE Feedback_Ansicht SHALL den Gesamt_Score als prozentualen Wert prominent anzeigen.
6. THE Feedback_Ansicht SHALL einen Button bereitstellen, um eine neue Aufnahme zu starten (Aufnahme_Zustand zurück auf BEREIT).
7. THE Feedback_Ansicht SHALL einen Button bereitstellen, um zur Song-Detailseite zurückzukehren.

### Anforderung 10: Textanzeige im Karaoke-Stil während der Aufnahme

**User Story:** Als Nutzer möchte ich den Songtext während der Aufnahme im Karaoke-Stil sehen, damit ich den Text mitsingen kann, ohne ihn auswendig zu kennen.

#### Akzeptanzkriterien

1. WHILE der Aufnahme_Zustand AUFNAHME ist, THE Vocal_Trainer_Ansicht SHALL den Songtext in einer Vollbild-Ansicht mit Gradient-Hintergrund anzeigen, analog zum bestehenden Karaoke-Lesemodus.
2. WHILE der Aufnahme_Zustand AUFNAHME ist, THE Vocal_Trainer_Ansicht SHALL die aktive Zeile vertikal zentriert und hervorgehoben darstellen.
3. WHILE der Aufnahme_Zustand AUFNAHME ist, THE Vocal_Trainer_Ansicht SHALL den Strophentitel der aktuellen Zeile oben mittig anzeigen.
4. WHILE der Aufnahme_Zustand AUFNAHME ist, THE Vocal_Trainer_Ansicht SHALL den Song-Titel und den Künstlernamen unten mittig anzeigen.
5. WHEN ein Timecode einer Strophe erreicht wird, THE Vocal_Trainer_Ansicht SHALL automatisch zur entsprechenden Zeile wechseln und die Auto-Scroll-Geschwindigkeit anpassen.
6. THE Vocal_Trainer_Ansicht SHALL die nicht-aktiven Zeilen der aktuellen Strophe mit reduzierter Deckkraft darstellen.

### Anforderung 11: Referenz-Daten Serialisierung

**User Story:** Als Entwickler möchte ich, dass die Referenz-Daten in einem definierten JSON-Format gespeichert und geladen werden, damit die Analyse konsistent und zuverlässig arbeitet.

#### Akzeptanzkriterien

1. THE System SHALL Referenz_Daten als JSON-Struktur serialisieren, die folgende Felder enthält: `songId`, `sampleRate`, `windowSize`, `frames` (Array aus Objekten mit `timestampMs`, `f0Hz`, `midiValue`, `isVoiced`, `isOnset`).
2. THE System SHALL Referenz_Daten aus einer gültigen JSON-Struktur deserialisieren und in ein typisiertes Objekt umwandeln.
3. THE System SHALL beim Deserialisieren ungültiger JSON-Strukturen einen beschreibenden Fehler zurückgeben.
4. FOR ALL gültige Referenz_Daten-Objekte, das Serialisieren und anschließende Deserialisieren SHALL ein äquivalentes Objekt erzeugen (Round-Trip-Eigenschaft).

### Anforderung 12: Pitch-Daten Serialisierung

**User Story:** Als Entwickler möchte ich, dass die extrahierten Pitch-Daten der Nutzer-Aufnahme in einem definierten Format vorliegen, damit der Vergleichsalgorithmus konsistent arbeitet.

#### Akzeptanzkriterien

1. THE Pitch_Extraktor SHALL die extrahierten Daten als Array von Frames ausgeben, wobei jeder Frame `timestampMs`, `f0Hz`, `midiValue`, `isVoiced` und `confidence` enthält.
2. THE System SHALL die Pitch-Daten als JSON serialisieren und deserialisieren können.
3. FOR ALL gültige Pitch-Daten-Arrays, das Serialisieren und anschließende Deserialisieren SHALL ein äquivalentes Array erzeugen (Round-Trip-Eigenschaft).

### Anforderung 13: Aufnahme-Session speichern

**User Story:** Als Nutzer möchte ich, dass meine Vocal-Trainer-Sessions gespeichert werden, damit mein Lernfortschritt erfasst wird.

#### Akzeptanzkriterien

1. WHEN die Analyse abgeschlossen ist und der Aufnahme_Zustand auf ERGEBNIS wechselt, THE System SHALL eine Session mit der Lernmethode VOCAL_TRAINER in der Datenbank speichern.
2. THE System SHALL den Gesamt_Score der Session zuordnen, sodass der Fortschritt über mehrere Sessions nachvollziehbar ist.
3. IF das Speichern der Session fehlschlägt, THEN THE System SHALL die Ergebnisse trotzdem in der Feedback_Ansicht anzeigen und eine unauffällige Fehlermeldung ausgeben.

### Anforderung 14: Tastaturnavigation und Barrierefreiheit

**User Story:** Als Nutzer mit Einschränkungen möchte ich den Vocal Trainer mit assistiven Technologien bedienen können, damit ich gleichberechtigt am Gesangstraining teilnehmen kann.

#### Akzeptanzkriterien

1. THE Vocal_Trainer_Ansicht SHALL den Zurück-Button mit einem `aria-label="Zurück zur Song-Detailseite"` versehen.
2. THE Vocal_Trainer_Ansicht SHALL den Aufnahme-Button mit einem `aria-label` versehen, das den aktuellen Zustand widerspiegelt ("Aufnahme starten", "Aufnahme stoppen" oder "Neue Aufnahme starten").
3. WHEN der Aufnahme_Zustand wechselt, THE Vocal_Trainer_Ansicht SHALL den neuen Zustand über eine `aria-live="polite"` Region an Screenreader kommunizieren.
4. THE Feedback_Ansicht SHALL die Score-Werte mit `aria-label`-Attributen versehen, die den Kontext beschreiben (z.B. "Pitch-Score: 85 Prozent").
5. THE Vocal_Trainer_Ansicht SHALL alle interaktiven Elemente mit einer Mindest-Tippfläche von 44×44px darstellen.
6. WHEN der Nutzer die Escape-Taste drückt, THE Vocal_Trainer_Ansicht SHALL zur Song-Detailseite navigieren.
7. THE Vocal_Trainer_Ansicht SHALL per Tastatur vollständig navigierbar sein (Tab-Reihenfolge folgt der logischen Interaktionsreihenfolge).
8. THE Vergleichs_Graph SHALL eine textuelle Zusammenfassung als `aria-label` bereitstellen, die die wesentlichen Ergebnisse beschreibt.

### Anforderung 15: Fehlerbehandlung bei Umgebungsgeräuschen

**User Story:** Als Nutzer möchte ich, dass Umgebungsgeräusche die Analyse möglichst wenig beeinflussen, damit ich auch in nicht perfekt ruhigen Umgebungen sinnvolles Feedback erhalte.

#### Akzeptanzkriterien

1. THE Pitch_Extraktor SHALL ein Noise-Gate anwenden, um Signale unterhalb eines konfigurierbaren Schwellenwerts als Stille zu behandeln.
2. THE Pitch_Extraktor SHALL Zeitfenster mit niedriger Konfidenz (confidence < 0.5) von der Pitch-Bewertung ausschließen.
3. IF die Aufnahme überwiegend aus Stille oder Rauschen besteht (weniger als 20% stimmaktive Frames), THEN THE System SHALL eine Warnung anzeigen, dass die Aufnahme zu wenig Gesang enthält, und dem Nutzer eine erneute Aufnahme empfehlen.

### Anforderung 16: Audio-Quellen als Instrumental oder Referenz-Vokal markieren

**User Story:** Als Nutzer möchte ich meine Audio-Dateien als Instrumental (Playback-Track für den Player) oder Referenz-Vokal markieren können, damit das System weiß, welche Dateien es für Playback und Analyse nutzen muss.

#### Akzeptanzkriterien

1. THE System SHALL das bestehende AudioQuelle-Modell um ein Feld `rolle` vom Typ Audio_Rolle erweitern, das die Werte STANDARD, INSTRUMENTAL und REFERENZ_VOKAL annehmen kann.
2. THE System SHALL den Standardwert des Feldes `rolle` auf STANDARD setzen, sodass bestehende Audio-Quellen unverändert funktionieren.
3. THE System SHALL in der Audio-Quellen-Verwaltung eines Songs für jede AudioQuelle ein Auswahlfeld (Dropdown oder Segmented Control) anzeigen, über das der Nutzer die Audio_Rolle zuweisen kann.
4. THE System SHALL pro Song maximal eine AudioQuelle mit der Rolle INSTRUMENTAL und maximal eine mit der Rolle REFERENZ_VOKAL zulassen.
5. IF der Nutzer eine AudioQuelle als INSTRUMENTAL markiert und bereits eine andere AudioQuelle diese Rolle hat, THEN THE System SHALL die Rolle der bisherigen AudioQuelle auf STANDARD zurücksetzen.
6. IF der Nutzer eine AudioQuelle als REFERENZ_VOKAL markiert und bereits eine andere AudioQuelle diese Rolle hat, THEN THE System SHALL die Rolle der bisherigen AudioQuelle auf STANDARD zurücksetzen.
7. WHEN die Vocal_Trainer_Ansicht geöffnet wird, THE System SHALL die AudioQuelle mit der Rolle INSTRUMENTAL als Playback-Track laden.
8. WHEN die Vocal_Trainer_Ansicht geöffnet wird, THE System SHALL die AudioQuelle mit der Rolle REFERENZ_VOKAL als Basis für die Referenz_Daten verwenden.
9. IF für einen Song keine AudioQuelle mit der Rolle INSTRUMENTAL vorhanden ist, THEN THE Vocal_Trainer_Ansicht SHALL eine Meldung anzeigen, dass kein Instrumental zugewiesen ist, und den Aufnahme-Button deaktivieren.
10. THE System SHALL die Rollenzuweisung über die bestehende API `/api/songs/[id]/audio-quellen` per PATCH-Request ermöglichen.
11. THE System SHALL das Auswahlfeld für die Audio_Rolle mit einem `aria-label="Rolle der Audio-Quelle"` versehen.
