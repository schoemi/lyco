# Requirements Document

## Introduction

Der Set-Playlist-Player ermöglicht es dem Nutzer, alle Songs eines Sets hintereinander abzuspielen (Playlist-Modus). Die Wiedergabereihenfolge entspricht standardmäßig der Reihenfolge der Songs im Set. Der Nutzer kann – analog zum Einzel-Song-Player – zwischen den verfügbaren Audio-Rollen (Standard, Instrumental, Referenz-Vokal) wechseln. Der Player zeigt den aktuell spielenden Song an und erlaubt die Navigation zwischen Songs.

## Glossary

- **Set_Playlist_Player**: Die Komponente, die alle Songs eines Sets nacheinander abspielt.
- **Set**: Eine geordnete Sammlung von Songs (z. B. „Konzert März 2025").
- **Song**: Ein Musikstück mit Metadaten (Titel, Künstler) und zugehörigen Audio-Quellen.
- **Audio_Quelle**: Eine MP3-Datei oder ein Streaming-Link, der einem Song zugeordnet ist.
- **Audio_Rolle**: Die Funktion einer Audio-Quelle: `STANDARD`, `INSTRUMENTAL` oder `REFERENZ_VOKAL`.
- **Playlist_Modus**: Der Betriebsmodus, in dem Songs eines Sets automatisch nacheinander abgespielt werden.
- **Aktiver_Song**: Der Song, der im Playlist_Modus gerade abgespielt wird oder als nächstes abgespielt wird.
- **Wiedergabe_Reihenfolge**: Die Reihenfolge der Songs, wie sie im Set definiert ist (`orderIndex`), aufsteigend sortiert.
- **Set_Footer**: Eine Zeile unterhalb der Song-Cards einer Set-Karte auf dem Dashboard, die Set-Statistiken, Audio-Rollen-Verfügbarkeit und eine Schnellstart-Schaltfläche anzeigt.
- **Set_Karte**: Die Darstellung eines Sets auf dem Dashboard, bestehend aus Set-Header, Song-Cards und Set_Footer.
- **Dashboard**: Die Übersichtsseite der Anwendung, die alle Sets und Songs des Nutzers anzeigt.
- **Spielbarer_Song**: Ein Song mit mindestens einer MP3-Audio_Quelle.

---

## Requirements

### Requirement 1: Playlist-Modus starten

**User Story:** Als Nutzer möchte ich alle Songs eines Sets hintereinander abspielen, damit ich eine komplette Set-Durchlaufprobe machen kann, ohne jeden Song manuell starten zu müssen.

#### Acceptance Criteria

1. WHEN der Nutzer auf der Set-Detailseite die Aktion „Set abspielen" auslöst, THE Set_Playlist_Player SHALL den Playlist_Modus starten und den ersten Song des Sets in der definierten Wiedergabe_Reihenfolge abspielen.
2. THE Set_Playlist_Player SHALL ausschließlich Songs abspielen, für die mindestens eine Audio_Quelle als MP3-Datei vorhanden ist.
3. IF kein Song im Set eine MP3-Datei als Audio_Quelle besitzt, THEN THE Set_Playlist_Player SHALL eine Hinweismeldung anzeigen, die sichtbar bleibt bis der Nutzer sie explizit schließt, und den Playlist_Modus nicht starten.
4. IF nur ein Teil der Songs im Set eine MP3-Datei als Audio_Quelle besitzt, THEN THE Set_Playlist_Player SHALL ausschließlich die Songs mit MP3-Audio_Quelle abspielen und die übrigen Songs überspringen.
5. THE Set_Playlist_Player SHALL die Wiedergabe_Reihenfolge der Songs gemäß dem `orderIndex` des Sets aufsteigend einhalten; bei identischem `orderIndex` zweier Songs wird alphabetisch nach Songtitel als Tiebreaker sortiert.
6. IF das Set keine Songs enthält, THEN THE Set_Playlist_Player SHALL eine Hinweismeldung anzeigen und den Playlist_Modus nicht starten.

---

### Requirement 2: Automatischer Übergang zum nächsten Song

**User Story:** Als Nutzer möchte ich, dass der nächste Song automatisch startet, wenn der aktuelle Song zu Ende ist, damit der Playlist-Modus unterbrechungsfrei abläuft.

#### Acceptance Criteria

1. WHEN ein Song im Playlist_Modus zu Ende gespielt wurde, THE Set_Playlist_Player SHALL den nächsten Song in der Wiedergabe_Reihenfolge innerhalb von 2 Sekunden automatisch starten.
2. WHEN der letzte Song im Playlist_Modus zu Ende gespielt wurde, THE Set_Playlist_Player SHALL die Wiedergabe stoppen, die Steuerelemente deaktivieren und einen End-of-Playlist-Indikator anzeigen.
3. WHEN beim automatischen Übergang zum nächsten Song dessen Audio_Quelle nicht geladen werden kann, THE Set_Playlist_Player SHALL diesen Song überspringen und den übernächsten Song starten, ohne den Playlist_Modus zu beenden.

---

### Requirement 3: Manuelle Navigation zwischen Songs

**User Story:** Als Nutzer möchte ich während der Playlist-Wiedergabe manuell zum vorherigen oder nächsten Song springen, damit ich einzelne Songs wiederholen oder überspringen kann.

#### Acceptance Criteria

1. WHILE der Playlist_Modus aktiv ist und der Aktive_Song nicht der letzte Song in der Wiedergabe_Reihenfolge ist, THE Set_Playlist_Player SHALL eine aktive Steuerung zum Wechsel zum nächsten Song bereitstellen; ist der Aktive_Song der letzte Song, SHALL die Steuerung deaktiviert sein.
2. WHILE der Playlist_Modus aktiv ist und der Aktive_Song nicht der erste Song in der Wiedergabe_Reihenfolge ist, THE Set_Playlist_Player SHALL eine aktive Steuerung zum Wechsel zum vorherigen Song bereitstellen; ist der Aktive_Song der erste Song, SHALL die Steuerung deaktiviert sein.
3. WHEN der Nutzer zum nächsten Song wechselt, THE Set_Playlist_Player SHALL die Wiedergabe des Aktiven_Songs stoppen und den nachfolgenden Song in der Wiedergabe_Reihenfolge ab Position 0 abspielen.
4. WHEN der Nutzer zum vorherigen Song wechselt, THE Set_Playlist_Player SHALL die Wiedergabe des Aktiven_Songs stoppen und den vorangehenden Song in der Wiedergabe_Reihenfolge ab Position 0 abspielen.

---

### Requirement 4: Anzeige des aktiven Songs

**User Story:** Als Nutzer möchte ich jederzeit sehen, welcher Song gerade abgespielt wird und welche Songs als Nächstes kommen, damit ich den Überblick über das Set behalte.

#### Acceptance Criteria

1. WHILE der Playlist_Modus aktiv ist, THE Set_Playlist_Player SHALL den Titel des Aktiven_Songs anzeigen; IF Künstlerinformationen vorhanden sind, THE Set_Playlist_Player SHALL zusätzlich den Künstler anzeigen.
2. WHILE der Playlist_Modus aktiv ist, THE Set_Playlist_Player SHALL die Position des Aktiven_Songs in der Playlist anzeigen (z. B. „Song 2 von 5"), wobei der Nenner die Anzahl der abspielbaren Songs (mit MP3-Audio_Quelle) widerspiegelt.
3. WHILE der Playlist_Modus aktiv ist, THE Set_Playlist_Player SHALL den Aktiven_Song in der Songliste des Sets optisch eindeutig von allen anderen Songs unterscheidbar hervorheben.
4. WHILE der Playlist_Modus aktiv ist und die Gesamtdauer des Aktiven_Songs bekannt ist, THE Set_Playlist_Player SHALL den Fortschrittsbalken und die Zeitanzeige im Format MM:SS (abgelaufen / gesamt) darstellen.
5. IF die Gesamtdauer des Aktiven_Songs nicht bekannt ist, THEN THE Set_Playlist_Player SHALL ausschließlich die abgelaufene Zeit im Format MM:SS anzeigen und keinen Fortschrittsbalken darstellen.

---

### Requirement 5: Audio-Rollen-Auswahl (Modus)

**User Story:** Als Nutzer möchte ich für die gesamte Playlist einen Audio-Modus (Standard, Instrumental, Referenz-Vokal) wählen, damit ich das Set z. B. komplett ohne Gesang üben kann.

#### Acceptance Criteria

1. THE Set_Playlist_Player SHALL eine Modusauswahl für die Audio_Rolle bereitstellen, die die Werte `STANDARD`, `INSTRUMENTAL` und `REFERENZ_VOKAL` anbietet; der Standardwert beim Start des Playlist_Modus ist `STANDARD`.
2. WHEN der Nutzer einen Modus auswählt, THE Set_Playlist_Player SHALL für alle Songs der gesamten Playlist (einschließlich des Aktiven_Songs) die Audio_Quelle mit der gewählten Audio_Rolle verwenden, sofern eine solche vorhanden ist.
3. IF für einen Song keine Audio_Quelle mit der gewählten Audio_Rolle vorhanden ist, THEN THE Set_Playlist_Player SHALL für diesen Song die Audio_Quelle mit der Rolle `STANDARD` als Fallback verwenden.
4. IF für einen Song keine Audio_Quelle mit der Rolle `STANDARD` als Fallback vorhanden ist, THEN THE Set_Playlist_Player SHALL diesen Song überspringen und zum nächsten Song wechseln.
5. WHEN der Nutzer den Modus während der Wiedergabe ändert, THE Set_Playlist_Player SHALL die Moduswahl auf den Aktiven_Song anwenden, indem die Audio_Quelle bei der aktuellen Wiedergabeposition gewechselt wird, ohne die Wiedergabe zu unterbrechen oder neu zu starten.

---

### Requirement 6: Wiedergabesteuerung

**User Story:** Als Nutzer möchte ich die Wiedergabe pausieren und fortsetzen können, damit ich das Set in meinem eigenen Tempo üben kann.

#### Acceptance Criteria

1. WHILE der Playlist_Modus aktiv ist, THE Set_Playlist_Player SHALL eine Wiedergabe-/Pause-Steuerung bereitstellen, die den aktuellen Wiedergabestatus (spielend / pausiert) visuell anzeigt.
2. WHEN der Nutzer die Wiedergabe pausiert, THE Set_Playlist_Player SHALL die Wiedergabe des Aktiven_Songs an der aktuellen Position anhalten.
3. WHEN der Nutzer die Wiedergabe nach einer Pause fortsetzt, THE Set_Playlist_Player SHALL die Wiedergabe des Aktiven_Songs ab der gespeicherten Position fortsetzen.
4. WHILE der Playlist_Modus aktiv ist, THE Set_Playlist_Player SHALL die Lautstärke über einen Regler im Bereich 0–100 steuerbar machen.
5. WHEN der Nutzer zwischen Songs wechselt, THE Set_Playlist_Player SHALL den zuvor eingestellten Lautstärkewert beibehalten.
6. WHEN der Nutzer bei pausierter Wiedergabe zu einem anderen Song navigiert, THE Set_Playlist_Player SHALL den neuen Song geladen aber pausiert anzeigen, ohne die Wiedergabe automatisch zu starten.

---

### Requirement 7: Positionierung des Players

**User Story:** Als Nutzer möchte ich den Player auch dann bedienen können, wenn ich in der Set-Songliste scrolle, damit die Steuerung immer erreichbar ist.

#### Acceptance Criteria

1. WHILE der Playlist_Modus aktiv ist, THE Set_Playlist_Player SHALL als fixierter Player am unteren Bildschirmrand eingeblendet sein, verankert am Viewport unabhängig vom Scroll-Zustand der Seite.
2. WHILE der Playlist_Modus aktiv ist, THE Set_Playlist_Player SHALL unabhängig vom Scroll-Zustand der Set-Detailseite sichtbar und bedienbar bleiben.
3. THE Set_Playlist_Player SHALL zwischen einem ausgeklappten Zustand (vollständige Anzeige mit allen Steuerelementen) und einem eingeklappten Zustand (minimale Anzeige mit mindestens Titel und Play/Pause-Steuerung) umgeschaltet werden können.
4. WHEN der Nutzer den Player ein- oder ausklappt, THE Set_Playlist_Player SHALL die laufende Wiedergabe nicht unterbrechen.

---

### Requirement 8: Set-Footer-Widget im Dashboard

**User Story:** Als Nutzer möchte ich auf dem Dashboard auf einen Blick die wichtigsten Kennzahlen eines Sets sehen und die Playlist direkt starten können, damit ich ohne Umweg über die Set-Detailseite in eine Durchlaufprobe einsteigen kann.

#### Acceptance Criteria

1. THE Dashboard SHALL unterhalb der Song-Cards jeder Set_Karte einen Set_Footer anzeigen, der in drei Bereiche (linkes Drittel, mittleres Drittel, rechtes Drittel) gegliedert ist.

2. THE Set_Footer SHALL im linken Drittel folgende Set-Statistiken anzeigen: die Gesamtanzahl der Songs des Sets; die Anzahl der unterschiedlichen Künstler, ermittelt durch Zählen der eindeutigen nicht-leeren `kuenstler`-Werte aller Songs des Sets; IF alle Spielbaren_Songs des Sets eine bekannte Dauer größer als 0 Sekunden besitzen, THEN THE Set_Footer SHALL die Summe dieser Dauern im Format MM:SS anzeigen; IF mindestens ein Spielbarer_Song keine bekannte Dauer besitzt, THEN THE Set_Footer SHALL anstelle der Dauer den Text „Dauer nicht verfügbar" anzeigen.

3. THE Set_Footer SHALL im mittleren Drittel die Verfügbarkeit der drei Audio_Rollen als Verhältnisangabe x/y anzeigen, wobei x die Anzahl der Spielbaren_Songs mit der jeweiligen Rolle und y die Gesamtanzahl der Spielbaren_Songs des Sets ist; es werden angezeigt: „Original" für die Rolle `STANDARD`, „Instrumental" für `INSTRUMENTAL` und „Vocals" für `REFERENZ_VOKAL`; IF das Set keine Spielbaren_Songs hat, SHALL alle drei Verhältnisse als 0/0 angezeigt werden.

4. THE Set_Footer SHALL im rechten Drittel eine Schaltfläche „Set abspielen" anzeigen.

5. WHEN der Nutzer die Schaltfläche „Set abspielen" im Set_Footer betätigt, THE Dashboard SHALL zur Set-Detailseite des jeweiligen Sets navigieren und den URL-Parameter `autoplay=true` übergeben, sodass der Set_Playlist_Player auf der Set-Detailseite den Playlist_Modus automatisch startet.

6. WHILE das Set keine Spielbaren_Songs besitzt, THE Set_Footer SHALL die Schaltfläche „Set abspielen" als deaktiviert (`disabled` + `aria-disabled="true"`) darstellen.

7. THE Dashboard API (`GET /api/dashboard`) SHALL je Set die Anzahl der Spielbaren_Songs sowie die Anzahl der Spielbaren_Songs je Audio_Rolle (`STANDARD`, `INSTRUMENTAL`, `REFERENZ_VOKAL`) zurückgeben, damit der Set_Footer die Verfügbarkeitsanzeige ohne zusätzliche API-Aufrufe rendern kann.

8. WHEN der Set_Playlist_Player auf der Set-Detailseite den URL-Parameter `autoplay=true` empfängt und Spielbare_Songs vorhanden sind, THE Set_Playlist_Player SHALL den Playlist_Modus innerhalb von 500 ms nach dem vollständigen Laden der Seite automatisch starten.

9. IF der Set_Playlist_Player auf der Set-Detailseite den URL-Parameter `autoplay=true` empfängt und keine Spielbaren_Songs vorhanden sind, THEN THE Set_Playlist_Player SHALL eine Hinweismeldung anzeigen, die sichtbar bleibt bis der Nutzer sie explizit schließt, und den Playlist_Modus nicht starten.
