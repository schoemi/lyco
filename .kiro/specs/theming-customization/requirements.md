# Anforderungsdokument: Theming & Customization

## Einleitung

Der Song Text Trainer verwendet derzeit fest kodierte Tailwind-CSS-Klassen (z.B. `bg-purple-600`, `text-gray-900`) für Farben, Typografie und Komponentenstile. Dieses Feature führt ein konfigurierbares Theming-System ein, das es Administratoren ermöglicht, das Erscheinungsbild der Anwendung über einen visuellen Editor anzupassen — einschließlich Farben, Typografie, Hintergründe und den Anwendungsnamen. Änderungen sollen in Echtzeit vorschaubar und persistent gespeichert werden.

## Glossar

- **Theming_System**: Das zentrale Modul, das CSS-Custom-Properties verwaltet und Theme-Konfigurationen auf die gesamte Anwendung anwendet.
- **Theme_Konfiguration**: Ein persistentes Datenobjekt, das alle anpassbaren Werte (Farben, Schriften, Bezeichnungen) eines Themes enthält.
- **Theming_Editor**: Die Admin-Oberfläche zum visuellen Bearbeiten und Vorschauen von Theme-Konfigurationen.
- **Farbpaletten_Generator**: Ein Algorithmus, der aus einer Hauptfarbe automatisch abgetönte Varianten (50–950) erzeugt.
- **Vorschau_Bereich**: Der WYSIWYG-Bereich im Theming-Editor, der Referenz-Komponenten mit den aktuellen Theme-Einstellungen darstellt.
- **Referenz_Komponenten**: Repräsentative UI-Elemente (Buttons, Cards, Tabs, Progressbars), die im Vorschau-Bereich zur visuellen Kontrolle angezeigt werden.
- **Karaoke_View**: Der Lesemodus, in dem Songtexte zeilenweise hervorgehoben werden und spezielle Text-Modi-Farben gelten.
- **Theme_Serializer**: Das Modul, das Theme-Konfigurationen in ein speicherbares Format (JSON) serialisiert und daraus wieder deserialisiert.

## Anforderungen

### Anforderung 1: Anwendungsname anpassen

**User Story:** Als Administrator möchte ich den angezeigten Namen der Anwendung ändern können, damit die Instanz an den jeweiligen Einsatzkontext angepasst werden kann.

#### Akzeptanzkriterien

1. THE Theming_Editor SHALL ein Textfeld zur Eingabe des Anwendungsnamens bereitstellen.
2. WHEN der Administrator einen neuen Anwendungsnamen eingibt, THE Theming_System SHALL den Namen in der Topbar, im Browser-Tab-Titel und auf der Login-Seite aktualisieren.
3. IF der Administrator das Namensfeld leer lässt, THEN THE Theming_System SHALL den Standard-Anwendungsnamen „Song Text Trainer" verwenden.
4. THE Theming_System SHALL den Anwendungsnamen auf maximal 50 Zeichen begrenzen.

### Anforderung 2: Primärfarbe und Farbpaletten-Generierung

**User Story:** Als Administrator möchte ich eine Primärfarbe festlegen und daraus automatisch eine vollständige Farbpalette generieren lassen, damit ein konsistentes Farbschema ohne manuellen Aufwand entsteht.

#### Akzeptanzkriterien

1. THE Theming_Editor SHALL einen Color-Picker zur Auswahl der Primärfarbe bereitstellen.
2. WHEN der Administrator eine Primärfarbe auswählt, THE Farbpaletten_Generator SHALL automatisch abgetönte Varianten (Stufen 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950) erzeugen.
3. THE Farbpaletten_Generator SHALL die Varianten so berechnen, dass die Stufe 500 der gewählten Hauptfarbe entspricht, hellere Stufen (50–400) den Hintergrund- und Hover-Bereich abdecken und dunklere Stufen (600–950) für Text und Akzente geeignet sind.
4. THE Vorschau_Bereich SHALL die generierte Farbpalette als Farbfelder-Reihe anzeigen.
5. WHEN die Primärfarbe geändert wird, THE Vorschau_Bereich SHALL alle Referenz-Komponenten sofort mit der neuen Palette aktualisieren.

### Anforderung 3: Akzentfarben konfigurieren

**User Story:** Als Administrator möchte ich separate Akzentfarben definieren können, damit sekundäre UI-Elemente visuell vom Primärfarbschema unterscheidbar sind.

#### Akzeptanzkriterien

1. THE Theming_Editor SHALL mindestens einen Color-Picker für eine Akzentfarbe bereitstellen.
2. WHEN der Administrator eine Akzentfarbe auswählt, THE Farbpaletten_Generator SHALL auch für die Akzentfarbe abgetönte Varianten (50–950) erzeugen.
3. THE Theming_System SHALL die Akzentfarbe auf sekundäre Buttons, Links und hervorgehobene Elemente anwenden.
4. IF keine Akzentfarbe definiert wird, THEN THE Theming_System SHALL die Primärfarbe als Fallback verwenden.

### Anforderung 4: Rahmenfarben konfigurieren

**User Story:** Als Administrator möchte ich die Rahmenfarben für Cards, Eingabefelder und Trennlinien anpassen können, damit die Begrenzungen der UI-Elemente zum Gesamtdesign passen.

#### Akzeptanzkriterien

1. THE Theming_Editor SHALL einen Color-Picker für die Standard-Rahmenfarbe bereitstellen.
2. WHEN der Administrator eine Rahmenfarbe festlegt, THE Theming_System SHALL die Farbe auf alle Card-Rahmen, Eingabefeld-Rahmen und Trennlinien anwenden.
3. THE Vorschau_Bereich SHALL Referenz-Komponenten mit Rahmen (Cards, Inputs) mit der gewählten Rahmenfarbe darstellen.

### Anforderung 5: Hintergrundfarben für Seite und Cards

**User Story:** Als Administrator möchte ich die Hintergrundfarben der Seite und der Cards separat einstellen können, damit die visuelle Tiefe und Lesbarkeit des Layouts kontrollierbar ist.

#### Akzeptanzkriterien

1. THE Theming_Editor SHALL separate Color-Picker für die Seiten-Hintergrundfarbe und die Card-Hintergrundfarbe bereitstellen.
2. WHEN der Administrator die Seiten-Hintergrundfarbe ändert, THE Theming_System SHALL die Hintergrundfarbe des `<body>`-Elements aktualisieren.
3. WHEN der Administrator die Card-Hintergrundfarbe ändert, THE Theming_System SHALL die Hintergrundfarbe aller Card-Komponenten aktualisieren.
4. THE Theming_System SHALL sicherstellen, dass zwischen Seiten-Hintergrund und Card-Hintergrund ein sichtbarer Kontrast besteht.

### Anforderung 6: Hintergrundfarben für Tabs und Controls

**User Story:** Als Administrator möchte ich die Hintergrundfarben von Tabs, Toggles und anderen interaktiven Controls anpassen können, damit diese Elemente konsistent zum Theme gestaltet sind.

#### Akzeptanzkriterien

1. THE Theming_Editor SHALL Color-Picker für Tab-Hintergrund (aktiv und inaktiv) und Control-Hintergrund bereitstellen.
2. WHEN der Administrator die Tab-Hintergrundfarben ändert, THE Theming_System SHALL die Farben auf alle Tab-Komponenten (z.B. Modus-Tabs, Schwierigkeitswahl) anwenden.
3. THE Theming_System SHALL den aktiven Tab-Zustand visuell vom inaktiven Zustand unterscheidbar halten.

### Anforderung 7: Signalfarben für Progressbar und Indikatoren

**User Story:** Als Administrator möchte ich die Signalfarben für Fortschrittsbalken, Status-Punkte und Indikatoren anpassen können, damit Erfolgs- und Statusinformationen zum Farbschema passen.

#### Akzeptanzkriterien

1. THE Theming_Editor SHALL Color-Picker für Erfolgsfarbe (Fortschrittsbalken, korrekte Antworten), Warnfarbe (aktive Elemente) und Fehlerfarbe (falsche Antworten) bereitstellen.
2. WHEN der Administrator die Erfolgsfarbe ändert, THE Theming_System SHALL die Farbe auf Fortschrittsbalken, Score-Pills und korrekte Lückentext-Eingaben anwenden.
3. WHEN der Administrator die Fehlerfarbe ändert, THE Theming_System SHALL die Farbe auf falsche Lückentext-Eingaben und Fehler-Indikatoren anwenden.
4. WHEN der Administrator die Warnfarbe ändert, THE Theming_System SHALL die Farbe auf aktive Status-Punkte und Streak-Anzeigen anwenden.

### Anforderung 8: Farben für Text-Modi in Karaoke-View

**User Story:** Als Administrator möchte ich die Farben für die verschiedenen Text-Modi im Karaoke-View anpassen können, damit die Hervorhebung der aktiven Zeile und der bereits gelesenen Zeilen zum Theme passt.

#### Akzeptanzkriterien

1. THE Theming_Editor SHALL Color-Picker für die aktive Zeile, bereits gelesene Zeilen und noch nicht gelesene Zeilen im Karaoke_View bereitstellen.
2. WHEN der Administrator die Karaoke-Farben ändert, THE Theming_System SHALL die Farben auf die entsprechenden Zeilenzustände im Karaoke_View anwenden.
3. THE Theming_System SHALL sicherstellen, dass die aktive Zeile visuell deutlich von gelesenen und ungelesenen Zeilen unterscheidbar bleibt.

### Anforderung 9: Button- und Toggle-Stile

**User Story:** Als Administrator möchte ich die Farben von Buttons und Toggles anpassen können, damit primäre Aktionen, Lernmethoden-Buttons und Bestätigungs-Buttons zum Theme passen.

#### Akzeptanzkriterien

1. THE Theming_Editor SHALL Farbeinstellungen für primäre Buttons (Weiter/Bestätigen), sekundäre Buttons (Lernmethoden) und den „+ Neuer Song"-Button bereitstellen.
2. WHEN der Administrator die primäre Button-Farbe ändert, THE Theming_System SHALL die Farbe auf alle primären Aktions-Buttons (Weiter, Bestätigen, Abgeben) anwenden.
3. WHEN der Administrator die sekundäre Button-Farbe ändert, THE Theming_System SHALL die Farbe auf Lernmethoden-Auswahl-Buttons und Strophen-Auswahl-Buttons anwenden.
4. THE Theming_System SHALL für jeden Button-Typ automatisch Hover- und Focus-Zustände aus der gewählten Farbe ableiten.
5. THE Theming_Editor SHALL eine Farbeinstellung für den Übersetzungs-Toggle bereitstellen.

### Anforderung 10: Typografie für Überschriften, Fließtext und Labels

**User Story:** Als Administrator möchte ich Schriftarten und Schriftgewichtungen für Überschriften, Fließtext und Labels festlegen können, damit die Typografie der Anwendung zum gewünschten Erscheinungsbild passt.

#### Akzeptanzkriterien

1. THE Theming_Editor SHALL Auswahlfelder für Schriftart und Schriftgewichtung für die Kategorien Headline, Copy und Label bereitstellen.
2. WHEN der Administrator eine Schriftart für Headlines ändert, THE Theming_System SHALL die Schriftart auf alle Überschriften (h1–h6) anwenden.
3. WHEN der Administrator eine Schriftart für Copy ändert, THE Theming_System SHALL die Schriftart auf allen Fließtext anwenden.
4. WHEN der Administrator eine Schriftart für Labels ändert, THE Theming_System SHALL die Schriftart auf alle Labels, Badges und Pill-Texte anwenden.
5. THE Theming_Editor SHALL eine Auswahl aus systemverfügbaren Schriftarten und Google Fonts bereitstellen.

### Anforderung 11: Typografie für Song-Zeilen und Übersetzungs-Zeilen

**User Story:** Als Administrator möchte ich Schriftart, Gewichtung und Größe für Song-Zeilen und Übersetzungs-Zeilen separat einstellen können, damit Original- und Übersetzungstext visuell unterscheidbar und gut lesbar sind.

#### Akzeptanzkriterien

1. THE Theming_Editor SHALL separate Einstellungen für Schriftart, Schriftgewichtung und Schriftgröße für Song-Zeilen und Übersetzungs-Zeilen bereitstellen.
2. WHEN der Administrator die Song-Zeilen-Typografie ändert, THE Theming_System SHALL die Einstellungen auf alle Original-Songtext-Zeilen in allen Lernmodi anwenden.
3. WHEN der Administrator die Übersetzungs-Zeilen-Typografie ändert, THE Theming_System SHALL die Einstellungen auf alle Übersetzungszeilen anwenden.
4. THE Vorschau_Bereich SHALL ein Beispiel-Zeilenpaar (Original + Übersetzung) mit den aktuellen Einstellungen anzeigen.

### Anforderung 12: Schriftgrößen für Karaoke-View

**User Story:** Als Administrator möchte ich die Schriftgrößen für Texte im Karaoke-View separat einstellen können, damit die Lesbarkeit im Lesemodus optimal ist.

#### Akzeptanzkriterien

1. THE Theming_Editor SHALL Schieberegler oder Eingabefelder für die Schriftgröße der aktiven Zeile, der bereits gelesenen Zeilen und der noch nicht gelesenen Zeilen im Karaoke_View bereitstellen.
2. WHEN der Administrator die Karaoke-Schriftgrößen ändert, THE Theming_System SHALL die Größen auf die entsprechenden Zeilenzustände im Karaoke_View anwenden.
3. THE Theming_System SHALL die Schriftgröße der aktiven Zeile auf einen Bereich von 14px bis 48px begrenzen.

### Anforderung 13: Theming-Editor mit Übersichtsseite und Referenz-Komponenten

**User Story:** Als Administrator möchte ich eine Übersichtsseite mit allen anpassbaren Referenz-Komponenten sehen, damit ich die Auswirkungen meiner Theme-Änderungen auf einen Blick beurteilen kann.

#### Akzeptanzkriterien

1. THE Theming_Editor SHALL eine Übersichtsseite bereitstellen, die alle Referenz_Komponenten in einer strukturierten Anordnung darstellt.
2. THE Übersichtsseite SHALL mindestens folgende Referenz_Komponenten enthalten: Buttons (primär, sekundär), Cards, Tabs, Progressbar, Status-Punkte, Song-Zeilen-Paar, Karaoke-Zeilen, Toggle, Eingabefelder und Score-Pill.
3. THE Referenz_Komponenten SHALL den aktuellen Stand der Theme_Konfiguration widerspiegeln.
4. WHEN der Administrator eine Theme-Einstellung ändert, THE Vorschau_Bereich SHALL die betroffenen Referenz_Komponenten innerhalb von 200ms aktualisieren.

### Anforderung 14: WYSIWYG-Vorschau im Theming-Editor

**User Story:** Als Administrator möchte ich Änderungen am Theme sofort in einer Live-Vorschau sehen, damit ich das Ergebnis beurteilen kann, bevor ich es speichere.

#### Akzeptanzkriterien

1. THE Theming_Editor SHALL einen Vorschau_Bereich bereitstellen, der Änderungen an der Theme_Konfiguration in Echtzeit darstellt.
2. WHEN der Administrator einen Farbwert ändert, THE Vorschau_Bereich SHALL die Änderung ohne Seitenneuladen anzeigen.
3. WHEN der Administrator eine Typografie-Einstellung ändert, THE Vorschau_Bereich SHALL die Änderung ohne Seitenneuladen anzeigen.
4. THE Theming_Editor SHALL einen „Speichern"-Button bereitstellen, der die aktuelle Theme_Konfiguration persistent speichert.
5. THE Theming_Editor SHALL einen „Zurücksetzen"-Button bereitstellen, der alle Einstellungen auf die Standardwerte zurücksetzt.
6. IF der Administrator den Theming_Editor verlässt ohne zu speichern, THEN THE Theming_Editor SHALL eine Bestätigungsmeldung anzeigen.

### Anforderung 15: Theme-Konfiguration persistieren und laden

**User Story:** Als Administrator möchte ich, dass die Theme-Konfiguration persistent gespeichert und beim Start der Anwendung automatisch geladen wird, damit das angepasste Erscheinungsbild dauerhaft erhalten bleibt.

#### Akzeptanzkriterien

1. WHEN der Administrator die Theme_Konfiguration speichert, THE Theming_System SHALL die Konfiguration in der Datenbank persistieren.
2. WHEN die Anwendung gestartet wird, THE Theming_System SHALL die gespeicherte Theme_Konfiguration laden und als CSS-Custom-Properties auf das Root-Element anwenden.
3. IF keine gespeicherte Theme_Konfiguration vorhanden ist, THEN THE Theming_System SHALL die Standard-Theme-Werte verwenden.
4. THE Theme_Serializer SHALL Theme_Konfigurationen in JSON serialisieren.
5. THE Theme_Serializer SHALL JSON-Daten in Theme_Konfigurationen deserialisieren.
6. FÜR ALLE gültigen Theme_Konfigurationen SHALL das Serialisieren und anschließende Deserialisieren ein äquivalentes Objekt erzeugen (Round-Trip-Eigenschaft).

### Anforderung 16: CSS-Custom-Properties-basiertes Theming

**User Story:** Als Entwickler möchte ich, dass das Theming über CSS-Custom-Properties umgesetzt wird, damit Theme-Änderungen ohne Neukompilierung wirksam werden und die Migration von fest kodierten Tailwind-Klassen schrittweise erfolgen kann.

#### Akzeptanzkriterien

1. THE Theming_System SHALL alle Theme-Werte als CSS-Custom-Properties (z.B. `--color-primary-500`, `--font-headline`) auf dem `:root`-Element definieren.
2. THE Theming_System SHALL die bestehenden fest kodierten Tailwind-Farbklassen (z.B. `bg-purple-600`) durch Referenzen auf CSS-Custom-Properties ersetzen.
3. WHEN eine CSS-Custom-Property aktualisiert wird, THE Theming_System SHALL die Änderung sofort auf alle Elemente anwenden, die diese Property referenzieren.
4. THE Theming_System SHALL Standard-Fallback-Werte für alle CSS-Custom-Properties definieren, die dem aktuellen Farbschema (Purple/Gray) entsprechen.
