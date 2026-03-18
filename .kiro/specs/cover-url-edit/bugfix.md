# Bugfix Requirements Document

## Einleitung

Die `coverUrl` eines Songs kann auf der Song-Detailseite (`/songs/[id]`) nicht bearbeitet werden. Obwohl das Song-Modell ein `coverUrl`-Feld besitzt und ein Cover-Upload-API-Endpunkt (`POST /api/songs/[id]/cover/upload`) existiert, fehlt auf der Detailseite jegliche UI-Komponente zum Setzen oder Ändern des Cover-Bildes. Gefordert ist eine Eingabemöglichkeit per URL oder per Datei-Upload – analog zum bestehenden AudioQuellenManager.

## Bug-Analyse

### Aktuelles Verhalten (Defekt)

1.1 WHEN ein Nutzer die Song-Detailseite öffnet THEN zeigt das System keine Möglichkeit an, die coverUrl zu setzen oder zu ändern
1.2 WHEN ein Nutzer die coverUrl per URL eingeben möchte THEN bietet das System kein Eingabefeld für eine Cover-URL an
1.3 WHEN ein Nutzer ein Cover-Bild per Datei-Upload setzen möchte THEN bietet das System auf der Detailseite keine Upload-Möglichkeit an
1.4 WHEN ein Nutzer die coverUrl per PUT `/api/songs/[id]` aktualisieren möchte THEN ignoriert das System das coverUrl-Feld, da `UpdateSongInput` es nicht enthält

### Erwartetes Verhalten (Korrekt)

2.1 WHEN ein Nutzer die Song-Detailseite öffnet THEN SHALL das System einen Bereich zum Verwalten des Cover-Bildes anzeigen (URL-Eingabe oder Datei-Upload)
2.2 WHEN ein Nutzer eine gültige URL in das Cover-URL-Feld eingibt und speichert THEN SHALL das System die coverUrl am Song persistieren und die Anzeige aktualisieren
2.3 WHEN ein Nutzer ein Bild über den Datei-Upload hochlädt THEN SHALL das System das Bild über den bestehenden Upload-Endpunkt speichern und die coverUrl am Song aktualisieren
2.4 WHEN ein Nutzer die coverUrl per PUT `/api/songs/[id]` mit einem coverUrl-Feld sendet THEN SHALL das System die coverUrl am Song aktualisieren

### Unverändertes Verhalten (Regressionsprävention)

3.1 WHEN ein Nutzer den Song-Titel, Künstler, Sprache oder Emotions-Tags über das Bearbeitungsformular ändert THEN SHALL das System WEITERHIN diese Felder korrekt speichern
3.2 WHEN ein Nutzer ein Cover-Bild über den bestehenden Upload-Endpunkt (`POST /api/songs/[id]/cover/upload`) hochlädt THEN SHALL das System WEITERHIN das Bild speichern und die coverUrl setzen
3.3 WHEN ein Song über den Genius-Import mit einer Album-Art-URL importiert wird THEN SHALL das System WEITERHIN die coverUrl automatisch setzen
3.4 WHEN ein Song eine coverUrl hat THEN SHALL die Song-Karte im Dashboard WEITERHIN das Cover-Bild als Hintergrund anzeigen

## Bug-Bedingung

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type SongDetailPageInteraction
  OUTPUT: boolean

  // Der Bug tritt auf, wenn ein Nutzer auf der Detailseite die coverUrl setzen oder ändern möchte
  RETURN X.action = "setCoverUrl" OR X.action = "uploadCoverImage"
END FUNCTION
```

```pascal
// Property: Fix Checking – Cover-URL-Bearbeitung auf der Detailseite
FOR ALL X WHERE isBugCondition(X) DO
  result ← SongDetailPage'(X)
  ASSERT result.coverUrlEditorVisible = true
    AND (X.action = "setCoverUrl" IMPLIES song.coverUrl = X.inputUrl)
    AND (X.action = "uploadCoverImage" IMPLIES song.coverUrl != null AND song.coverUrl.startsWith("/api/uploads/covers/"))
END FOR
```

```pascal
// Property: Preservation Checking – Bestehende Funktionalität bleibt erhalten
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```
