# Anforderungsdokument: Spaced Repetition

## Einleitung

Spaced Repetition ist eine Lernmethode, bei der Strophen basierend auf dem individuellen Lernfortschritt in zunehmenden Zeitabständen wiederholt werden. Strophen, die fehlerfrei abgerufen werden, kommen seltener zur Wiederholung. Strophen mit Fehlern werden priorisiert und am nächsten Tag erneut präsentiert. Das System plant die nächste Wiederholung automatisch basierend auf einem vereinfachten SM-2-Algorithmus. Ein Dashboard-Widget zeigt die Anzahl heute fälliger Strophen an und ermöglicht den direkten Einstieg in eine Übungssession.

## Glossar

- **System**: Die Song Text Trainer Webanwendung (Next.js App Router)
- **Nutzer**: Ein authentifizierter Benutzer der Anwendung
- **Song**: Ein Songtext mit Metadaten (Titel, Künstler, Sprache), der dem Nutzer gehört
- **Strophe**: Ein benannter Textabschnitt innerhalb eines Songs (z.B. Verse 1, Chorus, Bridge)
- **Zeile**: Eine einzelne Textzeile innerhalb einer Strophe
- **Wiederholungs_Eintrag**: Ein Datensatz, der den Spaced-Repetition-Zustand einer Strophe für einen Nutzer speichert (nächstes Fälligkeitsdatum, Anzahl aufeinanderfolgender korrekter Wiederholungen, Stufe)
- **Fällige_Strophe**: Eine Strophe, deren nächstes Fälligkeitsdatum heute oder in der Vergangenheit liegt
- **Session**: Eine abgeschlossene Lerneinheit, in der der Nutzer alle fälligen Strophen einer Übungssession bearbeitet hat
- **Flip_Card**: Eine UI-Karte, die auf der Vorderseite den Strophen-Namen zeigt und auf der Rückseite den vollständigen Strophentext
- **Queue**: Die geordnete Liste aller heute fälligen Strophen für einen Nutzer
- **Dashboard_Widget**: Ein UI-Element auf dem Dashboard, das die Anzahl fälliger Strophen anzeigt und den Einstieg in die Session ermöglicht
- **Korrekt_Zähler**: Die Anzahl aufeinanderfolgender korrekter Selbstbewertungen einer Strophe ohne Fehler dazwischen
- **Streak**: Der Tages-Streak-Zähler, der bei mindestens einer abgeschlossenen Lerneinheit pro Tag erhöht wird
- **Fortschrittsindikator**: UI-Element, das den aktuellen Stand innerhalb einer Session anzeigt (z.B. „3 / 7 erledigt")

## Anforderungen

### Anforderung 1: Wiederholungs-Datenmodell

**User Story:** Als Nutzer möchte ich, dass das System meinen Lernfortschritt pro Strophe speichert, damit die nächste Wiederholung automatisch geplant werden kann.

#### Akzeptanzkriterien

1. THE System SHALL pro Nutzer und Strophe genau einen Wiederholungs_Eintrag verwalten.
2. THE Wiederholungs_Eintrag SHALL folgende Felder enthalten: nächstes Fälligkeitsdatum, Korrekt_Zähler und Erstellungsdatum.
3. WHEN ein Nutzer eine Strophe zum ersten Mal in das Spaced-Repetition-System aufnimmt, THE System SHALL einen Wiederholungs_Eintrag mit dem heutigen Datum als Fälligkeitsdatum und einem Korrekt_Zähler von 0 erstellen.
4. THE System SHALL sicherstellen, dass jeder Wiederholungs_Eintrag eindeutig pro Kombination aus Nutzer und Strophe ist.

### Anforderung 2: Vereinfachter SM-2-Algorithmus

**User Story:** Als Nutzer möchte ich, dass das System die Wiederholungsintervalle automatisch berechnet, damit ich effizient lerne ohne alles täglich wiederholen zu müssen.

#### Akzeptanzkriterien

1. WHEN der Nutzer eine Strophe mit „Gewusst" bewertet und der Korrekt_Zähler vorher 0 beträgt, THE System SHALL den Korrekt_Zähler auf 1 setzen und das nächste Fälligkeitsdatum auf das aktuelle Datum plus 1 Tag setzen.
2. WHEN der Nutzer eine Strophe mit „Gewusst" bewertet und der Korrekt_Zähler vorher 1 beträgt, THE System SHALL den Korrekt_Zähler auf 2 setzen und das nächste Fälligkeitsdatum auf das aktuelle Datum plus 3 Tage setzen.
3. WHEN der Nutzer eine Strophe mit „Gewusst" bewertet und der Korrekt_Zähler vorher 2 oder höher beträgt, THE System SHALL den Korrekt_Zähler um 1 erhöhen und das nächste Fälligkeitsdatum auf das aktuelle Datum plus 7 Tage setzen.
4. WHEN der Nutzer eine Strophe mit „Nicht gewusst" bewertet, THE System SHALL den Korrekt_Zähler auf 0 zurücksetzen und das nächste Fälligkeitsdatum auf das aktuelle Datum plus 1 Tag setzen.
5. THE System SHALL die Intervallberechnung als reine Funktion implementieren, die den aktuellen Korrekt_Zähler und die Bewertung als Eingabe erhält und den neuen Korrekt_Zähler sowie das neue Intervall in Tagen zurückgibt.
