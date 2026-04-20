# Requirements Document

## Einführung

Dieses Feature erweitert die bestehenden Kommentar- und Instrumental-Annotationen um Taktbereich-Angaben (Start-Takt und End-Takt). In der Pitch-Anzeige (PitchDisplay) werden diese Annotationen als farbige horizontale Balken unterhalb der Pitch-Balken dargestellt. Kommentar- und Instrumental-Annotationen erhalten jeweils eine eigene Farbe. Der Annotationstext wird auf dem Balken angezeigt; bei kurzen Balken erscheint der Text in einer Sprechblasen-Darstellung, damit der Balken nicht breiter als der tatsächliche Taktbereich wird.

## Glossar

- **Strophe**: Eine Strophe (Verse, Chorus, Bridge etc.) eines Songs, bestehend aus Zeilen
- **Zeile**: Eine einzelne Textzeile innerhalb einer Strophe
- **Instrumental-Sektion**: Eine Strophe mit `istInstrumental === true`, die als rein instrumental markiert ist
- **Kommentar-Zeile**: Eine Zeile mit `istKommentar === true`, die als Annotation markiert ist
- **Takt**: Ein Takt (Measure/Bar) im musikalischen Sinne, nummeriert ab 1
- **Taktbereich**: Ein zusammenhängender Bereich von Start-Takt bis End-Takt (inklusive)
- **BeatPositionenMs**: Array von Beat-Zeitpunkten in Millisekunden, aus der Beat-Erkennung
- **TaktZaehler**: Anzahl der Beats pro Takt (z.B. 4 für 4/4-Takt)
- **TaktNummer**: Die Nummer eines Takts, berechnet als `Math.floor(beatIndex / taktZaehler) + 1`
- **PitchDisplay**: Die SVG-Komponente zur Visualisierung von Pitch-Balken und Wiedergabe-Cursor
- **AnnotationsBalken**: Ein farbiger horizontaler Balken in der PitchDisplay, der einen Taktbereich einer Annotation visualisiert
- **Sprechblase**: Eine Tooltip-artige Darstellung für Annotationstext, die über den Balken hinausragen darf, wenn der Balken zu kurz für den Text ist
- **Timecode-Markup**: Ein Markup-Eintrag vom Typ `TIMECODE` mit `ziel === "STROPHE"`, der einer Strophe einen Millisekunden-Zeitpunkt zuordnet (aus dem bestehenden Timecode-System)
- **StropheService**: Der Backend-Service für CRUD-Operationen auf Strophen
- **ZeileService**: Der Backend-Service für CRUD-Operationen auf Zeilen
- **TaktKonverter**: Die Hilfsfunktion, die Taktnummern in Millisekunden-Zeitpunkte umrechnet
- **StropheEditor**: Die UI-Komponente zum Bearbeiten einer Strophe im Song-Editor
- **ZeileEditor**: Die UI-Komponente zum Bearbeiten einer Zeile im Song-Editor

## Requirements

### Requirement 1: Datenmodell-Erweiterung um Taktbereich

**User Story:** Als Nutzer möchte ich für Instrumental-Strophen und Kommentar-Zeilen einen Start- und End-Takt angeben können, damit die Annotation einem bestimmten Taktbereich im Song zugeordnet wird.

#### Acceptance Criteria für Requirement 1

1. THE Prisma-Schema SHALL das Strophe-Modell um ein optionales Feld `startTakt` vom Typ `Int` erweitern
2. THE Prisma-Schema SHALL das Strophe-Modell um ein optionales Feld `endTakt` vom Typ `Int` erweitern
3. THE Prisma-Schema SHALL das Zeile-Modell um ein optionales Feld `startTakt` vom Typ `Int` erweitern
4. THE Prisma-Schema SHALL das Zeile-Modell um ein optionales Feld `endTakt` vom Typ `Int` erweitern
5. THE TypeScript-Typen SHALL `StropheDetail` um die Felder `startTakt: number | null` und `endTakt: number | null` erweitern
6. THE TypeScript-Typen SHALL `ZeileDetail` um die Felder `startTakt: number | null` und `endTakt: number | null` erweitern
7. THE TypeScript-Typen SHALL `UpdateStropheInput` um die optionalen Felder `startTakt?: number | null` und `endTakt?: number | null` erweitern
8. THE TypeScript-Typen SHALL `UpdateZeileInput` um die optionalen Felder `startTakt?: number | null` und `endTakt?: number | null` erweitern
9. THE TypeScript-Typen SHALL `ImportStropheInput` um die optionalen Felder `startTakt?: number` und `endTakt?: number` erweitern
10. THE TypeScript-Typen SHALL `ImportZeileInput` um die optionalen Felder `startTakt?: number` und `endTakt?: number` erweitern

### Requirement 2: Validierung der Taktbereich-Werte

**User Story:** Als Entwickler möchte ich sicherstellen, dass Taktbereich-Angaben konsistent und gültig sind, damit keine ungültigen Daten in die Datenbank gelangen.

#### Acceptance Criteria für Requirement 2

1. WHEN ein `startTakt`-Wert gesetzt wird, THE StropheService SHALL prüfen, dass der Wert eine positive Ganzzahl (≥ 1) ist
2. WHEN ein `endTakt`-Wert gesetzt wird, THE StropheService SHALL prüfen, dass der Wert eine positive Ganzzahl (≥ 1) ist
3. WHEN sowohl `startTakt` als auch `endTakt` gesetzt sind, THE StropheService SHALL prüfen, dass `startTakt ≤ endTakt` gilt
4. IF `startTakt` gesetzt ist und `endTakt` nicht, THEN THE StropheService SHALL den Wert akzeptieren (End-Takt wird als gleich Start-Takt interpretiert)
5. IF `endTakt` gesetzt ist und `startTakt` nicht, THEN THE StropheService SHALL einen Validierungsfehler zurückgeben
6. WHEN ein `startTakt`-Wert gesetzt wird, THE ZeileService SHALL prüfen, dass der Wert eine positive Ganzzahl (≥ 1) ist
7. WHEN ein `endTakt`-Wert gesetzt wird, THE ZeileService SHALL prüfen, dass der Wert eine positive Ganzzahl (≥ 1) ist
8. WHEN sowohl `startTakt` als auch `endTakt` gesetzt sind, THE ZeileService SHALL prüfen, dass `startTakt ≤ endTakt` gilt
9. IF `endTakt` gesetzt ist und `startTakt` nicht, THEN THE ZeileService SHALL einen Validierungsfehler zurückgeben
10. FOR ALL gültigen Taktbereich-Eingaben, die Validierung SHALL die Invariante `startTakt ≤ endTakt` sicherstellen (Invariante)

### Requirement 3: API-Endpunkte für Taktbereich

**User Story:** Als Entwickler möchte ich die bestehenden Update-Endpunkte nutzen können, um Taktbereiche für Strophen und Zeilen zu setzen und zu entfernen.

#### Acceptance Criteria für Requirement 3

1. WHEN ein PATCH-Request für eine Strophe die Felder `startTakt` und/oder `endTakt` enthält, THE StropheService SHALL die Werte in der Datenbank aktualisieren
2. WHEN ein PATCH-Request für eine Zeile die Felder `startTakt` und/oder `endTakt` enthält, THE ZeileService SHALL die Werte in der Datenbank aktualisieren
3. WHEN ein PATCH-Request `startTakt: null` und `endTakt: null` sendet, THE StropheService SHALL die Taktbereich-Felder auf `null` setzen (Taktbereich entfernen)
4. WHEN ein PATCH-Request `startTakt: null` und `endTakt: null` sendet, THE ZeileService SHALL die Taktbereich-Felder auf `null` setzen (Taktbereich entfernen)
5. WHEN die Strophen eines Songs abgerufen werden, THE API SHALL die Felder `startTakt` und `endTakt` in der Antwort für jede Strophe enthalten
6. WHEN die Zeilen einer Strophe abgerufen werden, THE API SHALL die Felder `startTakt` und `endTakt` in der Antwort für jede Zeile enthalten

### Requirement 4: Takt-zu-Millisekunden-Konvertierung

**User Story:** Als Entwickler möchte ich Taktnummern in Millisekunden-Zeitpunkte umrechnen können, damit die Annotationsbalken korrekt in der zeitbasierten PitchDisplay positioniert werden.

#### Acceptance Criteria für Requirement 4

1. THE TaktKonverter SHALL eine Funktion `taktZuMs(taktNummer, beatPositionenMs, taktZaehler)` bereitstellen, die eine Taktnummer in einen Millisekunden-Zeitpunkt umrechnet
2. WHEN eine Taktnummer konvertiert wird, THE TaktKonverter SHALL den Millisekunden-Wert des ersten Beats des angegebenen Takts zurückgeben
3. THE TaktKonverter SHALL eine Funktion `taktEndZuMs(taktNummer, beatPositionenMs, taktZaehler)` bereitstellen, die den Millisekunden-Zeitpunkt des Endes eines Takts zurückgibt (erster Beat des nächsten Takts oder letzter bekannter Beat)
4. IF die angegebene Taktnummer über die verfügbaren Beat-Positionen hinausgeht, THEN THE TaktKonverter SHALL den letzten bekannten Beat-Zeitpunkt zurückgeben
5. IF keine Beat-Positionen vorhanden sind, THEN THE TaktKonverter SHALL `null` zurückgeben
6. FOR ALL gültigen Taktnummern t mit t ≥ 1, `taktZuMs(t)` SHALL einen Wert ≤ `taktEndZuMs(t)` zurückgeben (Invariante)
7. FOR ALL aufeinanderfolgenden Taktnummern t1 < t2, `taktZuMs(t1)` SHALL einen Wert ≤ `taktZuMs(t2)` zurückgeben (Monotonie)
8. FOR ALL gültigen Taktnummern, `taktZuMs(t)` und `taktEndZuMs(t)` SHALL Werte zurückgeben, die innerhalb des Bereichs der Beat-Positionen liegen (Bereichs-Invariante)

### Requirement 5: Annotationsbalken-Datenaufbereitung

**User Story:** Als Entwickler möchte ich aus den Strophen- und Zeilen-Daten eine Liste von Annotationsbalken berechnen, die in der PitchDisplay gerendert werden können.

#### Acceptance Criteria für Requirement 5

1. THE PitchDisplay SHALL einen neuen Typ `AnnotationsBalken` definieren mit den Feldern: `startMs`, `endMs`, `text`, `typ` ("kommentar" oder "instrumental")
2. WHEN Strophen mit `istInstrumental === true` und gesetztem Taktbereich vorhanden sind, THE Datenaufbereitung SHALL für jede solche Strophe einen AnnotationsBalken vom Typ "instrumental" erzeugen
3. WHEN Zeilen mit `istKommentar === true` und gesetztem Taktbereich vorhanden sind, THE Datenaufbereitung SHALL für jede solche Zeile einen AnnotationsBalken vom Typ "kommentar" erzeugen
4. THE Datenaufbereitung SHALL den `text` des AnnotationsBalkens aus dem Strophen-Namen (bei Instrumental) bzw. dem Zeilen-Text (bei Kommentar) ableiten
5. WHEN eine Instrumental-Strophe keinen Taktbereich hat (startTakt und endTakt sind null), aber einen Timecode-Markup besitzt, THE Datenaufbereitung SHALL einen AnnotationsBalken erzeugen, der vom Timecode der Instrumental-Strophe bis zum Timecode der nächsten Strophe (nach orderIndex) reicht
6. WHEN eine Instrumental-Strophe keinen Taktbereich und keinen Timecode hat, THE Datenaufbereitung SHALL keinen AnnotationsBalken für diese Strophe erzeugen
7. WHEN eine Kommentar-Zeile keinen Taktbereich hat (startTakt und endTakt sind null), THE Datenaufbereitung SHALL keinen AnnotationsBalken für diese Zeile erzeugen
8. FOR ALL erzeugten AnnotationsBalken, `startMs` SHALL kleiner oder gleich `endMs` sein (Invariante)

### Requirement 6: Rendering der Annotationsbalken in der PitchDisplay

**User Story:** Als Nutzer möchte ich Kommentar- und Instrumental-Annotationen als farbige Balken in der Pitch-Anzeige sehen, damit ich die Songstruktur visuell erfassen kann.

#### Acceptance Criteria für Requirement 6

1. WHEN AnnotationsBalken vorhanden sind, THE PitchDisplay SHALL diese als horizontale Balken unterhalb der Pitch-Balken rendern
2. THE PitchDisplay SHALL Annotationsbalken vom Typ "instrumental" in einer eigenen Farbe darstellen (z.B. Blau/Cyan-Ton, `rgba(56, 189, 248, 0.6)`)
3. THE PitchDisplay SHALL Annotationsbalken vom Typ "kommentar" in einer eigenen Farbe darstellen (z.B. Amber/Orange-Ton, `rgba(251, 191, 36, 0.6)`)
4. THE PitchDisplay SHALL die Annotationsbalken in einem reservierten Bereich am unteren Rand des SVG rendern, getrennt von den Pitch-Balken
5. THE PitchDisplay SHALL den Annotationstext auf dem jeweiligen Balken anzeigen
6. THE PitchDisplay SHALL die Annotationsbalken mit abgerundeten Ecken rendern, konsistent mit den Pitch-Balken
7. WHEN mehrere Annotationsbalken sich zeitlich überlappen, THE PitchDisplay SHALL die Balken in separaten Zeilen (Lanes) untereinander stapeln
8. THE PitchDisplay SHALL nur Annotationsbalken rendern, die im aktuellen Viewport sichtbar sind (Viewport-Filterung analog zu Pitch-Balken)

### Requirement 7: Sprechblasen-Darstellung für kurze Annotationen

**User Story:** Als Nutzer möchte ich den Annotationstext auch bei kurzen Taktbereichen lesen können, ohne dass der Balken künstlich verlängert wird.

#### Acceptance Criteria für Requirement 7

1. WHEN die Pixel-Breite eines Annotationsbalkens kleiner ist als die Textbreite des Annotationstexts, THE PitchDisplay SHALL den Text in einer Sprechblasen-Darstellung anzeigen
2. THE Sprechblase SHALL über den Balken hinausragen dürfen, ohne die Balkenbreite zu verändern
3. THE Sprechblase SHALL einen halbtransparenten Hintergrund in der Farbe des Annotationstyps haben
4. THE Sprechblase SHALL mit einem kleinen Pfeil oder Dreieck auf den zugehörigen Balken zeigen
5. WHEN die Pixel-Breite eines Annotationsbalkens ausreichend für den Text ist, THE PitchDisplay SHALL den Text direkt auf dem Balken anzeigen (ohne Sprechblase)
6. THE Sprechblase SHALL den Text nicht abschneiden und vollständig lesbar darstellen

### Requirement 8: Editor-UI für Taktbereich-Eingabe

**User Story:** Als Nutzer möchte ich im Song-Editor Start- und End-Takt für Instrumental-Strophen und Kommentar-Zeilen eingeben können, damit ich die Taktbereiche direkt beim Bearbeiten festlegen kann.

#### Acceptance Criteria für Requirement 8

1. WHEN eine Strophe als Instrumental markiert ist, THE StropheEditor SHALL zwei Eingabefelder für Start-Takt und End-Takt anzeigen
2. WHEN eine Zeile als Kommentar markiert ist, THE ZeileEditor SHALL zwei Eingabefelder für Start-Takt und End-Takt anzeigen
3. WHEN der Nutzer gültige Taktwerte eingibt und bestätigt, THE Editor SHALL einen PATCH-Request an die API senden, um die Taktbereich-Felder zu aktualisieren
4. WHEN der Nutzer die Taktbereich-Felder leert, THE Editor SHALL einen PATCH-Request mit `startTakt: null` und `endTakt: null` senden
5. WHEN eine Strophe nicht als Instrumental markiert ist, THE StropheEditor SHALL die Taktbereich-Eingabefelder ausblenden
6. WHEN eine Zeile nicht als Kommentar markiert ist, THE ZeileEditor SHALL die Taktbereich-Eingabefelder ausblenden
7. IF der Nutzer einen End-Takt eingibt, der kleiner als der Start-Takt ist, THEN THE Editor SHALL eine Fehlermeldung anzeigen und den PATCH-Request nicht absenden
8. THE Eingabefelder SHALL nur positive Ganzzahlen akzeptieren (Typ `number`, min=1, step=1)
9. WHEN der Taktbereich-Wert sich ändert, THE Editor SHALL den lokalen State sofort aktualisieren (optimistic update) und bei API-Fehler den vorherigen Zustand wiederherstellen

### Requirement 9: PitchDisplay-Prop-Erweiterung

**User Story:** Als Entwickler möchte ich die Annotationsdaten an die PitchDisplay-Komponente übergeben können, damit die Annotationsbalken gerendert werden.

#### Acceptance Criteria für Requirement 9

1. THE PitchDisplay SHALL eine neue optionale Prop `annotationen` vom Typ `AnnotationsBalken[]` akzeptieren
2. WHEN die Prop `annotationen` nicht übergeben wird oder ein leeres Array ist, THE PitchDisplay SHALL keine Annotationsbalken rendern und das Layout unverändert lassen
3. WHEN die Prop `annotationen` Einträge enthält, THE PitchDisplay SHALL den SVG-Bereich um die Höhe der Annotationsbalken-Zone erweitern
4. THE PitchDisplay SHALL die bestehende Funktionalität (Pitch-Balken, Cursor, Hilfslinien, Beat-Marker, Tastatur-Navigation, Barrierefreiheit) unverändert beibehalten

### Requirement 10: Song-Import mit Taktbereich

**User Story:** Als Nutzer möchte ich beim Song-Import Taktbereiche für Instrumental-Strophen und Kommentar-Zeilen angeben können, damit ich die Taktbereiche nicht nachträglich einzeln setzen muss.

#### Acceptance Criteria für Requirement 10

1. WHEN ein Song importiert wird, THE Import-Funktion SHALL die optionalen Felder `startTakt` und `endTakt` pro Strophe akzeptieren
2. WHEN ein Song importiert wird, THE Import-Funktion SHALL die optionalen Felder `startTakt` und `endTakt` pro Zeile akzeptieren
3. IF beim Import `startTakt` oder `endTakt` nicht angegeben wird, THEN THE Import-Funktion SHALL die Felder auf `null` setzen
4. WHEN beim Import Taktbereich-Werte angegeben werden, THE Import-Funktion SHALL die gleiche Validierung wie bei der API anwenden (startTakt ≤ endTakt, positive Ganzzahlen)

### Requirement 11: Barrierefreiheit der Annotationsbalken

**User Story:** Als Nutzer mit Screenreader möchte ich über die Annotationsbalken informiert werden, damit ich die Songstruktur auch ohne visuelle Darstellung erfassen kann.

#### Acceptance Criteria für Requirement 11

1. WHEN Annotationsbalken in der PitchDisplay vorhanden sind, THE PitchDisplay SHALL das `aria-label` um die Anzahl der Annotationen erweitern
2. THE Annotationsbalken SHALL jeweils ein `aria-label` mit Typ, Text und Taktbereich erhalten (z.B. "Instrumental: Solo, Takt 5 bis 12")
3. WHEN keine Annotationsbalken vorhanden sind, THE PitchDisplay SHALL das bestehende `aria-label` unverändert beibehalten
