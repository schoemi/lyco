# Anforderungsdokument: Frontend-Integration Songtext-Übersetzung

## Einleitung

Dieses Dokument beschreibt die Anforderungen für die Frontend-Integration der automatischen Songtext-Übersetzung in der Songtext-Lern-Webanwendung „Lyco". Das Backend (API-Route `/api/songs/[id]/translate` mit POST- und GET-Handlern, Übersetzungs-Service, Typen) ist bereits vollständig implementiert. Die bestehende Emotional-Lernen-Ansicht enthält bereits einen Übersetzungs-Tab mit Aufdecken-Interaktion, der das Feld `uebersetzung` der Zeilen ausliest. Es fehlt die Möglichkeit, eine Übersetzung auszulösen und die Zielsprache zu konfigurieren.

Die UI-Integration folgt den bestehenden Frontend-Mustern der Anwendung: React-Komponenten mit `fetch`-Aufrufen an die API, Ladezustände, Fehlermeldungen und optimistisches UI-Update nach erfolgreicher Aktion (analog zum „Analysieren"-Button auf der Song-Detailseite).

## Glossar

- **Song_Detailseite**: Die Seite unter `/songs/[id]`, die Song-Metadaten, Lernmethoden-Links und Strophen anzeigt (`src/app/(main)/songs/[id]/page.tsx`)
- **Emotional_Lernen_Seite**: Die Seite unter `/songs/[id]/emotional`, die den Übersetzungs-Tab, Interpretations-Tab und Notizen-Tab enthält (`src/app/(main)/songs/[id]/emotional/page.tsx`)
- **Uebersetzungs_Button**: Der UI-Button, der die LLM-basierte Übersetzung über die POST-API auslöst
- **Zielsprache_Auswahl**: Das UI-Element, mit dem der Benutzer die Zielsprache der Übersetzung konfigurieren kann
- **Uebersetzungs_API**: Der bestehende API-Endpunkt unter `/api/songs/[id]/translate` (POST zum Auslösen, GET zum Abrufen)
- **Uebersetzungs_Status**: Der aktuelle Zustand der Übersetzungsanfrage (idle, loading, success, error)
- **Aufdecken_Interaktion**: Die bestehende Interaktion im Übersetzungs-Tab, bei der Benutzer verdeckte Übersetzungszeilen durch Klick aufdecken

## Anforderungen

### Anforderung 1: Übersetzung auf der Song-Detailseite auslösen

**User Story:** Als Benutzer möchte ich auf der Song-Detailseite eine Übersetzung meines Songtextes auslösen können, damit ich die Übersetzung generieren kann, ohne die Seite wechseln zu müssen.

#### Akzeptanzkriterien

1. THE Song_Detailseite SHALL einen Uebersetzungs_Button in der Aktionsleiste neben dem bestehenden „Analysieren"-Button anzeigen.
2. WHEN der Benutzer den Uebersetzungs_Button klickt, THE Song_Detailseite SHALL eine POST-Anfrage an die Uebersetzungs_API senden.
3. WHILE die Übersetzung läuft, THE Uebersetzungs_Button SHALL deaktiviert sein und einen Ladezustand anzeigen (z.B. „Übersetze…").
4. WHEN die Uebersetzungs_API eine erfolgreiche Antwort zurückgibt, THE Song_Detailseite SHALL die Songdaten im lokalen State aktualisieren, sodass die Übersetzungen in den Zeilen-Objekten verfügbar sind.
5. IF die Uebersetzungs_API einen Fehler zurückgibt, THEN THE Song_Detailseite SHALL die Fehlermeldung aus der API-Antwort in einem sichtbaren Fehlerbereich anzeigen.
6. WHEN die Übersetzung erfolgreich abgeschlossen ist, THE Song_Detailseite SHALL den Ladezustand des Uebersetzungs_Buttons zurücksetzen.

### Anforderung 2: Zielsprache konfigurieren

**User Story:** Als Benutzer möchte ich die Zielsprache der Übersetzung auswählen können, damit ich Songtexte in meine bevorzugte Sprache übersetzen lassen kann.

#### Akzeptanzkriterien

1. THE Song_Detailseite SHALL eine Zielsprache_Auswahl in der Nähe des Uebersetzungs_Buttons anzeigen.
2. THE Zielsprache_Auswahl SHALL eine vordefinierte Liste gängiger Sprachen anbieten (mindestens: Deutsch, Englisch, Spanisch, Französisch, Italienisch, Portugiesisch).
3. THE Zielsprache_Auswahl SHALL „Deutsch" als Standardwert vorauswählen.
4. WHEN der Benutzer den Uebersetzungs_Button klickt, THE Song_Detailseite SHALL die ausgewählte Zielsprache als `zielsprache`-Parameter im POST-Request-Body an die Uebersetzungs_API senden.
5. IF der Song ein Feld `sprache` mit dem Wert der aktuell ausgewählten Zielsprache hat, THEN THE Song_Detailseite SHALL den Benutzer darauf hinweisen, dass Original- und Zielsprache identisch sind.

### Anforderung 3: Übersetzungsstatus und Feedback

**User Story:** Als Benutzer möchte ich den Status meiner Übersetzungsanfrage sehen, damit ich weiß, ob die Übersetzung läuft, erfolgreich war oder fehlgeschlagen ist.

#### Akzeptanzkriterien

1. WHILE die Übersetzung läuft, THE Song_Detailseite SHALL einen visuellen Ladeindikator anzeigen, der den Benutzer über den laufenden Vorgang informiert.
2. WHEN die Übersetzung erfolgreich abgeschlossen ist, THE Song_Detailseite SHALL eine Erfolgsmeldung anzeigen.
3. IF die Uebersetzungs_API den HTTP-Statuscode 409 zurückgibt, THEN THE Song_Detailseite SHALL die Meldung „Eine Übersetzung läuft bereits für diesen Song." anzeigen.
4. IF die Uebersetzungs_API den HTTP-Statuscode 429 zurückgibt, THEN THE Song_Detailseite SHALL die Meldung aus der API-Antwort anzeigen.
5. IF die Uebersetzungs_API einen anderen Fehler zurückgibt, THEN THE Song_Detailseite SHALL die Fehlermeldung aus der API-Antwort in einem Fehlerbereich anzeigen.
6. THE Song_Detailseite SHALL Fehlermeldungen in einem visuell abgegrenzten Bereich mit rotem Rahmen anzeigen (konsistent mit dem bestehenden Analyse-Fehlerbereich).

### Anforderung 4: Optimistisches UI-Update nach Übersetzung

**User Story:** Als Benutzer möchte ich nach einer erfolgreichen Übersetzung sofort die Ergebnisse sehen, ohne die Seite neu laden zu müssen.

#### Akzeptanzkriterien

1. WHEN die Uebersetzungs_API eine erfolgreiche Antwort mit dem UebersetzungResult zurückgibt, THE Song_Detailseite SHALL die `uebersetzung`-Felder der Zeilen im lokalen Song-State aktualisieren.
2. THE Song_Detailseite SHALL die Zuordnung der Übersetzungen zu den Zeilen über die `zeileId` im UebersetzungResult vornehmen.
3. WHEN der Benutzer nach einer erfolgreichen Übersetzung zur Emotional_Lernen_Seite navigiert, THE Emotional_Lernen_Seite SHALL die Übersetzungen im Übersetzungs-Tab mit der Aufdecken_Interaktion anzeigen (da die Daten beim Laden der Seite frisch von der API geholt werden).

### Anforderung 5: Integration in die Emotional-Lernen-Ansicht

**User Story:** Als Benutzer möchte ich auch innerhalb der Emotional-Lernen-Ansicht eine Übersetzung auslösen können, falls noch keine Übersetzungen vorhanden sind.

#### Akzeptanzkriterien

1. WHEN der Übersetzungs-Tab aktiv ist und keine Zeile eine Übersetzung hat, THE Emotional_Lernen_Seite SHALL einen Hinweis anzeigen, dass noch keine Übersetzungen vorhanden sind.
2. WHEN keine Übersetzungen vorhanden sind, THE Emotional_Lernen_Seite SHALL einen Uebersetzungs_Button mit Zielsprache_Auswahl im Übersetzungs-Tab anzeigen, um die Übersetzung direkt auszulösen.
3. WHEN die Übersetzung über den Übersetzungs-Tab ausgelöst und erfolgreich abgeschlossen wird, THE Emotional_Lernen_Seite SHALL die Songdaten im lokalen State aktualisieren, sodass die Aufdecken_Interaktion sofort verfügbar ist.
4. WHILE die Übersetzung über den Übersetzungs-Tab läuft, THE Emotional_Lernen_Seite SHALL einen Ladezustand im Übersetzungs-Tab anzeigen.
5. IF die Übersetzung über den Übersetzungs-Tab fehlschlägt, THEN THE Emotional_Lernen_Seite SHALL die Fehlermeldung im Übersetzungs-Tab anzeigen.

### Anforderung 6: Barrierefreiheit

**User Story:** Als Benutzer mit Einschränkungen möchte ich die Übersetzungsfunktion mit assistiven Technologien bedienen können.

#### Akzeptanzkriterien

1. THE Uebersetzungs_Button SHALL ein beschreibendes `aria-label`-Attribut besitzen (z.B. „Songtext übersetzen").
2. THE Zielsprache_Auswahl SHALL ein zugeordnetes `<label>`-Element oder `aria-label`-Attribut besitzen.
3. WHILE die Übersetzung läuft, THE Uebersetzungs_Button SHALL das Attribut `aria-busy="true"` tragen.
4. WHEN eine Fehlermeldung angezeigt wird, THE Fehlermeldung SHALL das Attribut `role="alert"` besitzen, damit Screenreader die Meldung automatisch vorlesen.
5. THE Zielsprache_Auswahl SHALL per Tastatur bedienbar sein.
6. THE Uebersetzungs_Button SHALL eine Mindestgröße von 44×44 Pixeln haben (konsistent mit den bestehenden Touch-Targets der Anwendung).
