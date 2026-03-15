**Song Text Trainer**

Product Requirements & UI Specification

Version 1.0 • für Kiro AI Agent

  ---------------- --------------------------------------------------------
  **Produkt**      Song Text Trainer

  **Plattform**    Plattformübergreifend (Web / Mobile / Desktop)

  **Zielgruppe**   Gemischte Nutzergruppen (Hobbysänger bis Profis)

  **Empfänger**    Kiro AI Agent
  ---------------- --------------------------------------------------------

# 1. Produktübersicht

Song Text Trainer ist eine plattformübergreifende Anwendung zum
Auswendiglernen von Songtexten. Sie kombiniert kognitive Lernmethoden
(Spaced Repetition, Lückentext, sequenzieller Aufbau) mit emotionalem
Lernen über Textverständnis und Interpretation sowie Quiz-Interaktionen
zur Wissensvertiefung.

## 1.1 Kernziele

-   Songtexte auswendig lernen (Langzeitgedächtnis)

-   Gesangstechnik durch strukturiertes Üben verbessern

-   Textverstehen und emotionale Verbindung fördern

-   Lernfortschritt messbar und motivierend gestalten

## 1.2 Design-Prinzipien

-   Minimalismus: Ablenkungsfreie Oberfläche, Fokus auf den Text

-   Gamification: Streak, Fortschrittsbalken, Session-Zähler -- subtil,
    nicht aufdringlich

-   Progressive Disclosure: Schwierigkeitsgrad steigt mit Kompetenz des
    Nutzers

-   Plattformagnostisch: Einheitliche UX auf Web, iOS/Android, Desktop

# 2. Informationsarchitektur

Die App ist Song-zentriert. Jeder Song gehört zu mindestens einem Set.
Das Dashboard ist der primäre Einstiegspunkt.

## 2.1 Datenmodell (konzeptuell)

  --------------------- -------------------------------------------------
  **Element**           **Spezifikation**

  **Set**               Sammlung von Songs (z.B. „Konzert März 2025")

  **Song**              Songtext mit Metadaten (Titel, Künstler, Sprache)

  **Strophe**           Benannter Textabschnitt (Verse 1, Chorus, Bridge
                        ...)

  **Zeile**             Einzelne Textzeile inkl. optionaler Übersetzung

  **Session**           Eine abgeschlossene Lerneinheit an einem Song

  **Fortschritt**       Prozentualer Lernstand je Strophe und gesamt

  **Notiz**             Persönliche Anmerkung des Nutzers zu einer
                        Strophe
  --------------------- -------------------------------------------------

## 2.2 Navigation

-   Primär: Dashboard → Set → Song → Lernmethode

-   Schnellzugriff: Letzter aktiver Song direkt vom Dashboard

-   Kein Deep-Nesting: maximal 3 Navigationsebenen

# 3. Dashboard

## 3.1 Beschreibung

Das Dashboard ist der Hauptscreen der App. Es zeigt alle Sets und Songs,
den Lernfortschritt je Song sowie Gamification-Elemente (Streak,
Session-Zähler).

## 3.2 UI-Spezifikation

  ------------------------ -------------------------------------------------
  **Element**              **Spezifikation**

  **Topbar**               Links: App-Titel „Meine Songs" (18px, 500).
                           Rechts: Streak-Pill (orange, Flammen-Icon + „N
                           Tage Streak").

  **Metrikkarten (3x)**    Raster 3 Spalten. Karten: „Songs aktiv" /
                           „Sessions gesamt" / „Ø Fortschritt". Grauer
                           Hintergrund, 22px Zahl, 12px Label.

  **Set-Karte**            Weiße Karte mit dünner Umrandung. Header:
                           Set-Name + Metazeile („N Songs · zuletzt
                           \[Datum\]") + Status-Badge. Ausklappbar.

  **Status-Badge**         Aktiv = lila Pill. Pflege = grüne Pill. Weitere
                           Status nach Bedarf.

  **Song-Zeile**           Innerhalb einer Set-Karte. Links: Status-Punkt
                           (grün=fertig, orange=aktiv, grau=neu) +
                           Song-Titel + Künstler. Rechts: Fortschrittsbalken
                           (72px) + Session-Zähler.

  **Fortschrittsbalken**   4px Höhe, grüne Füllung (#1D9E75), grauer
                           Hintergrund. Zeigt prozentualen Lernstand.

  **Hinzufügen-Button**    Gestrichelte Umrandung, volle Breite, neutrales
                           Grau. Text: „+ Neues Set oder Song hinzufügen".

  **Interaktion**          Tippen auf Song-Zeile öffnet Song-Detail /
                           Methodenwahl. Tippen auf Set-Header klappt
                           auf/zu.
  ------------------------ -------------------------------------------------

## 3.3 User Story

+--------------+-------------------------------------------------------+
| **Story ID** | US-001                                                |
+--------------+-------------------------------------------------------+
| **Titel**    | Dashboard: Übersicht aller Songs und Sets             |
+--------------+-------------------------------------------------------+
| **Als**      | Nutzer                                                |
+--------------+-------------------------------------------------------+
| **möchte     | alle meine Sets und Songs mit aktuellem               |
| ich**        | Lernfortschritt auf einen Blick sehen                 |
+--------------+-------------------------------------------------------+
| **damit**    | ich schnell entscheiden kann, welchen Song ich heute  |
|              | üben möchte                                           |
+--------------+-------------------------------------------------------+
| **Given**    | der Nutzer die App öffnet                             |
+--------------+-------------------------------------------------------+
| **When**     | das Dashboard geladen wird                            |
+--------------+-------------------------------------------------------+
| **Then**     | werden alle Sets mit ihren Songs angezeigt, inkl.     |
|              | Fortschrittsbalken, Session-Anzahl und Status-Punkt   |
|              | pro Song                                              |
+--------------+-------------------------------------------------------+
| **Akzeptanz  | ✓ Jeder Song zeigt einen Fortschrittsbalken (0--100%) |
| -kriterien** |                                                       |
|              | ✓ Session-Zähler ist sichtbar je Song                 |
|              |                                                       |
|              | ✓ Status-Punkte unterscheiden: neu / aktiv / gelernt  |
|              |                                                       |
|              | ✓ Streak-Anzeige ist sichtbar wenn Streak \> 0        |
|              |                                                       |
|              | ✓ Sets sind auf-/zuklappbar                           |
|              |                                                       |
|              | ✓ Ladezeit \< 1 Sekunde bei bis zu 50 Songs           |
+--------------+-------------------------------------------------------+

# 4. Lernmethode: Emotionales Lernen

## 4.1 Beschreibung

Der Nutzer erschließt den Song über Bedeutung und emotionalen Gehalt,
bevor er den Text auswendig lernt. Übersetzungen sind zunächst verborgen
und werden aktiv aufgedeckt. Interpretationen und persönliche Notizen
vertiefen die emotionale Verankerung.

## 4.2 UI-Spezifikation

  --------------------------- -------------------------------------------------
  **Element**                 **Spezifikation**

  **Navigationsleiste**       Zurück-Button (links) + Song-Titel +
                              Methoden-Label (rechts).

  **Emotions-Tags**           Horizontale Pill-Reihe mit Stimmungs-Tags des
                              Songs (z.B. Melancholie, Sehnsucht). Nicht
                              editierbar im Lernmodus.

  **Modus-Tabs**              Übersetzung \| Interpretation \| Meine Notizen.
                              Aktiver Tab lila hervorgehoben.

  **Strophen-Karte**          Pro Strophe eine Karte. Header: Strophen-Name +
                              „Alle aufdecken" Button.

  **Zeilen-Paar**             Original-Zeile (15px, primär) + Übersetzungszeile
                              darunter (13px, kursiv, sekundär).

  **Aufdecken-Interaktion**   Übersetzungen sind initial als graue Balken
                              verborgen (color: transparent, Hintergrund grau).
                              Tippen deckt die Übersetzung auf (Farbwechsel).
                              „Alle aufdecken" deckt alle Zeilen einer Strophe
                              auf.

  **Interpretations-Box**     Lila Hintergrund (#EEEDFE). Label „Bedeutung
                              dieser Strophe". Freitext-Erklärung. Nur im Tab
                              „Interpretation" sichtbar.

  **Notizfeld**               Textarea mit Placeholder „Meine persönliche
                              Verbindung zu diesem Abschnitt...". Nur im Tab
                              „Meine Notizen" sichtbar.

  **Aktions-Buttons**         2-Spalten-Raster: „Symbolik vertiefen"
                              (sekundär) + „Zum Lückentext" (primär, lila).
  --------------------------- -------------------------------------------------

## 4.3 User Stories

+--------------+-------------------------------------------------------+
| **Story ID** | US-010                                                |
+--------------+-------------------------------------------------------+
| **Titel**    | Zeilenweise Übersetzung aufdecken                     |
+--------------+-------------------------------------------------------+
| **Als**      | Nutzer                                                |
+--------------+-------------------------------------------------------+
| **möchte     | die Übersetzung jeder Zeile durch Antippen sehen      |
| ich**        |                                                       |
+--------------+-------------------------------------------------------+
| **damit**    | ich den emotionalen Inhalt aktiv erschließe statt ihn |
|              | passiv zu lesen                                       |
+--------------+-------------------------------------------------------+
| **Given**    | der Nutzer den Emotionales-Lernen-Screen eines Songs  |
|              | öffnet                                                |
+--------------+-------------------------------------------------------+
| **When**     | er auf eine verborgene Übersetzungszeile tippt        |
+--------------+-------------------------------------------------------+
| **Then**     | wird die Übersetzung sichtbar ohne Seitenneuladen     |
+--------------+-------------------------------------------------------+
| **Akzeptanz  | ✓ Übersetzungen sind initial nicht lesbar             |
| -kriterien** | (transparent/verborgen)                               |
|              |                                                       |
|              | ✓ Einzelnes Tippen deckt genau eine Zeile auf         |
|              |                                                       |
|              | ✓ „Alle aufdecken" deckt alle Zeilen der Strophe auf  |
|              |                                                       |
|              | ✓ Aufgedeckter Zustand bleibt während der Session     |
|              | erhalten                                              |
|              |                                                       |
|              | ✓ Animation: sanfter Farbwechsel (200ms transition)   |
+--------------+-------------------------------------------------------+

+--------------+-------------------------------------------------------+
| **Story ID** | US-011                                                |
+--------------+-------------------------------------------------------+
| **Titel**    | Persönliche Notizen speichern                         |
+--------------+-------------------------------------------------------+
| **Als**      | Nutzer                                                |
+--------------+-------------------------------------------------------+
| **möchte     | eigene Gedanken und Assoziation zu einer Strophe      |
| ich**        | notieren                                              |
+--------------+-------------------------------------------------------+
| **damit**    | meine persönliche emotionale Verbindung zum Song      |
|              | festgehalten wird                                     |
+--------------+-------------------------------------------------------+
| **Given**    | der Nutzer den Tab „Meine Notizen" öffnet             |
+--------------+-------------------------------------------------------+
| **When**     | er Text in das Notizfeld eingibt und die Session      |
|              | beendet                                               |
+--------------+-------------------------------------------------------+
| **Then**     | wird die Notiz persistiert und beim nächsten Öffnen   |
|              | wieder angezeigt                                      |
+--------------+-------------------------------------------------------+
| **Akzeptanz  | ✓ Textarea ist editierbar                             |
| -kriterien** |                                                       |
|              | ✓ Notiz wird automatisch gespeichert (kein separater  |
|              | Save-Button nötig)                                    |
|              |                                                       |
|              | ✓ Notiz ist beim nächsten Öffnen des Songs vorhanden  |
|              |                                                       |
|              | ✓ Pro Strophe eine separate Notiz möglich             |
+--------------+-------------------------------------------------------+

# 5. Lernmethode: Lückentext

## 5.1 Beschreibung

Der Nutzer ergänzt fehlende Wörter im Songtext. Der Schwierigkeitsgrad
bestimmt, wie viele Wörter ausgeblendet sind. Sofortiges Feedback färbt
das Eingabefeld grün (richtig) oder rot (falsch). Der Fortschrittsbalken
aktualisiert sich in Echtzeit.

## 5.2 Schwierigkeitsstufen

  --------------------- -------------------------------------------------
  **Element**           **Spezifikation**

  **Leicht (20%)**      Ca. jedes 5. Wort wird ausgeblendet.
                        Schlüsselwörter bevorzugt.

  **Mittel (40%)**      Ca. jedes 2.--3. Wort ausgeblendet.

  **Schwer (60%)**      Nur Füllwörter (Artikel, Präpositionen) bleiben
                        sichtbar.

  **Blind (100%)**      Der gesamte Text ist ausgeblendet. Nur
                        Zeilenstruktur sichtbar.
  --------------------- -------------------------------------------------

## 5.3 UI-Spezifikation

  ------------------------ -------------------------------------------------
  **Element**              **Spezifikation**

  **Navigationsleiste**    Zurück-Button + Song-Titel + „Lückentext" Label.

  **Fortschrittsbalken**   Grüner Balken (4px), zeigt Gesamtfortschritt des
                           Songs in %. Aktualisiert sich bei jeder richtigen
                           Antwort.

  **Schwierigkeitswahl**   4 gleichbreite Buttons: Leicht \| Mittel \|
                           Schwer \| Blind. Aktive Stufe lila hervorgehoben.
                           Wechsel setzt aktuelle Eingaben zurück.

  **Text-Block**           Pro Strophe ein weißer Block mit dünner
                           Umrandung. Strophen-Label oben links (11px,
                           uppercase).

  **Lücke**                Inline-Texteingabe (border-bottom lila, kein
                           Rahmen). Mindestbreite 60px, wächst mit Eingabe.
                           Placeholder: '···'.

  **Feedback-Farben**      Richtig: grüner Unterstrich + grüne Textfarbe.
                           Falsch: roter Unterstrich + rote Textfarbe.
                           Feedback on blur.

  **Hinweis-Button**       Zeigt den ersten Buchstaben des gesuchten
                           Wortes + '···'. Max. 1 Hinweis pro Lücke.

  **Score-Anzeige**        Grüne Pill rechts: „N / M richtig". Aktualisiert
                           sich live.

  **Alle-prüfen-Button**   Primärer lila Button, volle Breite. Prüft alle
                           noch offenen Eingaben.
  ------------------------ -------------------------------------------------

## 5.4 User Stories

+--------------+-------------------------------------------------------+
| **Story ID** | US-020                                                |
+--------------+-------------------------------------------------------+
| **Titel**    | Lückentext ausfüllen mit Echtzeit-Feedback            |
+--------------+-------------------------------------------------------+
| **Als**      | Nutzer                                                |
+--------------+-------------------------------------------------------+
| **möchte     | fehlende Wörter eingeben und sofort sehen ob ich      |
| ich**        | richtig liege                                         |
+--------------+-------------------------------------------------------+
| **damit**    | ich beim Lernen direktes Feedback erhalte und meinen  |
|              | Fortschritt spüre                                     |
+--------------+-------------------------------------------------------+
| **Given**    | der Nutzer den Lückentext-Screen geöffnet hat         |
+--------------+-------------------------------------------------------+
| **When**     | er ein Wort in eine Lücke einträgt und das Feld       |
|              | verlässt (blur)                                       |
+--------------+-------------------------------------------------------+
| **Then**     | färbt sich die Lücke grün (korrekt) oder rot (falsch) |
+--------------+-------------------------------------------------------+
| **Akzeptanz  | ✓ Feedback erfolgt on-blur, nicht on-keystroke        |
| -kriterien** |                                                       |
|              | ✓ Groß-/Kleinschreibung wird ignoriert beim Vergleich |
|              |                                                       |
|              | ✓ Fortschrittsbalken erhöht sich bei jeder richtigen  |
|              | Antwort                                               |
|              |                                                       |
|              | ✓ Score-Pill zeigt aktuellen Stand live               |
|              |                                                       |
|              | ✓ Bereits korrekte Eingaben können nicht mehr         |
|              | geändert werden                                       |
+--------------+-------------------------------------------------------+

+--------------+-------------------------------------------------------+
| **Story ID** | US-021                                                |
+--------------+-------------------------------------------------------+
| **Titel**    | Schwierigkeitsstufe wählen                            |
+--------------+-------------------------------------------------------+
| **Als**      | Nutzer                                                |
+--------------+-------------------------------------------------------+
| **möchte     | die Anzahl der Lücken selbst bestimmen                |
| ich**        |                                                       |
+--------------+-------------------------------------------------------+
| **damit**    | ich den Lückentext meinem aktuellen Könnensniveau     |
|              | anpassen kann                                         |
+--------------+-------------------------------------------------------+
| **Given**    | der Nutzer auf dem Lückentext-Screen ist              |
+--------------+-------------------------------------------------------+
| **When**     | er eine andere Schwierigkeitsstufe auswählt           |
+--------------+-------------------------------------------------------+
| **Then**     | wird der Text mit der neuen Anzahl an Lücken neu      |
|              | generiert und alle Eingaben zurückgesetzt             |
+--------------+-------------------------------------------------------+
| **Akzeptanz  | ✓ 4 Stufen verfügbar: Leicht / Mittel / Schwer /      |
| -kriterien** | Blind                                                 |
|              |                                                       |
|              | ✓ Aktive Stufe ist visuell hervorgehoben              |
|              |                                                       |
|              | ✓ Stufenwechsel setzt alle Eingaben zurück            |
|              |                                                       |
|              | ✓ Algorithmus blendet bei höherer Stufe Schlusswörter |
|              | zuerst aus                                            |
+--------------+-------------------------------------------------------+

# 6. Lernmethode: Zeile für Zeile

## 6.1 Beschreibung

Der Nutzer lernt den Text sequenziell: erst Zeile 1, dann Zeile 1+2,
dann 1+2+3 (kumulative Methode). Alternativ: pro Zeile eine separate
Übungs-Card. Der Fortschritt wird per Strophe getrackt.

## 6.2 UI-Spezifikation

  ------------------------- -------------------------------------------------
  **Element**               **Spezifikation**

  **Fortschritts-Dots**     Horizontale Punktreihe oben: ein Punkt pro Zeile
                            der aktuellen Strophe. Aktive Zeile: gefüllter
                            lila Punkt. Abgeschlossene: gefüllter grüner
                            Punkt. Noch ausstehende: grauer Kreis.

  **Aktive Zeile**          Großdarstellung (18px, primär) mit lila linkem
                            Rand-Akzent.

  **Bereits gelernte        Kleiner (14px, sekundär) über der aktiven Zeile
  Zeilen**                  dargestellt (kumulative Ansicht).

  **Eingabefeld**           Textarea: Nutzer tippt die aktive Zeile aus dem
                            Gedächtnis. Vergleich beim Absenden.

  **Weiter-Button**         Primärer Button „Weiter". Aktiviert nach
                            korrekter Eingabe oder nach 3 Fehlversuchen
                            (dann: Lösung anzeigen).

  **Strophen-Navigation**   Pfeile links/rechts zum Wechsel zwischen
                            Strophen.
  ------------------------- -------------------------------------------------

## 6.3 User Story

+--------------+-------------------------------------------------------+
| **Story ID** | US-030                                                |
+--------------+-------------------------------------------------------+
| **Titel**    | Zeile für Zeile sequenziell lernen                    |
+--------------+-------------------------------------------------------+
| **Als**      | Nutzer                                                |
+--------------+-------------------------------------------------------+
| **möchte     | den Text Zeile für Zeile aufbauend üben               |
| ich**        |                                                       |
+--------------+-------------------------------------------------------+
| **damit**    | ich nie überfordert bin und den Aufbau des Songs      |
|              | verinnerliche                                         |
+--------------+-------------------------------------------------------+
| **Given**    | der Nutzer die Methode „Zeile für Zeile" für einen    |
|              | Song startet                                          |
+--------------+-------------------------------------------------------+
| **When**     | er die angezeigte Zeile aus dem Gedächtnis eingibt    |
|              | und bestätigt                                         |
+--------------+-------------------------------------------------------+
| **Then**     | wird zur nächsten Zeile gewechselt und die bereits    |
|              | gelernten Zeilen kumulativ angezeigt                  |
+--------------+-------------------------------------------------------+
| **Akzeptanz  | ✓ Immer nur eine aktive Zeile zur Zeit                |
| -kriterien** |                                                       |
|              | ✓ Bereits gelernte Zeilen bleiben sichtbar            |
|              | (kumulativ)                                           |
|              |                                                       |
|              | ✓ Nach 3 Fehlversuchen: Zeige Lösung, dann weiter     |
|              |                                                       |
|              | ✓ Fortschritts-Dots zeigen Position in der Strophe    |
|              |                                                       |
|              | ✓ Strophen-Abschluss wird bestätigt (z.B. kurze       |
|              | Erfolgsmeldung)                                       |
+--------------+-------------------------------------------------------+

# 7. Lernmethode: Rückwärts lernen

## 7.1 Beschreibung

Die letzte Strophe wird zuerst geübt, dann die vorletzte usw. Dies
bekkämpft den Primacy-Effekt: Beim herkömmlichen Lernen kennen Nutzer
den Anfang auswendig, brechen aber in der Mitte ab. Das Rückwärtslernen
sorgt für gleichmäßige Sicherheit über den gesamten Song.

## 7.2 UI-Spezifikation

  -------------------------- -------------------------------------------------
  **Element**                **Spezifikation**

  **Strophen-Reihenfolge**   Song-Strophen werden in umgekehrter Reihenfolge
                             präsentiert (letzte Strophe = erste Übung).

  **Fortschrittsanzeige**    Label: „Strophe N von M -- von hinten" mit
                             Richtungspfeil-Icon.

  **Lerninteraktion**        Identisch mit Zeile-für-Zeile-Methode, aber in
                             umgekehrter Strophen-Reihenfolge.

  **Erklärungs-Tooltip**     Beim ersten Start: kurze Erklärung „Warum von
                             hinten?" (einmalig, abschaltbar).
  -------------------------- -------------------------------------------------

## 7.3 User Story

+--------------+-------------------------------------------------------+
| **Story ID** | US-040                                                |
+--------------+-------------------------------------------------------+
| **Titel**    | Song von der letzten Strophe rückwärts lernen         |
+--------------+-------------------------------------------------------+
| **Als**      | Nutzer                                                |
+--------------+-------------------------------------------------------+
| **möchte     | den Song von hinten nach vorne lernen                 |
| ich**        |                                                       |
+--------------+-------------------------------------------------------+
| **damit**    | ich am Ende des Songs genauso sicher bin wie am       |
|              | Anfang                                                |
+--------------+-------------------------------------------------------+
| **Given**    | der Nutzer die Methode „Rückwärts lernen" startet     |
+--------------+-------------------------------------------------------+
| **When**     | die erste Strophe angezeigt wird                      |
+--------------+-------------------------------------------------------+
| **Then**     | ist es die letzte Strophe des Songs (umgekehrte       |
|              | Reihenfolge)                                          |
+--------------+-------------------------------------------------------+
| **Akzeptanz  | ✓ Strophen werden in umgekehrter Reihenfolge          |
| -kriterien** | präsentiert                                           |
|              |                                                       |
|              | ✓ Fortschrittsanzeige kommuniziert die umgekehrte     |
|              | Richtung explizit                                     |
|              |                                                       |
|              | ✓ Lerninteraktion identisch zur                       |
|              | Zeile-für-Zeile-Methode                               |
|              |                                                       |
|              | ✓ Einmaliger Erklärungs-Tooltip beim ersten Start     |
+--------------+-------------------------------------------------------+

# 8. Lernmethode: Spaced Repetition

## 8.1 Beschreibung

Strophen, die fehlerfrei abgerufen werden, kommen seltener zur
Wiederholung. Strophen mit Fehlern werden priorisiert. Das System plant
die nächste Wiederholung automatisch basierend auf einem vereinfachten
SM-2-Algorithmus.

## 8.2 Wiederholungslogik

  --------------------- -------------------------------------------------
  **Element**           **Spezifikation**

  **Neue Strophe**      Erste Übung: sofort.

  **Korrekt (1x)**      Nächste Wiederholung: +1 Tag.

  **Korrekt (2x)**      Nächste Wiederholung: +3 Tage.

  **Korrekt (3x+)**     Nächste Wiederholung: +7 Tage.

  **Fehler**            Zurück zum Anfang: morgen wieder.
  --------------------- -------------------------------------------------

## 8.3 UI-Spezifikation

  -------------------------------- -------------------------------------------------
  **Element**                      **Spezifikation**

  **Heutige Queue**                Dashboard-Widget: „N Strophen heute fällig".
                                   Tippen startet direkt die Session.

  **Session-Flow**                 Eine Strophe nach der anderen. Nutzer bewertet
                                   selbst: „Gewusst" / „Nicht gewusst"
                                   (Flip-Card-Prinzip).

  **Nächste-Wiederholung-Label**   Nach jeder Strophe: „Nächste Wiederholung in X
                                   Tagen".

  **Fortschrittsindikator**        Oben: „N / M erledigt" für die aktuelle Session.

  **Streak-Integration**           Jede abgeschlossene Spaced-Repetition-Session
                                   zählt für den Tages-Streak.
  -------------------------------- -------------------------------------------------

## 8.4 User Story

+--------------+-------------------------------------------------------+
| **Story ID** | US-050                                                |
+--------------+-------------------------------------------------------+
| **Titel**    | Tägliche Wiederholungs-Queue abarbeiten               |
+--------------+-------------------------------------------------------+
| **Als**      | Nutzer                                                |
+--------------+-------------------------------------------------------+
| **möchte     | jeden Tag genau die Strophen üben, die heute fällig   |
| ich**        | sind                                                  |
+--------------+-------------------------------------------------------+
| **damit**    | ich meinen Lernfortschritt effizient halte ohne alles |
|              | täglich zu wiederholen                                |
+--------------+-------------------------------------------------------+
| **Given**    | der Nutzer die App öffnet und es fällige Strophen     |
|              | gibt                                                  |
+--------------+-------------------------------------------------------+
| **When**     | er auf „Heute üben" im Dashboard tippt                |
+--------------+-------------------------------------------------------+
| **Then**     | werden nur die heute fälligen Strophen in einer       |
|              | Session präsentiert                                   |
+--------------+-------------------------------------------------------+
| **Akzeptanz  | ✓ Dashboard zeigt Anzahl fälliger Strophen            |
| -kriterien** |                                                       |
|              | ✓ Session zeigt Flip-Cards: Text zuerst verborgen     |
|              |                                                       |
|              | ✓ Selbstbewertung „Gewusst" / „Nicht gewusst"         |
|              | aktualisiert Intervall                                |
|              |                                                       |
|              | ✓ Nächster Termin wird nach jeder Strophe             |
|              | kommuniziert                                          |
|              |                                                       |
|              | ✓ Abgeschlossene Session erhöht Streak-Zähler         |
+--------------+-------------------------------------------------------+

# 9. Lernmethode: Quiz

## 9.1 Beschreibung

Quiz-Interaktionen testen das Wissen auf spielerische Weise. Drei
Quiz-Typen stehen zur Verfügung, die je nach Lernphase empfohlen werden.

## 9.2 Quiz-Typen

  --------------------- -------------------------------------------------
  **Element**           **Spezifikation**

  **Multiple Choice**   Welches Wort kommt als nächstes? 4
                        Auswahlmöglichkeiten, 1 korrekt.

  **Reihenfolge**       Drag & Drop: Zeilen einer Strophe in die richtige
                        Reihenfolge bringen.

  **Diktat**            Nutzer hört (oder liest) eine Zeile und schreibt
                        sie aus dem Gedächtnis auf.
  --------------------- -------------------------------------------------

## 9.3 UI-Spezifikation

  ------------------------------ -------------------------------------------------
  **Element**                    **Spezifikation**

  **Quiz-Auswahl**               Kachel-Auswahl der 3 Typen beim Start.
                                 Kurzbeschreibung je Typ.

  **Multiple-Choice-Card**       Frage oben (14px). 4 Antwort-Buttons darunter.
                                 Selektion färbt gewählte Antwort, dann sofort:
                                 grün (korrekt) / rot (falsch) + richtige Antwort
                                 anzeigen.

  **Reihenfolge-Card**           Zeilen als verschiebbaren Karten dargestellt.
                                 Korrekte Reihenfolge wird nach Bestätigung
                                 farblich markiert.

  **Diktat-Card**                Textarea + Abgabe-Button. Zeilenweiser Vergleich
                                 mit Originaltext.

  **Score-Anzeige**              Am Ende jeder Quiz-Session: Punkte (N / M
                                 korrekt) + Empfehlung („Nochmal üben" vs. „Weiter
                                 zur nächsten Methode").

  **Fortschritts-Integration**   Richtige Quiz-Antworten erhöhen den
                                 Song-Fortschrittsbalken anteilig.
  ------------------------------ -------------------------------------------------

## 9.4 User Story

+--------------+-------------------------------------------------------+
| **Story ID** | US-060                                                |
+--------------+-------------------------------------------------------+
| **Titel**    | Multiple-Choice-Quiz durchführen                      |
+--------------+-------------------------------------------------------+
| **Als**      | Nutzer                                                |
+--------------+-------------------------------------------------------+
| **möchte     | mein Wissen über den Songtext per Multiple Choice     |
| ich**        | testen                                                |
+--------------+-------------------------------------------------------+
| **damit**    | ich Lücken in meinem Wissen spielerisch aufdecke      |
+--------------+-------------------------------------------------------+
| **Given**    | der Nutzer den Quiz-Typ Multiple Choice startet       |
+--------------+-------------------------------------------------------+
| **When**     | eine Frage angezeigt wird und er eine Antwort         |
|              | auswählt                                              |
+--------------+-------------------------------------------------------+
| **Then**     | wird die Auswahl sofort als korrekt oder falsch       |
|              | markiert und die richtige Antwort sichtbar gemacht    |
+--------------+-------------------------------------------------------+
| **Akzeptanz  | ✓ 4 Antwortoptionen je Frage                          |
| -kriterien** |                                                       |
|              | ✓ Sofortfeedback on selection (kein separater         |
|              | Prüfen-Button nötig)                                  |
|              |                                                       |
|              | ✓ Falsche Auswahl: rot, richtige Antwort zusätzlich   |
|              | grün markiert                                         |
|              |                                                       |
|              | ✓ Weiter-Button nach Feedback                         |
|              |                                                       |
|              | ✓ Abschluss-Screen zeigt Score und Empfehlung         |
+--------------+-------------------------------------------------------+

# 10. Gamification & Fortschritt

## 10.1 Streak

  --------------------- -------------------------------------------------
  **Element**           **Spezifikation**

  **Zähler**            Jeder Tag, an dem mindestens eine Lerneinheit
                        (jede Methode) abgeschlossen wird, zählt als
                        Streak-Tag.

  **Anzeige**           Orange Pill in der Topbar: „N Tage Streak".
                        Verschwindet wenn Streak = 0.

  **Verlust**           Kein Training an einem Tag setzt Streak auf 0
                        zurück.

  **Freeze**            Optional (spätere Version): 1 Streak-Freeze pro
                        Woche möglich.
  --------------------- -------------------------------------------------

## 10.2 Fortschrittsmodell

  ---------------------- -------------------------------------------------
  **Element**            **Spezifikation**

  **Song-Fortschritt**   Gewichteter Durchschnitt aller Strophen. Strophe
                         gilt als gelernt wenn: 3x korrekt in Spaced
                         Repetition ODER 2x Lückentext fehlerfrei.

  **Sessions-Zähler**    Jede abgeschlossene Lerneinheit erhöht den
                         Zähler. Wird pro Song auf dem Dashboard
                         angezeigt.

  **Status-Punkte**      Grau = 0%. Orange = 1--99%. Grün = 100%.

  **Ø Fortschritt**      Arithmetisches Mittel über alle aktiven Songs. Im
                         Dashboard-Metrikkarten-Bereich.
  ---------------------- -------------------------------------------------

# 11. Nicht-funktionale Anforderungen

## 11.1 Performance

-   Dashboard lädt in \< 1 Sekunde bei bis zu 50 Songs

-   Lückentext-Feedback erfolgt in \< 100ms

-   Offline-Unterstützung: bereits geladene Songs müssen ohne
    Internetverbindung nutzbar sein

## 11.2 Responsiveness

-   Alle Screens funktionieren bei Breiten 320px -- 1440px

-   Touch-Targets mindestens 44x44px auf Mobile

-   Keine horizontale Scroll-Notwendigkeit bei Standardbreiten

## 11.3 Barrierefreiheit

-   Kontrast: mind. 4.5:1 für normalen Text (WCAG AA)

-   Alle interaktiven Elemente per Tastatur erreichbar

-   Screenreader-kompatible Labels auf Formular-Elementen

## 11.4 Datenpersistenz

-   Lernfortschritt, Notizen und Streak werden lokal und/oder
    cloud-basiert gespeichert

-   Daten überleben App-Neustart und Gerätewechsel

# 12. Out of Scope (Version 1.0)

-   Gesangstechnik-Modul (separates Feature, nächste Phase)

-   Multiplayer / soziale Features

-   KI-generierte Interpretationen (manuell für v1.0)

-   Audio-Playback-Integration (optionaler Scope, nach
    UI-Fertigstellung)

-   Streak-Freeze-Mechanismus

― Ende des Dokuments ―