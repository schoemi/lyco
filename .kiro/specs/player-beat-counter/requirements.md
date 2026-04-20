# Requirements Document

## Introduction

Der normale Audio-Player auf der Song-Detail-Seite zeigt aktuell Beat-Marker auf dem Fortschrittsbalken, aber keine Takt/Schlag-Anzeige. Im Karaoke-Modus existiert bereits ein `BeatCounter`, der Taktnummer und Schlag-Position anzeigt (z.B. "4.2" = Takt 4, Schlag 2). Dieses Feature bringt dieselbe Takt-Anzeige in den normalen Audio-Player und die StickyPlayerBar, sodass Nutzer auch ohne Karaoke-Modus sehen können, in welchem Takt und auf welchem Schlag sie sich befinden.

## Glossary

- **Audio_Player**: Die Hauptkomponente zur Audiowiedergabe auf der Song-Detail-Seite (`audio-player.tsx`), bestehend aus Quellen-Tabs, Play/Pause-Button, Zeitanzeige und Fortschrittsbalken
- **Sticky_Player_Bar**: Die fixierte Player-Leiste am unteren Bildschirmrand, die erscheint wenn der Audio_Player aus dem sichtbaren Bereich scrollt (`sticky-player-bar.tsx`)
- **Beat_Counter**: Eine kompakte UI-Komponente, die die aktuelle Taktnummer und Schlagposition innerhalb des Takts anzeigt (z.B. "4.2" = Takt 4, Schlag 2)
- **Beat_Ergebnis**: Das gespeicherte Ergebnis der Beat-Erkennung, enthält `beatPositionenMs`, `offsetMs`, `taktZaehler` und `taktNenner`
- **Takt_Nummer**: Die fortlaufende Nummer des aktuellen Takts, berechnet als `floor(beatIndex / taktZaehler) + 1`
- **Schlag_Position**: Die Position innerhalb des aktuellen Takts, berechnet als `(beatIndex % taktZaehler) + 1`
- **Beat_Position**: Ein Zeitpunkt in Millisekunden, an dem ein Beat erkannt wurde, gespeichert im Array `beatPositionenMs`
- **Offset_Ms**: Ein Versatz in Millisekunden, der auf alle Beat-Positionen addiert wird, um die Synchronisation zu korrigieren

## Requirements

### Requirement 1: Takt-Anzeige im Audio-Player

**User Story:** Als Nutzer möchte ich im normalen Audio-Player die aktuelle Taktposition sehen, damit ich beim Üben weiß, in welchem Takt und auf welchem Schlag ich mich befinde.

#### Acceptance Criteria

1. WHEN ein Beat_Ergebnis mit mindestens einer Beat_Position vorhanden ist, THE Audio_Player SHALL einen Beat_Counter neben der Zeitanzeige darstellen
2. WHEN kein Beat_Ergebnis vorhanden ist, THE Audio_Player SHALL keinen Beat_Counter anzeigen
3. WHILE Audio wiedergegeben wird, THE Beat_Counter SHALL die aktuelle Takt_Nummer und Schlag_Position basierend auf der Wiedergabeposition aktualisieren
4. THE Beat_Counter SHALL die Takt_Nummer und Schlag_Position im Format "{Takt}.{Schlag}" anzeigen (z.B. "4.2")
5. WHEN die Wiedergabeposition vor dem ersten Beat liegt, THE Beat_Counter SHALL einen Platzhalter "—" anzeigen

### Requirement 2: Takt-Anzeige in der Sticky Player Bar

**User Story:** Als Nutzer möchte ich auch in der fixierten Player-Leiste die Taktposition sehen, damit die Information beim Scrollen nicht verloren geht.

#### Acceptance Criteria

1. WHEN ein Beat_Ergebnis vorhanden ist und die Sticky_Player_Bar sichtbar ist, THE Sticky_Player_Bar SHALL einen Beat_Counter anzeigen
2. THE Sticky_Player_Bar Beat_Counter SHALL dieselbe Takt_Nummer und Schlag_Position wie der Audio_Player Beat_Counter anzeigen
3. WHEN kein Beat_Ergebnis vorhanden ist, THE Sticky_Player_Bar SHALL keinen Beat_Counter anzeigen

### Requirement 3: Korrekte Berechnung der Taktposition

**User Story:** Als Nutzer möchte ich, dass die Taktposition korrekt berechnet wird, damit die Anzeige mit der Musik übereinstimmt.

#### Acceptance Criteria

1. THE Beat_Counter SHALL die Takt_Nummer als `floor(beatIndex / taktZaehler) + 1` berechnen, wobei `beatIndex` der Index des letzten Beats ist, dessen Position kleiner oder gleich der aktuellen Wiedergabeposition ist
2. THE Beat_Counter SHALL die Schlag_Position als `(beatIndex % taktZaehler) + 1` berechnen
3. WHEN der Offset_Ms ungleich null ist, THE Beat_Counter SHALL die offset-korrigierten Beat-Positionen für die Berechnung verwenden
4. THE Beat_Counter SHALL den `taktZaehler`-Wert aus dem Beat_Ergebnis verwenden (Standard: 4 für 4/4-Takt)

### Requirement 4: Barrierefreiheit der Takt-Anzeige

**User Story:** Als Nutzer mit Screenreader möchte ich die Taktposition vorgelesen bekommen, damit ich die Information auch ohne visuelle Darstellung nutzen kann.

#### Acceptance Criteria

1. THE Beat_Counter SHALL ein `aria-label` mit dem Text "Takt {Takt_Nummer}, Schlag {Schlag_Position}" bereitstellen
2. WHEN die Wiedergabeposition vor dem ersten Beat liegt, THE Beat_Counter SHALL ein `aria-label` mit dem Text "Kein aktiver Takt" bereitstellen

### Requirement 5: Wiederverwendbare Beat-Counter-Komponente

**User Story:** Als Entwickler möchte ich eine wiederverwendbare Beat-Counter-Komponente haben, damit die Logik nicht dupliziert wird und konsistent zwischen Audio_Player, Sticky_Player_Bar und Karaoke-Modus bleibt.

#### Acceptance Criteria

1. THE Beat_Counter SHALL als eigenständige, wiederverwendbare Komponente implementiert werden, die `beatPositionenMs`, `currentTimeMs` und `taktZaehler` als Props akzeptiert
2. THE Beat_Counter SHALL dieselbe Berechnungslogik verwenden wie der bestehende BeatCounter im Karaoke-Modus
3. THE Beat_Counter SHALL eine `variant`-Prop akzeptieren, die zwischen einer hellen Darstellung (für den normalen Player) und einer dunklen Darstellung (für den Karaoke-Modus) unterscheidet
