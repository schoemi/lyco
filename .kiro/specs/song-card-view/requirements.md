# Anforderungsdokument: Song-Kartenansicht (Card View)

## Einleitung

Die bestehende Listenansicht für Songs im Dashboard soll durch eine visuell ansprechende Kartenansicht (Card View) ergänzt werden. Jede Karte zeigt das Album-Cover als Hintergrund, den Song-Titel, den Künstler, einen StatusPunkt (Fortschritts-Bubble) und eine ProgressBar. Das Layout verwendet ein responsives 4-Spalten-Grid auf Desktop-Geräten. Dafür wird eine neue `coverUrl`-Property am Song-Modell benötigt, die entweder per Upload oder automatisch beim Genius-Import befüllt wird.

## Glossar

- **Song_Karte**: Die neue Kartenkomponente (`SongCard`), die einen einzelnen Song als visuelle Karte mit Cover-Hintergrundbild, Titel, Künstler, StatusPunkt und ProgressBar darstellt.
- **Karten_Grid**: Das responsive CSS-Grid-Layout, das die Song_Karten in bis zu 4 Spalten auf Desktop-Bildschirmen anordnet.
- **Cover_Bild**: Die URL eines Album-Cover-Bildes, gespeichert als optionales Feld `coverUrl` am Song-Modell in der Datenbank.
- **StatusPunkt**: Die bestehende farbige Fortschritts-Bubble-Komponente, die den Lernstatus eines Songs visuell anzeigt (grau, orange, grün).
- **ProgressBar**: Die bestehende Fortschrittsbalken-Komponente, die den prozentualen Lernfortschritt eines Songs anzeigt.
- **Dashboard_Seite**: Die bestehende Hauptseite (`/dashboard`), die Songs, Sets und Metriken anzeigt.
- **Song_Modell**: Das Prisma-Datenbankmodell `Song` mit den bestehenden Feldern (titel, kuenstler, sprache, etc.).
- **Genius_Client**: Das bestehende serverseitige Modul für die Genius-API-Kommunikation, das bei der Suche auch Album-Art-URLs liefert.
- **Cover_Upload_Endpunkt**: Die neue API-Route zum Hochladen eines Cover-Bildes für einen Song.

## Anforderungen

### Anforderung 1: Cover-Bild-Feld am Song-Modell

**User Story:** Als Nutzer möchte ich, dass jeder Song ein optionales Album-Cover-Bild haben kann, damit die Kartenansicht visuell ansprechend ist.

#### Akzeptanzkriterien

1. THE Song_Modell SHALL ein optionales Feld `coverUrl` vom Typ String enthalten.
2. WHEN ein Song ohne Cover_Bild existiert, THE Song_Karte SHALL einen Platzhalter-Hintergrund (z.B. einen Farbverlauf) anstelle eines Bildes anzeigen.
3. WHEN ein Song mit Cover_Bild existiert, THE Song_Karte SHALL das Cover_Bild als Hintergrundbild der Karte anzeigen.

### Anforderung 2: Cover-Bild-Upload

**User Story:** Als Nutzer möchte ich ein Cover-Bild für einen Song hochladen können, damit ich eigene Bilder für die Kartenansicht verwenden kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer ein Bild über den Cover_Upload_Endpunkt hochlädt, THE Cover_Upload_Endpunkt SHALL das Bild speichern und die resultierende URL im Feld `coverUrl` des Songs persistieren.
2. THE Cover_Upload_Endpunkt SHALL nur Bilddateien der Formate JPEG, PNG und WebP akzeptieren.
3. THE Cover_Upload_Endpunkt SHALL Dateien mit einer maximalen Größe von 5 MB akzeptieren.
4. IF der Nutzer eine Datei hochlädt, die kein unterstütztes Bildformat hat, THEN THE Cover_Upload_Endpunkt SHALL den HTTP-Status 400 mit der Meldung "Nur JPEG, PNG und WebP Dateien sind erlaubt" zurückgeben.
5. IF der Nutzer eine Datei hochlädt, die größer als 5 MB ist, THEN THE Cover_Upload_Endpunkt SHALL den HTTP-Status 400 mit der Meldung "Die Datei darf maximal 5 MB groß sein" zurückgeben.
6. THE Cover_Upload_Endpunkt SHALL nur authentifizierte Anfragen verarbeiten und bei fehlender Authentifizierung den HTTP-Status 401 zurückgeben.

### Anforderung 3: Cover-Bild beim Genius-Import

**User Story:** Als Nutzer möchte ich, dass beim Import eines Songs über Genius das Album-Cover automatisch übernommen wird, damit ich es nicht manuell hochladen muss.

#### Akzeptanzkriterien

1. WHEN ein Song über den Genius-Import importiert wird und die Genius-API eine Album-Art-URL liefert, THE Import_Endpunkt SHALL die Album-Art-URL im Feld `coverUrl` des neuen Songs speichern.
2. WHEN ein Song über den Genius-Import importiert wird und die Genius-API keine Album-Art-URL liefert, THE Import_Endpunkt SHALL das Feld `coverUrl` leer lassen.

### Anforderung 4: Song-Karten-Komponente

**User Story:** Als Nutzer möchte ich Songs als visuell ansprechende Karten sehen, die das Album-Cover, den Titel, den Künstler, den Fortschrittsstatus und den Fortschrittsbalken anzeigen.

#### Akzeptanzkriterien

1. THE Song_Karte SHALL das Cover_Bild als Hintergrundbild der gesamten Karte darstellen.
2. THE Song_Karte SHALL den Song-Titel als Text auf der Karte anzeigen.
3. THE Song_Karte SHALL den Künstlernamen als Text auf der Karte anzeigen.
4. THE Song_Karte SHALL den StatusPunkt in der oberen rechten Ecke der Karte positionieren.
5. THE Song_Karte SHALL die ProgressBar am unteren Rand der Karte ohne Abstand zum Kartenrand anzeigen.
6. WHEN der Nutzer auf eine Song_Karte klickt, THE Song_Karte SHALL den Nutzer zur Song-Detailseite (`/songs/{id}`) navigieren.
7. THE Song_Karte SHALL ein `aria-label`-Attribut mit dem Song-Titel, dem Künstler und dem Fortschrittsstatus enthalten.
8. THE Song_Karte SHALL den Titel und den Künstler über einem halbtransparenten Overlay anzeigen, damit der Text auf dem Cover_Bild lesbar bleibt.

### Anforderung 5: Responsives Karten-Grid-Layout

**User Story:** Als Nutzer möchte ich die Songs in einem übersichtlichen Grid-Layout sehen, das sich an verschiedene Bildschirmgrößen anpasst.

#### Akzeptanzkriterien

1. THE Karten_Grid SHALL auf Desktop-Bildschirmen (ab 1024px Breite) 4 Spalten anzeigen.
2. THE Karten_Grid SHALL auf Tablet-Bildschirmen (ab 768px Breite) 3 Spalten anzeigen.
3. THE Karten_Grid SHALL auf kleinen Bildschirmen (ab 640px Breite) 2 Spalten anzeigen.
4. THE Karten_Grid SHALL auf sehr kleinen Bildschirmen (unter 640px Breite) 1 Spalte anzeigen.
5. THE Karten_Grid SHALL einen gleichmäßigen Abstand zwischen den Song_Karten einhalten.

### Anforderung 6: Integration in die Dashboard-Seite

**User Story:** Als Nutzer möchte ich die Kartenansicht im Dashboard sehen, damit ich meine Songs visuell ansprechend überblicken kann.

#### Akzeptanzkriterien

1. THE Dashboard_Seite SHALL im Bereich "Alle Songs" die Song_Karten im Karten_Grid anstelle der bisherigen Listenansicht anzeigen.
2. WHEN keine Songs vorhanden sind, THE Dashboard_Seite SHALL den bestehenden Platzhalter-Bereich mit dem "Neuer Song"-Button anzeigen.
3. THE Dashboard_Seite SHALL die `coverUrl` als Teil der Song-Daten vom API-Endpunkt erhalten.

### Anforderung 7: Cover-Bild-Daten im API-Response

**User Story:** Als Entwickler möchte ich, dass die Dashboard-API und die Song-Detail-API die Cover-URL mitliefern, damit die Kartenansicht das Bild anzeigen kann.

#### Akzeptanzkriterien

1. THE SongWithProgress-Typ SHALL ein optionales Feld `coverUrl` vom Typ String enthalten.
2. WHEN die Dashboard-API Song-Daten zurückgibt, THE Dashboard-API SHALL das Feld `coverUrl` für jeden Song mitliefern.
3. WHEN die Song-Detail-API Song-Daten zurückgibt, THE Song-Detail-API SHALL das Feld `coverUrl` mitliefern.
