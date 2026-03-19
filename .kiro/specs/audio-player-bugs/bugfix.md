# Bugfix-Anforderungsdokument

## Einleitung

Dieses Dokument beschreibt zwei zusammenhängende Bugs in der Audio-Player-Funktionalität der Songtext-Trainer-App:

1. **Fehlende Upload-Komponenten im Bearbeitungsmodus**: Die `SongEditForm`-Komponente zeigt nur Metadaten-Felder (Titel, Künstler, Sprache, Emotions-Tags), aber die Upload-Interfaces für Audio-Dateien (`AudioQuellenManager`) und Cover-Bilder (`CoverManager`) fehlen. Diese Komponenten werden aktuell nur im Text-Bearbeitungsmodus (`editingText`) angezeigt, nicht im Metadaten-Bearbeitungsmodus (`editing`).

2. **Audio-Dateien werden vom Player nicht geladen (Timecode immer 00:00:00)**: Der Audio-Player zeigt den Timecode als `00:00:00 / 00:00.00` an, was darauf hindeutet, dass Audio-Dateien nicht korrekt geladen werden. Die `SharedAudioProvider`-Komponente verwendet `activeQuelle.url` direkt als `src`-Attribut des Audio-Elements. Upload-Endpunkte erzeugen URLs wie `/api/uploads/audio/{filename}`, die möglicherweise nicht korrekt aufgelöst werden. Das betrifft nur mobile Browser (getestet auf FF und Safari für iOS 26)

## Bug-Analyse

### Aktuelles Verhalten (Defekt)

1.1 WENN der Benutzer den Metadaten-Bearbeitungsmodus aktiviert (Klick auf "Bearbeiten" im Aktionsmenü), DANN zeigt das System nur die Felder Titel, Künstler, Sprache und Emotions-Tags an — die Upload-Interfaces für Audio-Quellen und Cover-Bilder fehlen vollständig.

1.2 WENN der Benutzer den Text-Bearbeitungsmodus aktiviert (Klick auf "Text bearbeiten"), DANN werden `AudioQuellenManager` und `CoverManager` unterhalb des Text-Editors angezeigt — aber diese Zuordnung ist logisch falsch, da Audio- und Cover-Verwaltung zur Metadaten-Bearbeitung gehört, nicht zur Textbearbeitung.

1.3 WENN eine MP3-Audio-Quelle mit einer hochgeladenen Datei vorhanden ist (URL-Format `/api/uploads/audio/{uuid}.mp3`), DANN zeigt der Audio-Player den Timecode als `00:00:00 / 00:00.00` an und die Audiodatei wird nicht abgespielt.

1.4 WENN der Benutzer den Play-Button drückt bei einer hochgeladenen MP3-Datei, DANN passiert nichts oder es tritt ein stiller Fehler auf, da die Audio-Datei nicht geladen werden kann.

### Erwartetes Verhalten (Korrekt)

2.1 WENN der Benutzer den Metadaten-Bearbeitungsmodus aktiviert, DANN SOLL das System neben den Metadaten-Feldern auch die Upload-Interfaces für Audio-Quellen (`AudioQuellenManager`) und Cover-Bilder (`CoverManager`) anzeigen.

2.2 WENN der Benutzer den Text-Bearbeitungsmodus aktiviert, DANN SOLL das System nur den Text-Editor anzeigen, ohne die Audio- und Cover-Verwaltung (diese gehören zum Metadaten-Bearbeitungsmodus).

2.3 WENN eine MP3-Audio-Quelle mit einer hochgeladenen Datei vorhanden ist, DANN SOLL der Audio-Player die korrekte Dauer anzeigen und die Datei abspielen können.

2.4 WENN der Benutzer den Play-Button drückt bei einer hochgeladenen MP3-Datei, DANN SOLL die Audiowiedergabe starten und der Timecode SOLL sich entsprechend aktualisieren.

### Unverändertes Verhalten (Regressionsprävention)

3.1 WENN der Benutzer den Metadaten-Bearbeitungsmodus aktiviert, DANN SOLL das System WEITERHIN die Felder Titel, Künstler, Sprache und Emotions-Tags anzeigen und speichern können.

3.2 WENN der Benutzer den Text-Bearbeitungsmodus aktiviert, DANN SOLL das System WEITERHIN den Songtext-Editor korrekt anzeigen und Textänderungen speichern können.

3.3 WENN eine externe Audio-Quelle (Spotify, YouTube, Apple Music) vorhanden ist, DANN SOLL das System WEITERHIN den entsprechenden Embed-Player korrekt anzeigen.

3.4 WENN eine MP3-Audio-Quelle mit einer externen URL vorhanden ist (z.B. `https://example.com/song.mp3`), DANN SOLL der Audio-Player WEITERHIN die Datei korrekt laden und abspielen.

3.5 WENN der Benutzer kein Eigentümer des Songs ist (Freigabe-Ansicht), DANN SOLL das System WEITERHIN keine Bearbeitungsoptionen anzeigen.

3.6 WENN mehrere Audio-Quellen vorhanden sind, DANN SOLL der Quellen-Umschalter WEITERHIN korrekt funktionieren.
