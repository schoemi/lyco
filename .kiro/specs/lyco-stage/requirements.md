# Requirements Document — Lyco Stage

## Einführung

Lyco Stage ist ein Bühnen-Prompter-Modus innerhalb der bestehenden Lyco Next.js-Webanwendung. Der Modus wird als PWA-Route `/stage` realisiert und verwandelt ein Smartphone oder Tablet in einen vollwertigen Songtext-Prompter für Live-Auftritte und Proben. Lyco Stage konsumiert ausschließlich Daten aus Lyco (Songs, Setlists, Lernfortschritt) — es findet kein Zurückschreiben statt. Durch Offline-First-Architektur mit Service Worker und Cache-First-Strategie funktioniert der Prompter auch ohne WLAN auf der Bühne. Die bestehenden Karaoke/Lesemodus-Komponenten werden wiederverwendet und erweitert.

## Glossar

- **Stage_Modus**: Die PWA-Route `/stage` innerhalb der Lyco-Webanwendung, die als Bühnen-Prompter fungiert
- **Prompter_Ansicht**: Die Vollbild-Textanzeige im Stage_Modus, die Songtexte für Live-Performance darstellt
- **Setlist_Ansicht**: Die geordnete Übersicht aller Songs einer Setlist im Stage_Modus
- **Service_Worker**: Der Browser-basierte Hintergrundprozess, der Netzwerkanfragen abfängt und gecachte Daten bereitstellt
- **Preflight_Check**: Die "Bühne vorbereiten"-Funktion, die vor dem Auftritt prüft, ob alle benötigten Daten lokal gecacht sind
- **Persistent_Storage**: Die Browser-API `navigator.storage.persist()`, die verhindert, dass das Betriebssystem den Cache löscht
- **BLE_Footswitch**: Ein Bluetooth-Low-Energy-Fußpedal (z.B. AirTurn, PageFlip), das HID-Keyboard-Events sendet
- **Confidence_Score**: Der Lernfortschritt-Prozentwert pro Strophe aus dem Song Text Trainer (Fortschritt-Modell)
- **Karaoke_Komponenten**: Die bestehenden Komponenten in `src/components/karaoke/` für Textanzeige, Auto-Scroll und Navigation
- **FlatLine**: Die flache Zeilenstruktur mit Kontext-Informationen, die in der Karaoke-Ansicht verwendet wird
- **DisplayMode**: Die Darstellungsmodi der Textanzeige (einzelzeile, strophe, song, keinText)
- **Delta_Sync**: Inkrementelle Synchronisation, bei der nur geänderte Songs heruntergeladen werden

## Requirements

### Requirement 1: PWA-Route und Stage-Layout

**User Story:** Als Musiker möchte ich über die Route `/stage` einen dedizierten Bühnen-Modus aufrufen, damit ich einen ablenkungsfreien Prompter für Live-Auftritte nutzen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer die Route `/stage` aufruft, THE Stage_Modus SHALL eine Vollbild-Ansicht mit schwarzem Hintergrund und weißem Text rendern
2. WHILE der Stage_Modus aktiv ist, THE Stage_Modus SHALL keine Navigationsleiste, keine Benachrichtigungen und keine Popups anzeigen
3. THE Stage_Modus SHALL die Fullscreen-API des Browsers nutzen, um die Adressleiste auszublenden
4. WHEN der Nutzer nicht authentifiziert ist, THE Stage_Modus SHALL zur Login-Seite weiterleiten
5. THE Stage_Modus SHALL als eigenständige Route außerhalb des `(main)`-Layouts existieren, um ein eigenes minimalistisches Layout zu verwenden

### Requirement 2: PWA-Manifest und Installierbarkeit

**User Story:** Als Musiker möchte ich Lyco Stage als PWA auf meinem Gerät installieren, damit ich den Prompter wie eine native App starten kann.

#### Akzeptanzkriterien

1. THE Stage_Modus SHALL ein Web-App-Manifest mit `display: "standalone"`, `theme_color: "#000000"` und `start_url: "/stage"` bereitstellen
2. THE Stage_Modus SHALL einen Service Worker registrieren, der eine Cache-First-Strategie für alle Stage-relevanten Assets und API-Daten implementiert
3. WHEN der Browser die PWA-Installationskriterien erkennt, THE Stage_Modus SHALL dem Nutzer die Installation anbieten

### Requirement 3: Offline-First mit Service Worker

**User Story:** Als Musiker möchte ich den Prompter ohne Internetverbindung nutzen, damit WLAN-Ausfall auf der Bühne kein Problem ist.

#### Akzeptanzkriterien

1. THE Service_Worker SHALL eine Cache-First-Strategie implementieren, bei der gecachte Daten vor Netzwerkanfragen bevorzugt werden
2. WHEN eine Netzwerkanfrage fehlschlägt und gecachte Daten vorhanden sind, THE Service_Worker SHALL die gecachten Daten zurückgeben
3. WHEN der Nutzer online ist und die Stage-Route aufruft, THE Service_Worker SHALL im Hintergrund aktualisierte Daten vom Server laden und den Cache aktualisieren
4. THE Stage_Modus SHALL `navigator.storage.persist()` aufrufen, um den Cache vor Löschung durch das Betriebssystem zu schützen
5. IF `navigator.storage.persist()` vom Browser abgelehnt wird, THEN THE Stage_Modus SHALL eine Warnung anzeigen, dass der Cache bei Speicherknappheit gelöscht werden könnte

### Requirement 4: Preflight-Check ("Bühne vorbereiten")

**User Story:** Als Musiker möchte ich vor dem Auftritt prüfen, ob alle Daten lokal verfügbar sind, damit ich sicher auf die Bühne gehen kann.

#### Akzeptanzkriterien

1. THE Stage_Modus SHALL eine "Bühne vorbereiten"-Funktion bereitstellen, die alle Songs und Setlists des Nutzers in den Cache lädt
2. WHEN der Nutzer "Bühne vorbereiten" auslöst, THE Stage_Modus SHALL für jeden Song den Songtext, die Strophen, die Zeilen und den Lernfortschritt in den Cache laden
3. WHILE der Preflight_Check läuft, THE Stage_Modus SHALL einen Fortschrittsbalken mit der Anzahl der geladenen Songs und der Gesamtanzahl anzeigen
4. WHEN der Preflight_Check abgeschlossen ist, THE Stage_Modus SHALL eine Bestätigung mit dem Zeitstempel der letzten Synchronisation anzeigen
5. IF ein Song während des Preflight_Check nicht geladen werden kann, THEN THE Stage_Modus SHALL den fehlgeschlagenen Song namentlich auflisten und den Preflight_Check für die übrigen Songs fortsetzen
6. THE Stage_Modus SHALL den Zeitstempel der letzten erfolgreichen Synchronisation persistent speichern und in der Setlist_Ansicht anzeigen

### Requirement 5: Setlist-Anzeige und Song-Navigation

**User Story:** Als Musiker möchte ich meine Setlist sehen und Songs auswählen, damit ich den Ablauf meines Auftritts steuern kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer die Stage-Route aufruft, THE Setlist_Ansicht SHALL alle Sets des Nutzers mit ihren Songs in der gespeicherten Reihenfolge anzeigen
2. WHEN der Nutzer einen Song in der Setlist_Ansicht antippt, THE Stage_Modus SHALL zur Prompter_Ansicht mit dem ausgewählten Song wechseln
3. WHILE ein Song in der Prompter_Ansicht aktiv ist, THE Setlist_Ansicht SHALL den aktiven Song visuell hervorgehoben darstellen
4. THE Setlist_Ansicht SHALL die Setlist-Daten ausschließlich lesend aus dem lokalen Cache laden — ohne Schreiboperationen zurück zum Server
5. WHEN der Nutzer den letzten Song einer Setlist beendet, THE Stage_Modus SHALL zur Setlist_Ansicht zurückkehren

### Requirement 6: Prompter-Textanzeige

**User Story:** Als Musiker möchte ich den Songtext groß und lesbar auf dem Bildschirm sehen, damit ich den Text aus der Entfernung lesen kann.

#### Akzeptanzkriterien

1. THE Prompter_Ansicht SHALL die bestehenden Karaoke_Komponenten (TextAnzeige, StrophenTitel, FlatLine-Struktur) wiederverwenden und für den Bühneneinsatz erweitern
2. THE Prompter_Ansicht SHALL die drei DisplayMode-Varianten (einzelzeile, strophe, song) unterstützen
3. THE Prompter_Ansicht SHALL eine Mindestschriftgröße von 32px für den Songtext verwenden, konfigurierbar in 5 Stufen bis 72px
4. THE Prompter_Ansicht SHALL einen schwarzen Hintergrund (#000000) mit weißem Text (#FFFFFF) als Standard verwenden
5. WHILE ein Song angezeigt wird, THE Prompter_Ansicht SHALL den Strophentitel (z.B. Verse, Chorus, Bridge) oberhalb des Textes anzeigen
6. WHEN der Nutzer zum nächsten Song in der Setlist wechselt, THE Prompter_Ansicht SHALL den Songnamen und Interpreten für 3 Sekunden einblenden

### Requirement 7: Auto-Scroll im Stage-Modus

**User Story:** Als Musiker möchte ich, dass der Text automatisch weiterscrollt, damit ich mich auf die Performance konzentrieren kann.

#### Akzeptanzkriterien

1. THE Prompter_Ansicht SHALL den bestehenden Auto-Scroll-Mechanismus aus den Karaoke_Komponenten wiederverwenden
2. WHEN der Nutzer Auto-Scroll aktiviert, THE Prompter_Ansicht SHALL den Text mit der konfigurierten Geschwindigkeit automatisch zur nächsten Zeile weiterschalten
3. WHEN der Nutzer manuell navigiert (Pedal, Touch, Tastatur), THE Prompter_Ansicht SHALL den Auto-Scroll pausieren
4. THE Prompter_Ansicht SHALL die Scroll-Geschwindigkeit als Einstellung pro Song persistent speichern

### Requirement 8: Lernfortschritt-Highlighting

**User Story:** Als Musiker möchte ich unsichere Textzeilen farblich hervorgehoben sehen, damit ich bei kritischen Stellen besonders aufmerksam bin.

#### Akzeptanzkriterien

1. THE Prompter_Ansicht SHALL den Confidence_Score pro Strophe aus dem Fortschritt-Modell laden
2. WHEN eine Strophe einen Confidence_Score unter 50% hat, THE Prompter_Ansicht SHALL alle Zeilen dieser Strophe in Amber/Orange (#F5A623) hervorheben
3. WHEN eine Strophe einen Confidence_Score zwischen 50% und 80% hat, THE Prompter_Ansicht SHALL alle Zeilen dieser Strophe leicht gedimmt (#AAAAAA) darstellen
4. WHEN eine Strophe einen Confidence_Score über 80% hat, THE Prompter_Ansicht SHALL alle Zeilen dieser Strophe in normalem Weiß (#FFFFFF) darstellen
5. WHEN für eine Strophe kein Confidence_Score vorhanden ist, THE Prompter_Ansicht SHALL die Zeilen in normalem Weiß (#FFFFFF) darstellen
6. THE Prompter_Ansicht SHALL eine Einstellung bereitstellen, mit der der Nutzer das Lernfortschritt-Highlighting deaktivieren kann
7. THE Prompter_Ansicht SHALL die Schwellwerte für die Highlighting-Stufen konfigurierbar machen (Standard: 50% und 80%)

### Requirement 9: BLE-Footswitch-Steuerung

**User Story:** Als Musiker möchte ich den Prompter per Fußpedal steuern, damit meine Hände frei bleiben.

#### Akzeptanzkriterien

1. THE Stage_Modus SHALL Keyboard-Events (PageUp, PageDown, ArrowUp, ArrowDown) als Navigationsbefehle für vorherige/nächste Zeile interpretieren
2. WHEN ein BLE-Footswitch HID-Keyboard-Events sendet, THE Stage_Modus SHALL diese Events wie reguläre Tastatureingaben verarbeiten
3. THE Stage_Modus SHALL die Leertaste als Toggle für Auto-Scroll-Start/Stopp interpretieren
4. WHERE der Browser die Web Bluetooth API unterstützt (Android), THE Stage_Modus SHALL eine optionale direkte BLE-Verbindung als Enhancement anbieten
5. WHEN die Web Bluetooth API nicht verfügbar ist, THE Stage_Modus SHALL ausschließlich auf HID-Keyboard-Events zurückfallen — ohne Fehlermeldung
6. THE Stage_Modus SHALL die bestehende Keyboard-Navigation aus `use-karaoke-keyboard.ts` wiederverwenden und um Stage-spezifische Tastenbelegungen erweitern

### Requirement 10: Touch-Navigation im Stage-Modus

**User Story:** Als Musiker möchte ich den Prompter auch per Touch bedienen, falls kein Fußpedal verfügbar ist.

#### Akzeptanzkriterien

1. WHEN der Nutzer auf der Prompter_Ansicht nach oben wischt, THE Prompter_Ansicht SHALL zur nächsten Zeile wechseln
2. WHEN der Nutzer auf der Prompter_Ansicht nach unten wischt, THE Prompter_Ansicht SHALL zur vorherigen Zeile wechseln
3. WHEN der Nutzer auf die Prompter_Ansicht tippt, THE Prompter_Ansicht SHALL den Auto-Scroll umschalten (Start/Stopp)
4. THE Prompter_Ansicht SHALL die bestehende Swipe-Navigation aus `use-karaoke-swipe.ts` wiederverwenden

### Requirement 11: Nächster-Song-Hinweis

**User Story:** Als Musiker möchte ich am Ende eines Songs sehen, welcher Song als nächstes kommt, damit ich mich vorbereiten kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer die letzten 3 Zeilen eines Songs in der Setlist erreicht, THE Prompter_Ansicht SHALL am unteren Bildschirmrand den Titel des nächsten Songs einblenden
2. WHEN der aktuelle Song der letzte in der Setlist ist, THE Prompter_Ansicht SHALL am unteren Bildschirmrand "Ende der Setlist" einblenden
3. THE Prompter_Ansicht SHALL den Nächster-Song-Hinweis dezent und gedimmt darstellen, um nicht vom aktuellen Text abzulenken

### Requirement 12: Stage-Einstellungen

**User Story:** Als Musiker möchte ich die Prompter-Einstellungen anpassen, damit die Anzeige für meine Bühnensituation optimiert ist.

#### Akzeptanzkriterien

1. THE Stage_Modus SHALL einen Einstellungs-Dialog bereitstellen, der über ein Zahnrad-Icon erreichbar ist
2. THE Stage_Modus SHALL folgende Einstellungen persistent im localStorage speichern: Schriftgröße, DisplayMode, Auto-Scroll-Geschwindigkeit, Highlighting an/aus, Highlighting-Schwellwerte
3. WHEN der Nutzer die Schriftgröße ändert, THE Prompter_Ansicht SHALL die Änderung sofort ohne Neuladen anwenden
4. THE Stage_Modus SHALL die Einstellungen des bestehenden Karaoke-Einstellungs-Dialogs erweitern, anstatt einen komplett neuen Dialog zu erstellen

### Requirement 13: Stage-API-Endpunkte

**User Story:** Als Entwickler möchte ich dedizierte API-Endpunkte für den Stage-Modus, damit der Preflight-Check alle benötigten Daten effizient laden kann.

#### Akzeptanzkriterien

1. THE Stage_Modus SHALL einen API-Endpunkt `GET /api/stage/bundle` bereitstellen, der alle Songs, Strophen, Zeilen und Setlists des authentifizierten Nutzers in einer einzigen Antwort zurückgibt
2. THE Stage_Modus SHALL einen API-Endpunkt `GET /api/stage/progress` bereitstellen, der den Confidence_Score aller Strophen des authentifizierten Nutzers zurückgibt
3. WHEN der Nutzer nicht authentifiziert ist, THE Stage_Modus SHALL für beide Endpunkte den HTTP-Statuscode 401 zurückgeben
4. THE Stage_Modus SHALL die API-Antworten mit einem ETag-Header versehen, damit der Service_Worker unveränderte Daten erkennen kann

### Requirement 14: Barrierefreiheit im Stage-Modus

**User Story:** Als Musiker mit eingeschränktem Sehvermögen möchte ich den Prompter mit Screenreader nutzen können, damit ich die Textinformationen wahrnehmen kann.

#### Akzeptanzkriterien

1. THE Prompter_Ansicht SHALL eine `aria-live="polite"`-Region bereitstellen, die den aktuellen Zeilentext für Screenreader ankündigt
2. THE Stage_Modus SHALL alle interaktiven Elemente mit aussagekräftigen `aria-label`-Attributen versehen
3. THE Stage_Modus SHALL die Tastaturnavigation vollständig unterstützen, sodass alle Funktionen ohne Maus oder Touch erreichbar sind
