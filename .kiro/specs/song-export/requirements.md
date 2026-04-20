# Requirements Document

## Introduction

Das Song-Export-Feature ermöglicht es Benutzern, ihre Songs in verschiedenen Formaten zu exportieren: PDF, ChordPro, OnSong und SongbookPro. Jedes Format dient einem anderen Anwendungsfall – PDF für den Ausdruck, ChordPro als offener Standard, OnSong und SongbookPro für die Kompatibilität mit gängigen Musiker-Apps. Der Export bietet konfigurierbare Optionen, um Vocal-Tags, Instrumental-Sektionen und Kommentare ein- oder auszuschließen.

## Glossary

- **Export_Service**: Der serverseitige Dienst, der Song-Daten aus der Datenbank lädt und in das gewünschte Ausgabeformat konvertiert
- **PDF_Formatter**: Die Komponente, die Song-Daten in ein formatiertes PDF-Dokument umwandelt
- **ChordPro_Formatter**: Die Komponente, die Song-Daten in das standardisierte ChordPro-Textformat serialisiert
- **OnSong_Formatter**: Die Komponente, die Song-Daten in das OnSong-kompatible Format serialisiert
- **SongbookPro_Formatter**: Die Komponente, die Song-Daten in das SongbookPro-kompatible Format serialisiert
- **Export_Optionen**: Die vom Benutzer wählbaren Einstellungen, die den Inhalt des Exports steuern (Vocal-Tags, Instrumental-Sektionen, Kommentare)
- **Vocal_Tags**: Markup-Annotationen vom Typ ATMUNG, KOPFSTIMME, BRUSTSTIMME, BELT, FALSETT, PAUSE, WIEDERHOLUNG (MarkupTyp-Enum, ausgenommen TIMECODE)
- **Instrumental_Sektion**: Eine Strophe mit dem Flag istInstrumental=true
- **Kommentar**: Eine Zeile mit dem Flag istKommentar=true sowie Strophen-Analyse-Texte (Strophe.analyse)
- **Export_Dialog**: Die UI-Komponente, in der der Benutzer Format und Optionen für den Export auswählt
- **Song_Daten**: Der vollständige Song mit allen Relationen (Strophen, Zeilen, Markups, AudioQuellen), geladen über Prisma

## Requirements

### Requirement 1: Formatauswahl im Export-Dialog

**User Story:** Als Benutzer möchte ich beim Export ein Zielformat auswählen können, damit ich den Song im gewünschten Format erhalte.

#### Acceptance Criteria

1. WHEN der Benutzer den Export-Dialog öffnet, THE Export_Dialog SHALL die vier Formate PDF, ChordPro, OnSong und SongbookPro als auswählbare Optionen anzeigen
2. THE Export_Dialog SHALL genau ein Format als aktive Auswahl zulassen
3. WHEN der Benutzer kein Format ausgewählt hat, THE Export_Dialog SHALL die Export-Schaltfläche deaktiviert anzeigen

### Requirement 2: Export-Optionen konfigurieren

**User Story:** Als Benutzer möchte ich beim Export festlegen können, ob Vocal-Tags, Instrumental-Sektionen und Kommentare enthalten sein sollen, damit ich den Export-Inhalt an meinen Bedarf anpasse.

#### Acceptance Criteria

1. THE Export_Dialog SHALL drei unabhängige Toggles für die Export_Optionen anzeigen: Vocal-Tags, Instrumental-Sektionen und Kommentare
2. WHEN der Export-Dialog geöffnet wird, THE Export_Dialog SHALL alle drei Toggles standardmäßig auf aktiviert setzen
3. WHEN der Benutzer den Toggle für Vocal-Tags deaktiviert, THE Export_Service SHALL alle Markup-Annotationen (Typ ATMUNG, KOPFSTIMME, BRUSTSTIMME, BELT, FALSETT, PAUSE, WIEDERHOLUNG) aus der Ausgabe entfernen
4. WHEN der Benutzer den Toggle für Instrumental-Sektionen deaktiviert, THE Export_Service SHALL alle Strophen mit istInstrumental=true aus der Ausgabe entfernen
5. WHEN der Benutzer den Toggle für Kommentare deaktiviert, THE Export_Service SHALL alle Zeilen mit istKommentar=true und alle Strophen-Analyse-Texte aus der Ausgabe entfernen

### Requirement 3: PDF-Export

**User Story:** Als Benutzer möchte ich einen Song als PDF exportieren, damit ich ihn ausdrucken oder digital weitergeben kann.

#### Acceptance Criteria

1. WHEN der Benutzer den PDF-Export auslöst, THE PDF_Formatter SHALL ein PDF-Dokument erzeugen, das Titel und Künstler als Kopfzeile enthält
2. THE PDF_Formatter SHALL jede Strophe mit ihrem Namen als Überschrift und die zugehörigen Zeilen darunter darstellen
3. WHILE die Option Vocal-Tags aktiviert ist, THE PDF_Formatter SHALL Markup-Annotationen als farblich hervorgehobene Inline-Markierungen vor dem zugehörigen Text darstellen
4. WHILE die Option Instrumental-Sektionen aktiviert ist, THE PDF_Formatter SHALL instrumentale Strophen mit dem Label "[Instrumental]" und dem Strophen-Namen kennzeichnen
5. WHILE die Option Kommentare aktiviert ist, THE PDF_Formatter SHALL Kommentar-Zeilen kursiv und Strophen-Analyse-Texte als eingerückten Block darstellen
6. THE PDF_Formatter SHALL das PDF-Dokument als Datei mit dem Dateinamen "{Titel} - {Künstler}.pdf" bereitstellen

### Requirement 4: ChordPro-Export

**User Story:** Als Benutzer möchte ich einen Song im ChordPro-Format exportieren, damit ich ihn in ChordPro-kompatiblen Anwendungen verwenden kann.

#### Acceptance Criteria

1. WHEN der Benutzer den ChordPro-Export auslöst, THE ChordPro_Formatter SHALL eine Textdatei im ChordPro-Standard erzeugen
2. THE ChordPro_Formatter SHALL Titel und Künstler als ChordPro-Direktiven ({title:} und {artist:}) am Anfang der Datei ausgeben
3. THE ChordPro_Formatter SHALL jede Strophe mit einer Sektions-Direktive ({start_of_verse:}, {start_of_chorus:} oder {start_of_bridge:}) basierend auf dem Strophen-Namen einleiten und mit der entsprechenden End-Direktive abschließen
4. WHILE die Option Vocal-Tags aktiviert ist, THE ChordPro_Formatter SHALL Markup-Annotationen als ChordPro-kompatible Kommentar-Direktiven ({comment:}) vor der zugehörigen Zeile ausgeben
5. WHILE die Option Instrumental-Sektionen aktiviert ist, THE ChordPro_Formatter SHALL instrumentale Strophen mit {start_of_tab}/{end_of_tab} und einem Kommentar "[Instrumental]" kennzeichnen
6. WHILE die Option Kommentare aktiviert ist, THE ChordPro_Formatter SHALL Kommentar-Zeilen als {comment:}-Direktiven ausgeben
7. THE ChordPro_Formatter SHALL die Ausgabe als Datei mit dem Dateinamen "{Titel} - {Künstler}.cho" bereitstellen

### Requirement 5: ChordPro-Parser (Round-Trip)

**User Story:** Als Entwickler möchte ich sicherstellen, dass der ChordPro-Export verlustfrei ist, damit exportierte Dateien korrekt re-importiert werden können.

#### Acceptance Criteria

1. THE ChordPro_Formatter SHALL Song_Daten in eine gültige ChordPro-Textdarstellung serialisieren (Pretty-Print)
2. WHEN eine vom ChordPro_Formatter erzeugte Datei erneut geparst wird, THE Export_Service SHALL ein semantisch äquivalentes Song-Daten-Objekt erzeugen (Round-Trip-Eigenschaft: parse(format(song)) ≅ song)
3. THE ChordPro_Formatter SHALL alle Sonderzeichen in Zeilen-Texten korrekt escapen, sodass geschweifte Klammern im Liedtext nicht als Direktiven interpretiert werden

### Requirement 6: OnSong-Export

**User Story:** Als Benutzer möchte ich einen Song im OnSong-Format exportieren, damit ich ihn in der OnSong-App verwenden kann.

#### Acceptance Criteria

1. WHEN der Benutzer den OnSong-Export auslöst, THE OnSong_Formatter SHALL eine Textdatei im OnSong-Format erzeugen
2. THE OnSong_Formatter SHALL Titel in der ersten Zeile und Künstler in der zweiten Zeile ausgeben, gefolgt von einer Leerzeile
3. THE OnSong_Formatter SHALL jede Strophe mit einem Sektions-Header (z.B. "Verse 1:", "Chorus:") basierend auf dem Strophen-Namen einleiten
4. WHILE die Option Vocal-Tags aktiviert ist, THE OnSong_Formatter SHALL Markup-Annotationen als Kommentarzeilen (Zeilen mit führendem ";") vor der zugehörigen Zeile ausgeben
5. WHILE die Option Instrumental-Sektionen aktiviert ist, THE OnSong_Formatter SHALL instrumentale Strophen mit dem Sektions-Header "Instrumental:" kennzeichnen
6. WHILE die Option Kommentare aktiviert ist, THE OnSong_Formatter SHALL Kommentar-Zeilen als Kommentarzeilen (mit führendem ";") ausgeben
7. THE OnSong_Formatter SHALL die Ausgabe als Datei mit dem Dateinamen "{Titel} - {Künstler}.onsong" bereitstellen

### Requirement 7: SongbookPro-Export

**User Story:** Als Benutzer möchte ich einen Song im SongbookPro-Format exportieren, damit ich ihn in der SongbookPro-App verwenden kann.

#### Acceptance Criteria

1. WHEN der Benutzer den SongbookPro-Export auslöst, THE SongbookPro_Formatter SHALL eine Textdatei im SongbookPro-Format erzeugen
2. THE SongbookPro_Formatter SHALL Titel und Künstler als Metadaten-Header am Anfang der Datei ausgeben
3. THE SongbookPro_Formatter SHALL jede Strophe mit einem Sektions-Tag (z.B. [Verse 1], [Chorus]) basierend auf dem Strophen-Namen einleiten
4. WHILE die Option Vocal-Tags aktiviert ist, THE SongbookPro_Formatter SHALL Markup-Annotationen als Kommentarzeilen (mit führendem "#") vor der zugehörigen Zeile ausgeben
5. WHILE die Option Instrumental-Sektionen aktiviert ist, THE SongbookPro_Formatter SHALL instrumentale Strophen mit dem Sektions-Tag [Instrumental] kennzeichnen
6. WHILE die Option Kommentare aktiviert ist, THE SongbookPro_Formatter SHALL Kommentar-Zeilen als Kommentarzeilen (mit führendem "#") ausgeben
7. THE SongbookPro_Formatter SHALL die Ausgabe als Datei mit dem Dateinamen "{Titel} - {Künstler}.sbp" bereitstellen

### Requirement 8: API-Endpunkt für Format-Export

**User Story:** Als Benutzer möchte ich den Export über die bestehende API auslösen, damit der Export serverseitig erfolgt und ich die Datei herunterladen kann.

#### Acceptance Criteria

1. WHEN eine GET-Anfrage an /api/songs/[id]/export mit dem Query-Parameter "format" (pdf, chordpro, onsong, songbookpro) eingeht, THE Export_Service SHALL den Song im angeforderten Format exportieren
2. WHEN die GET-Anfrage zusätzlich die Query-Parameter "vocalTags", "instrumental" und "kommentare" (jeweils "true" oder "false") enthält, THE Export_Service SHALL die Export_Optionen entsprechend anwenden
3. WHEN der Query-Parameter "format" fehlt oder einen ungültigen Wert enthält, THE Export_Service SHALL eine 400-Antwort mit einer beschreibenden Fehlermeldung zurückgeben
4. WHEN der Benutzer nicht authentifiziert ist, THE Export_Service SHALL eine 401-Antwort zurückgeben
5. WHEN der authentifizierte Benutzer nicht der Eigentümer des Songs ist, THE Export_Service SHALL eine 403-Antwort zurückgeben
6. WHEN die Song-ID nicht existiert, THE Export_Service SHALL eine 404-Antwort zurückgeben
7. IF ein unerwarteter Fehler während des Exports auftritt, THEN THE Export_Service SHALL den Fehler protokollieren und eine 500-Antwort zurückgeben

### Requirement 9: Dateinamen-Generierung

**User Story:** Als Benutzer möchte ich, dass die exportierte Datei einen aussagekräftigen Namen hat, damit ich sie leicht zuordnen kann.

#### Acceptance Criteria

1. THE Export_Service SHALL den Dateinamen nach dem Muster "{Titel} - {Künstler}.{Erweiterung}" generieren
2. WHEN der Künstler-Wert leer oder null ist, THE Export_Service SHALL den Dateinamen nach dem Muster "{Titel}.{Erweiterung}" generieren
3. THE Export_Service SHALL ungültige Dateisystem-Zeichen (/, \, :, *, ?, ", <, >, |) aus dem Dateinamen entfernen
4. THE Export_Service SHALL den Content-Disposition-Header mit dem generierten Dateinamen setzen

### Requirement 10: Strophen-Reihenfolge und Zeilen-Reihenfolge

**User Story:** Als Benutzer möchte ich, dass der Export die Reihenfolge meiner Strophen und Zeilen beibehält, damit die Songstruktur korrekt wiedergegeben wird.

#### Acceptance Criteria

1. THE Export_Service SHALL Strophen in aufsteigender Reihenfolge ihres orderIndex ausgeben
2. THE Export_Service SHALL Zeilen innerhalb einer Strophe in aufsteigender Reihenfolge ihres orderIndex ausgeben
3. FOR ALL Songs mit N Strophen, die Anzahl der Strophen in der Export-Ausgabe SHALL kleiner oder gleich N sein (Filterung durch Export_Optionen reduziert, fügt aber keine Strophen hinzu)

### Requirement 11: Übersetzungen im Export

**User Story:** Als Benutzer möchte ich, dass vorhandene Übersetzungen meiner Zeilen im Export enthalten sind, damit fremdsprachige Texte verständlich bleiben.

#### Acceptance Criteria

1. WHEN eine Zeile einen nicht-leeren Übersetzungs-Wert (uebersetzung) hat, THE Export_Service SHALL die Übersetzung unterhalb der Original-Zeile in der Ausgabe darstellen
2. WHEN eine Zeile keinen Übersetzungs-Wert hat, THE Export_Service SHALL nur die Original-Zeile ausgeben
