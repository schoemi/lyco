# Anforderungen: Audio-Wiedergabe & Timecodes

## Anforderung 1

**User Story:** Als Nutzer möchte ich mehrere Audio-Quellen (MP3-Dateien oder Streaming-Links wie Spotify/YouTube) zu einem Song hinzufügen, damit ich die Musik zum Songtext abspielen kann.

### Akzeptanzkriterien

1. WENN ein Nutzer eine Audio-Quelle zu einem Song hinzufügt DANN SOLL das System die Quelle mit URL, Typ (MP3/SPOTIFY/YOUTUBE), Label und Reihenfolge-Index speichern
2. WENN ein Nutzer eine Audio-Quelle bearbeitet DANN SOLL das System die geänderten Felder (URL, Label, Typ) aktualisieren
3. WENN ein Nutzer eine Audio-Quelle löscht DANN SOLL das System die Quelle entfernen und die Reihenfolge-Indizes der verbleibenden Quellen anpassen
4. WENN ein Nutzer die Reihenfolge der Audio-Quellen ändert DANN SOLL das System die orderIndex-Werte entsprechend aktualisieren
5. WENN ein Nutzer eine Audio-Quelle mit ungültiger URL hinzufügt DANN SOLL das System die Eingabe ablehnen und eine Fehlermeldung anzeigen


## Anforderung 2

**User Story:** Als Nutzer möchte ich Audio-Quellen auf der Song-Detailseite abspielen, damit ich den Songtext mithören kann.

### Akzeptanzkriterien

1. WENN ein Song MP3-Audio-Quellen hat DANN SOLL das System einen HTML5-Audio-Player mit Play/Pause, Fortschrittsbalken und Lautstärkeregler anzeigen
2. WENN ein Song Spotify-Audio-Quellen hat DANN SOLL das System einen Spotify-Embed-Player anzeigen
3. WENN ein Song YouTube-Audio-Quellen hat DANN SOLL das System einen YouTube-Embed-Player anzeigen
4. WENN ein Song mehrere Audio-Quellen hat DANN SOLL das System einen Quellen-Umschalter mit Labels anzeigen, damit der Nutzer zwischen den Quellen wechseln kann
5. WENN keine Audio-Quellen vorhanden sind DANN SOLL das System einen Hinweis anzeigen, dass Audio-Quellen hinzugefügt werden können

## Anforderung 3

**User Story:** Als Nutzer möchte ich Timecodes im Format [mm:ss] pro Strophe eingeben, damit der Audio-Player an die richtige Stelle springen kann.

### Akzeptanzkriterien

1. WENN ein Nutzer einen Timecode im Format [mm:ss] eingibt DANN SOLL das System den Wert in Millisekunden konvertieren und als TIMECODE-Markup speichern
2. WENN ein Timecode-Wert in Millisekunden gespeichert ist DANN SOLL das System ihn im Format [mm:ss] anzeigen
3. WENN ein Nutzer einen ungültigen Timecode eingibt (z.B. [99:99], negative Werte, Buchstaben) DANN SOLL das System die Eingabe ablehnen
4. WENN ein Nutzer einen Timecode für eine Strophe setzt DANN SOLL das System ein TIMECODE-Markup mit ziel=STROPHE und dem entsprechenden timecodeMs-Wert erstellen

## Anforderung 4

**User Story:** Als Nutzer möchte ich durch Klick auf eine Strophe den Audio-Player an den zugehörigen Timecode springen lassen, damit ich gezielt Abschnitte üben kann.

### Akzeptanzkriterien

1. WENN ein Nutzer auf eine Strophe mit Timecode klickt und eine MP3-Quelle aktiv ist DANN SOLL der Audio-Player an die entsprechende Position springen
2. WENN ein Nutzer auf eine Strophe ohne Timecode klickt DANN SOLL das System keine Aktion ausführen
3. WENN eine Spotify- oder YouTube-Quelle aktiv ist DANN SOLL die Timecode-Navigation deaktiviert sein (Seek nur bei MP3 möglich)

## Anforderung 5

**User Story:** Als Nutzer möchte ich Audio-Quellen über die Song-Detailseite verwalten, damit ich Quellen hinzufügen, bearbeiten und entfernen kann.

### Akzeptanzkriterien

1. WENN ein Nutzer den Audio-Quellen-Bereich öffnet DANN SOLL das System alle vorhandenen Quellen mit Label, Typ und URL anzeigen
2. WENN ein Nutzer eine neue Audio-Quelle hinzufügt DANN SOLL das System ein Formular mit Feldern für URL, Typ-Auswahl und Label anzeigen
3. WENN ein Nutzer nur eigene Songs bearbeitet DANN SOLL das System den Zugriff auf Audio-Quellen fremder Songs verweigern

## Anforderung 6

**User Story:** Als Nutzer möchte ich Timecodes im Songtext-Editor eingeben und bearbeiten, damit ich die Zeitmarken direkt beim Bearbeiten des Songtexts setzen kann.

### Akzeptanzkriterien

1. WENN ein Nutzer den Songtext-Editor öffnet DANN SOLL das System pro Strophe ein Timecode-Eingabefeld im Format [mm:ss] anzeigen
2. WENN ein Nutzer einen Timecode ändert DANN SOLL das System den Wert validieren und das zugehörige TIMECODE-Markup aktualisieren oder erstellen
3. WENN ein Nutzer einen Timecode löscht DANN SOLL das System das zugehörige TIMECODE-Markup entfernen

## Anforderung 7

**User Story:** Als Entwickler möchte ich eine saubere API für Audio-Quellen unter /api/songs/[id]/audio-quellen, damit Frontend-Komponenten die Daten konsistent abrufen und ändern können.

### Akzeptanzkriterien

1. WENN ein GET-Request an /api/songs/[id]/audio-quellen gesendet wird DANN SOLL das System alle Audio-Quellen des Songs sortiert nach orderIndex zurückgeben
2. WENN ein POST-Request mit gültigen Daten gesendet wird DANN SOLL das System eine neue Audio-Quelle erstellen und mit Status 201 zurückgeben
3. WENN ein PUT-Request an /api/songs/[id]/audio-quellen/[quelleId] gesendet wird DANN SOLL das System die Audio-Quelle aktualisieren
4. WENN ein DELETE-Request an /api/songs/[id]/audio-quellen/[quelleId] gesendet wird DANN SOLL das System die Audio-Quelle löschen
5. WENN ein nicht-authentifizierter Request gesendet wird DANN SOLL das System mit Status 401 antworten
6. WENN ein Nutzer auf Audio-Quellen eines fremden Songs zugreift DANN SOLL das System mit Status 403 antworten
