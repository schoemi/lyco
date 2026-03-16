# Anforderungsdokument: Übersetzung ein-/ausblenden (Translation Visibility Toggle)

## Einleitung

Auf der Song-Detailseite (`/songs/[id]`) werden nach einer erfolgreichen Übersetzung die übersetzten Zeilen (`zeile.uebersetzung`) unterhalb der Originalzeilen angezeigt. Aktuell gibt es keine Möglichkeit, diese Übersetzungen ein- oder auszublenden. Der Benutzer wünscht sich einen Toggle-Schalter oben rechts auf der Song-Detailseite, mit dem die Sichtbarkeit der Übersetzungen gesteuert werden kann.

Das Feature betrifft ausschließlich die clientseitige Darstellung. Es sind keine Backend-Änderungen erforderlich. Die Übersetzungsdaten bleiben im Song-State erhalten; lediglich die Anzeige wird gesteuert.

## Glossar

- **Song_Detailseite**: Die Seite unter `/songs/[id]`, die Song-Metadaten, Lernmethoden-Links und Strophen anzeigt (`src/app/(main)/songs/[id]/page.tsx`)
- **Uebersetzungs_Toggle**: Ein Schalter (Toggle-Button) oben rechts auf der Song_Detailseite, der die Sichtbarkeit der Übersetzungen steuert
- **StropheEditor**: Die Komponente, die Strophen und deren Zeilen auf der Song_Detailseite rendert (`src/components/songs/strophe-editor.tsx`)
- **Uebersetzungszeile**: Die unter einer Originalzeile angezeigte Übersetzung, gespeist aus dem Feld `zeile.uebersetzung`
- **Sichtbarkeitszustand**: Der boolesche Zustand, der bestimmt, ob Uebersetzungszeilen angezeigt oder verborgen werden

## Anforderungen

### Anforderung 1: Toggle-Schalter auf der Song-Detailseite

**User Story:** Als Benutzer möchte ich auf der Song-Detailseite einen Toggle-Schalter haben, mit dem ich die Übersetzungen ein- und ausblenden kann, damit ich den Songtext wahlweise mit oder ohne Übersetzung lesen kann.

#### Akzeptanzkriterien

1. THE Song_Detailseite SHALL einen Uebersetzungs_Toggle im oberen rechten Bereich der Seite anzeigen, wenn mindestens eine Zeile im Song eine nicht-leere Übersetzung besitzt.
2. WHEN keine Zeile im Song eine Übersetzung besitzt, THE Song_Detailseite SHALL den Uebersetzungs_Toggle ausblenden.
3. THE Uebersetzungs_Toggle SHALL als beschrifteter Schalter mit dem Text „Übersetzung" dargestellt werden.
4. WHEN der Benutzer den Uebersetzungs_Toggle aktiviert, THE Song_Detailseite SHALL alle Uebersetzungszeilen unterhalb der Originalzeilen anzeigen.
5. WHEN der Benutzer den Uebersetzungs_Toggle deaktiviert, THE Song_Detailseite SHALL alle Uebersetzungszeilen ausblenden.

### Anforderung 2: Standardzustand des Toggles

**User Story:** Als Benutzer möchte ich, dass die Übersetzungen standardmäßig sichtbar sind, wenn Übersetzungen vorhanden sind, damit ich nach einer Übersetzung sofort die Ergebnisse sehe.

#### Akzeptanzkriterien

1. WHEN die Song_Detailseite geladen wird und mindestens eine Zeile eine Übersetzung besitzt, THE Uebersetzungs_Toggle SHALL im aktivierten Zustand starten.
2. WHEN die Song_Detailseite geladen wird und keine Zeile eine Übersetzung besitzt, THE Uebersetzungs_Toggle SHALL nicht angezeigt werden.
3. WHEN eine Übersetzung erfolgreich abgeschlossen wird und vorher keine Übersetzungen vorhanden waren, THE Song_Detailseite SHALL den Uebersetzungs_Toggle im aktivierten Zustand einblenden.

### Anforderung 3: Sichtbarkeitssteuerung der Übersetzungszeilen

**User Story:** Als Benutzer möchte ich, dass der Toggle die Anzeige aller Übersetzungszeilen in allen Strophen gleichzeitig steuert, damit ich eine konsistente Ansicht habe.

#### Akzeptanzkriterien

1. WHILE der Sichtbarkeitszustand auf „sichtbar" steht, THE StropheEditor SHALL alle Uebersetzungszeilen unterhalb der zugehörigen Originalzeilen anzeigen.
2. WHILE der Sichtbarkeitszustand auf „verborgen" steht, THE StropheEditor SHALL keine Uebersetzungszeilen anzeigen.
3. THE StropheEditor SHALL den Sichtbarkeitszustand auf alle Strophen und alle Zeilen gleichzeitig anwenden.
4. WHEN der Benutzer den Sichtbarkeitszustand umschaltet, THE StropheEditor SHALL die Anzeige der Uebersetzungszeilen sofort aktualisieren, ohne die Seite neu zu laden.

### Anforderung 4: Barrierefreiheit des Toggles

**User Story:** Als Benutzer mit Einschränkungen möchte ich den Übersetzungs-Toggle mit assistiven Technologien bedienen können.

#### Akzeptanzkriterien

1. THE Uebersetzungs_Toggle SHALL die ARIA-Rolle `switch` oder ein semantisch gleichwertiges Attribut besitzen.
2. THE Uebersetzungs_Toggle SHALL ein beschreibendes `aria-label`-Attribut besitzen (z.B. „Übersetzung ein-/ausblenden").
3. THE Uebersetzungs_Toggle SHALL den aktuellen Zustand über `aria-checked` kommunizieren (`true` wenn Übersetzungen sichtbar, `false` wenn verborgen).
4. THE Uebersetzungs_Toggle SHALL per Tastatur bedienbar sein (Aktivierung über Leertaste oder Enter).
5. THE Uebersetzungs_Toggle SHALL eine Mindestgröße von 44×44 Pixeln als Touch-Target haben (konsistent mit den bestehenden Bedienelementen der Anwendung).

### Anforderung 5: Visuelles Design des Toggles

**User Story:** Als Benutzer möchte ich, dass der Toggle visuell klar erkennbar ist und sich in das bestehende Design der Anwendung einfügt.

#### Akzeptanzkriterien

1. THE Uebersetzungs_Toggle SHALL visuell zwischen aktiviertem und deaktiviertem Zustand unterscheidbar sein (z.B. durch Farbwechsel).
2. THE Uebersetzungs_Toggle SHALL im aktivierten Zustand eine hervorgehobene Farbe verwenden (z.B. Blau, konsistent mit dem bestehenden Farbschema der Anwendung).
3. THE Uebersetzungs_Toggle SHALL im deaktivierten Zustand eine neutrale Farbe verwenden (z.B. Grau).
4. THE Uebersetzungs_Toggle SHALL sich in der Aktionsleiste neben den bestehenden Buttons (Analysieren, Übersetzen, Bearbeiten, Löschen) befinden.
