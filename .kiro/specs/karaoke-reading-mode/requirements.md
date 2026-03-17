# Anforderungsdokument: Karaoke-Lesemodus

## Einleitung

Der Karaoke-Lesemodus ist eine neue Lernmethode, die Songtexte in einer immersiven Vollbild-Ansicht darstellt, ähnlich einem Karaoke-System. Der Nutzer kann den Text zeilenweise durchblättern oder automatisch scrollen lassen. Drei Darstellungsmodi (Einzelzeile, Strophe, Gesamtansicht) ermöglichen unterschiedliche Fokusstufen. Die aktive Zeile ist stets zentriert, begleitet von Strophentitel, Song-Titel und Interpret. Navigationselemente erlauben manuelles Blättern, Auto-Scroll mit einstellbarer Geschwindigkeit und die Rückkehr zur Song-Detailseite.

## Glossar

- **System**: Die Song Text Trainer Webanwendung (Next.js App Router)
- **Nutzer**: Ein authentifizierter Benutzer der Anwendung
- **Song**: Ein Songtext mit Metadaten (Titel, Künstler), bestehend aus Strophen und Zeilen
- **Strophe**: Ein benannter Textabschnitt innerhalb eines Songs (z.B. Intro, Verse, Chorus, Bridge)
- **Zeile**: Eine einzelne Textzeile innerhalb einer Strophe
- **Karaoke_Ansicht**: Die Vollbild-Komponente unter der Route `/songs/[id]/karaoke/`, die den Songtext im Karaoke-Stil darstellt
- **Aktive_Zeile**: Die aktuell hervorgehobene Zeile im Karaoke-Lesemodus, die vertikal zentriert dargestellt wird
- **Darstellungsmodus**: Einer von drei Modi zur Textanzeige: Einzelzeile, Strophen-Ansicht oder Song-Ansicht
- **Einzelzeile_Modus**: Darstellungsmodus, bei dem nur die Aktive_Zeile sichtbar ist
- **Strophen_Modus**: Darstellungsmodus, bei dem alle Zeilen der aktuellen Strophe sichtbar sind, wobei die Aktive_Zeile hervorgehoben und die übrigen Zeilen abgetönt dargestellt werden
- **Song_Modus**: Darstellungsmodus, bei dem der gesamte Songtext sichtbar ist, mit abgestufter Hervorhebung nach Nähe zur Aktiven_Zeile
- **Hintergrund_Gradient**: Ein CSS-Farbverlauf, definiert durch Anfangsfarbe, Endfarbe und Richtung, der den Vollbild-Hintergrund der Karaoke_Ansicht bildet
- **Auto_Scroll**: Eine Funktion, die automatisch zur nächsten Zeile wechselt, mit konfigurierbarer Geschwindigkeit
- **Scroll_Geschwindigkeit**: Die Zeitdauer in Sekunden zwischen automatischen Zeilenwechseln im Auto_Scroll-Modus
- **Einstellungs_Dialog**: Ein modaler Dialog, der über das Zahnrad-Icon geöffnet wird und die Konfiguration der Scroll_Geschwindigkeit per Slider ermöglicht
- **Fade_Effekt**: Ein visueller Übergang, bei dem Zeilen am oberen und unteren Rand der sichtbaren Fläche im Song_Modus transparent ausfaden
- **Navigations_Buttons**: Zwei vertikal angeordnete Chevron-Buttons (hoch/runter) zur manuellen Zeilennavigation
- **Play_Button**: Ein Button zum Starten und Stoppen des Auto_Scroll-Modus
- **Zurück_Button**: Ein Pfeil-Button oben links, der zur Song-Detailseite (`/songs/[id]`) navigiert

## Anforderungen

### Anforderung 1: Vollbild-Karaoke-Ansicht

**User Story:** Als Nutzer möchte ich den Songtext in einer immersiven Vollbild-Ansicht lesen, damit ich mich voll auf den Text konzentrieren kann.

#### Akzeptanzkriterien

1. THE Karaoke_Ansicht SHALL den gesamten Viewport als Vollbild-Ansicht nutzen und unter der Route `/songs/[id]/karaoke/` erreichbar sein.
2. THE Karaoke_Ansicht SHALL einen Hintergrund_Gradient anzeigen, der aus einer Anfangsfarbe, einer Endfarbe und einer Richtung besteht.
3. THE Karaoke_Ansicht SHALL die Song-Daten (Strophen und Zeilen) über die bestehende API `/api/songs/[id]` laden.
4. IF die Song-Daten nicht geladen werden können, THEN THE Karaoke_Ansicht SHALL eine Fehlermeldung anzeigen.
5. IF der Song keine Strophen enthält, THEN THE Karaoke_Ansicht SHALL einen Hinweis anzeigen, dass keine Texte vorhanden sind.

### Anforderung 2: Layout-Struktur der Karaoke-Ansicht

**User Story:** Als Nutzer möchte ich den Strophentitel, den Songtext und die Song-Informationen klar strukturiert sehen, damit ich mich im Text orientieren kann.

#### Akzeptanzkriterien

1. THE Karaoke_Ansicht SHALL den Namen der Strophe, zu der die Aktive_Zeile gehört, oben mittig anzeigen.
2. THE Karaoke_Ansicht SHALL den Songtext gemäß dem gewählten Darstellungsmodus vertikal zentriert im mittleren Bereich anzeigen.
3. THE Karaoke_Ansicht SHALL den Song-Titel und den Künstlernamen unten mittig anzeigen.
4. WHEN die Aktive_Zeile zu einer anderen Strophe wechselt, THE Karaoke_Ansicht SHALL den angezeigten Strophentitel auf den Namen der neuen Strophe aktualisieren.

### Anforderung 3: Einzelzeile-Darstellungsmodus

**User Story:** Als Nutzer möchte ich nur die aktuelle Zeile sehen, damit ich mich maximal auf eine Textzeile konzentrieren kann.

#### Akzeptanzkriterien

1. WHILE der Einzelzeile_Modus aktiv ist, THE Karaoke_Ansicht SHALL ausschließlich die Aktive_Zeile anzeigen.
2. WHILE der Einzelzeile_Modus aktiv ist, THE Karaoke_Ansicht SHALL die Aktive_Zeile vertikal und horizontal zentriert darstellen.
3. WHEN der Nutzer zur nächsten oder vorherigen Zeile navigiert, THE Karaoke_Ansicht SHALL die angezeigte Zeile durch die neue Aktive_Zeile ersetzen.

### Anforderung 4: Strophen-Darstellungsmodus

**User Story:** Als Nutzer möchte ich alle Zeilen der aktuellen Strophe sehen, damit ich den Kontext der aktiven Zeile innerhalb der Strophe erfassen kann.

#### Akzeptanzkriterien

1. WHILE der Strophen_Modus aktiv ist, THE Karaoke_Ansicht SHALL alle Zeilen der Strophe anzeigen, zu der die Aktive_Zeile gehört.
2. WHILE der Strophen_Modus aktiv ist, THE Karaoke_Ansicht SHALL die Aktive_Zeile mit voller Deckkraft und hervorgehobener Schrift darstellen.
3. WHILE der Strophen_Modus aktiv ist, THE Karaoke_Ansicht SHALL alle nicht-aktiven Zeilen der Strophe mit reduzierter Deckkraft (abgetönt) darstellen.
4. THE Karaoke_Ansicht SHALL die Aktive_Zeile innerhalb der Strophen-Ansicht vertikal zentriert positionieren.
5. WHEN die Aktive_Zeile zur ersten Zeile einer neuen Strophe wechselt, THE Karaoke_Ansicht SHALL die Anzeige auf die Zeilen der neuen Strophe umschalten.

### Anforderung 5: Song-Darstellungsmodus

**User Story:** Als Nutzer möchte ich den gesamten Songtext sehen und dabei die aktive Zeile hervorgehoben haben, damit ich den Gesamtkontext des Songs beim Lesen behalte.

#### Akzeptanzkriterien

1. WHILE der Song_Modus aktiv ist, THE Karaoke_Ansicht SHALL alle Zeilen des gesamten Songs anzeigen.
2. WHILE der Song_Modus aktiv ist, THE Karaoke_Ansicht SHALL die Aktive_Zeile mit voller Deckkraft und hervorgehobener Schrift darstellen.
3. WHILE der Song_Modus aktiv ist, THE Karaoke_Ansicht SHALL die nicht-aktiven Zeilen der gleichen Strophe mit leicht reduzierter Deckkraft darstellen.
4. WHILE der Song_Modus aktiv ist, THE Karaoke_Ansicht SHALL die Zeilen anderer Strophen mit stärker reduzierter Deckkraft darstellen als die Zeilen der aktiven Strophe.
5. WHILE der Song_Modus aktiv ist und mehr als 3 Zeilen oberhalb der Aktiven_Zeile sichtbar sind, THE Karaoke_Ansicht SHALL die obersten 2 sichtbaren Zeilen mit einem Fade_Effekt versehen.
6. WHILE der Song_Modus aktiv ist und mehr als 3 Zeilen unterhalb der Aktiven_Zeile sichtbar sind, THE Karaoke_Ansicht SHALL die untersten 2 sichtbaren Zeilen mit einem Fade_Effekt versehen.
7. THE Karaoke_Ansicht SHALL die Aktive_Zeile im Song_Modus vertikal zentriert positionieren und den umgebenden Text entsprechend scrollen.

### Anforderung 6: Umschalten zwischen Darstellungsmodi

**User Story:** Als Nutzer möchte ich zwischen den drei Darstellungsmodi wechseln können, damit ich die für mich passende Ansicht wählen kann.

#### Akzeptanzkriterien

1. THE Karaoke_Ansicht SHALL eine Umschaltmöglichkeit zwischen Einzelzeile_Modus, Strophen_Modus und Song_Modus bereitstellen.
2. THE Karaoke_Ansicht SHALL den Strophen_Modus als Standard-Darstellungsmodus beim Öffnen verwenden.
3. WHEN der Nutzer den Darstellungsmodus wechselt, THE Karaoke_Ansicht SHALL die Anzeige sofort auf den neuen Modus umschalten und die Aktive_Zeile beibehalten.
4. THE Karaoke_Ansicht SHALL den zuletzt gewählten Darstellungsmodus im localStorage speichern.
5. WHEN die Karaoke_Ansicht erneut geöffnet wird und ein gespeicherter Darstellungsmodus im localStorage vorhanden ist, THE Karaoke_Ansicht SHALL den gespeicherten Darstellungsmodus als Standard verwenden.

### Anforderung 7: Navigationselemente und Layout-Positionierung

**User Story:** Als Nutzer möchte ich über klar positionierte Bedienelemente navigieren können, damit ich den Karaoke-Lesemodus intuitiv steuern kann.

#### Akzeptanzkriterien

1. THE Karaoke_Ansicht SHALL einen Zurück_Button oben links anzeigen, der zur Song-Detailseite (`/songs/[id]`) navigiert.
2. THE Karaoke_Ansicht SHALL die Navigations_Buttons (Chevron hoch und Chevron runter) unten rechts vertikal übereinander angeordnet anzeigen.
3. THE Karaoke_Ansicht SHALL einen Play_Button zum Starten und Stoppen des Auto_Scroll anzeigen.
4. THE Karaoke_Ansicht SHALL ein Zahnrad-Icon anzeigen, das den Einstellungs_Dialog öffnet.
5. THE Karaoke_Ansicht SHALL die Umschaltmöglichkeit für den Darstellungsmodus als Segmented-Control oder vergleichbares UI-Element anzeigen.

### Anforderung 8: Manuelle Zeilennavigation

**User Story:** Als Nutzer möchte ich manuell zur nächsten oder vorherigen Zeile blättern können, damit ich das Lesetempo selbst bestimmen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer den Chevron-runter-Button der Navigations_Buttons betätigt, THE Karaoke_Ansicht SHALL zur nächsten Zeile im Song wechseln.
2. WHEN der Nutzer den Chevron-hoch-Button der Navigations_Buttons betätigt, THE Karaoke_Ansicht SHALL zur vorherigen Zeile im Song wechseln.
3. WHEN die Aktive_Zeile die letzte Zeile der aktuellen Strophe ist und der Nutzer zur nächsten Zeile navigiert, THE Karaoke_Ansicht SHALL zur ersten Zeile der nächsten Strophe wechseln.
4. WHEN die Aktive_Zeile die erste Zeile der aktuellen Strophe ist und der Nutzer zur vorherigen Zeile navigiert, THE Karaoke_Ansicht SHALL zur letzten Zeile der vorherigen Strophe wechseln.
5. WHILE die Aktive_Zeile die erste Zeile des gesamten Songs ist, THE Karaoke_Ansicht SHALL den Chevron-hoch-Button als deaktiviert darstellen.
6. WHILE die Aktive_Zeile die letzte Zeile des gesamten Songs ist, THE Karaoke_Ansicht SHALL den Chevron-runter-Button als deaktiviert darstellen.

### Anforderung 9: Auto-Scroll-Funktion

**User Story:** Als Nutzer möchte ich den Text automatisch durchlaufen lassen, damit ich den Songtext im Lesefluss verfolgen kann, ohne manuell blättern zu müssen.

#### Akzeptanzkriterien

1. WHEN der Nutzer den Play_Button betätigt, THE Karaoke_Ansicht SHALL den Auto_Scroll starten und automatisch in der konfigurierten Scroll_Geschwindigkeit zur nächsten Zeile wechseln.
2. WHILE der Auto_Scroll aktiv ist, THE Karaoke_Ansicht SHALL den Play_Button als Pause-Icon darstellen.
3. WHEN der Nutzer den Pause-Button betätigt, THE Karaoke_Ansicht SHALL den Auto_Scroll stoppen und den Button wieder als Play-Icon darstellen.
4. WHEN der Auto_Scroll die letzte Zeile des Songs erreicht, THE Karaoke_Ansicht SHALL den Auto_Scroll automatisch stoppen.
5. WHEN der Nutzer während des Auto_Scroll manuell über die Navigations_Buttons navigiert, THE Karaoke_Ansicht SHALL den Auto_Scroll stoppen.
6. THE Karaoke_Ansicht SHALL eine Standard-Scroll_Geschwindigkeit von 3 Sekunden pro Zeile verwenden.

### Anforderung 10: Einstellungs-Dialog für Scroll-Geschwindigkeit

**User Story:** Als Nutzer möchte ich die Geschwindigkeit des Auto-Scrolls anpassen können, damit ich das Tempo an mein Lesetempo anpassen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer das Zahnrad-Icon betätigt, THE Einstellungs_Dialog SHALL sich als modaler Dialog öffnen.
2. THE Einstellungs_Dialog SHALL einen Slider zur Konfiguration der Scroll_Geschwindigkeit anzeigen, mit einem Bereich von 1 Sekunde bis 10 Sekunden pro Zeile.
3. WHEN der Nutzer den Slider bewegt, THE Einstellungs_Dialog SHALL den aktuellen Wert der Scroll_Geschwindigkeit in Sekunden neben dem Slider anzeigen.
4. WHEN der Nutzer den Einstellungs_Dialog schließt, THE Karaoke_Ansicht SHALL die gewählte Scroll_Geschwindigkeit für den Auto_Scroll übernehmen.
5. THE Karaoke_Ansicht SHALL die gewählte Scroll_Geschwindigkeit im localStorage speichern.
6. WHEN die Karaoke_Ansicht erneut geöffnet wird und eine gespeicherte Scroll_Geschwindigkeit im localStorage vorhanden ist, THE Karaoke_Ansicht SHALL die gespeicherte Scroll_Geschwindigkeit verwenden.

### Anforderung 11: Tastaturnavigation

**User Story:** Als Nutzer möchte ich den Karaoke-Lesemodus per Tastatur bedienen können, damit ich effizient navigieren kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer die Pfeil-nach-unten-Taste drückt, THE Karaoke_Ansicht SHALL zur nächsten Zeile wechseln.
2. WHEN der Nutzer die Pfeil-nach-oben-Taste drückt, THE Karaoke_Ansicht SHALL zur vorherigen Zeile wechseln.
3. WHEN der Nutzer die Leertaste drückt, THE Karaoke_Ansicht SHALL den Auto_Scroll starten oder stoppen (Toggle-Verhalten).
4. WHEN der Nutzer die Escape-Taste drückt, THE Karaoke_Ansicht SHALL zur Song-Detailseite navigieren.

### Anforderung 12: Barrierefreiheit

**User Story:** Als Nutzer mit Einschränkungen möchte ich den Karaoke-Lesemodus mit assistiven Technologien bedienen können, damit ich gleichberechtigt am Lernen teilnehmen kann.

#### Akzeptanzkriterien

1. THE Karaoke_Ansicht SHALL den Zurück_Button mit einem `aria-label="Zurück zur Song-Detailseite"` versehen.
2. THE Karaoke_Ansicht SHALL die Navigations_Buttons mit `aria-label="Nächste Zeile"` und `aria-label="Vorherige Zeile"` versehen.
3. THE Karaoke_Ansicht SHALL den Play_Button mit einem `aria-label` versehen, das den aktuellen Zustand widerspiegelt ("Auto-Scroll starten" oder "Auto-Scroll stoppen").
4. WHEN die Aktive_Zeile wechselt, THE Karaoke_Ansicht SHALL den neuen Zeilentext über eine `aria-live="polite"` Region an Screenreader kommunizieren.
5. THE Karaoke_Ansicht SHALL alle interaktiven Elemente mit einer Mindest-Tippfläche von 44×44px darstellen.
6. THE Einstellungs_Dialog SHALL den Slider mit einem `aria-label="Scroll-Geschwindigkeit in Sekunden"` und `aria-valuemin`, `aria-valuemax`, `aria-valuenow` Attributen versehen.
7. THE Karaoke_Ansicht SHALL per Tastatur vollständig navigierbar sein (Tab-Reihenfolge folgt der logischen Lesereihenfolge).

### Anforderung 13: Zeilenübergang und Animation

**User Story:** Als Nutzer möchte ich einen sanften visuellen Übergang beim Zeilenwechsel sehen, damit das Leseerlebnis flüssig und angenehm wirkt.

#### Akzeptanzkriterien

1. WHEN die Aktive_Zeile wechselt, THE Karaoke_Ansicht SHALL den Text mit einer sanften CSS-Transition nach oben verschieben.
2. THE Karaoke_Ansicht SHALL die Transition-Dauer auf einen Wert zwischen 200ms und 400ms setzen, um einen flüssigen Übergang zu gewährleisten.
3. WHEN der Darstellungsmodus gewechselt wird, THE Karaoke_Ansicht SHALL den Übergang zwischen den Modi mit einer Fade-Transition darstellen.
