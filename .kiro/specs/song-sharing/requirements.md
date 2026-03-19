# Anforderungsdokument: Song-Sharing

## Einleitung

Das Feature „Song-Sharing" erweitert den SongTextTrainer um ein Freigabe- und Berechtigungssystem für Songs und Sets. Nutzer sollen ihre Songs und Sets gezielt mit anderen registrierten Nutzern teilen können. Geteilte Inhalte sind für den Empfänger schreibgeschützt (kein Bearbeiten von Songtext, Audio oder Covern), jedoch erhält der Empfänger eigene, unabhängige Lerndaten (Fortschritt, Sessions, Notizen, Interpretationen). Es gibt kein öffentliches Link-Sharing — nur gezielte Freigabe an bestimmte Nutzer. Dieses Feature baut auf dem bestehenden Set-System (`Set` → `SetSong` → `Song`) und der nutzerbasierten Eigentümerprüfung auf.

## Glossar

- **Eigentümer**: Der Nutzer, dem ein Song oder Set gehört (über `Song.userId` bzw. `Set.userId`)
- **Empfänger**: Ein registrierter Nutzer, der eine Freigabe für einen Song oder ein Set erhalten hat
- **Freigabe**: Eine Berechtigung, die einem Empfänger Lesezugriff auf einen Song oder ein Set gewährt
- **Song_Freigabe**: Die Verknüpfung zwischen einem Song und einem Empfänger über eine Freigabe-Tabelle
- **Set_Freigabe**: Die Verknüpfung zwischen einem Set und einem Empfänger über eine Freigabe-Tabelle
- **Freigabe_Verwaltung**: Die Gesamtheit der Operationen zum Erstellen, Anzeigen und Widerrufen von Freigaben
- **Geteilte_Ansicht**: Der Bereich im Dashboard des Empfängers, der alle mit dem Empfänger geteilten Songs und Sets anzeigt
- **Lerndaten**: Fortschritt, Sessions, Notizen und Interpretationen eines Nutzers für einen Song — immer nutzerspezifisch über `userId`
- **Dashboard**: Die Hauptübersichtsseite der Anwendung
- **Nutzer**: Ein authentifizierter Benutzer der Anwendung mit der Rolle USER oder ADMIN
- **SMTP_Dienst**: Der optionale E-Mail-Versanddienst für Benachrichtigungen

## Anforderungen

### Anforderung 1: Song-Freigabe erstellen

**User Story:** Als Eigentümer möchte ich einen Song gezielt mit einem anderen registrierten Nutzer teilen, damit dieser den Songtext lernen kann.

#### Akzeptanzkriterien

1. WHEN der Eigentümer einen Song für einen Empfänger freigibt, THE Freigabe_Verwaltung SHALL eine Song_Freigabe erstellen, die dem Empfänger Lesezugriff auf den Song gewährt
2. IF der Eigentümer versucht, einen Song für einen Nutzer freizugeben, der bereits Zugriff auf diesen Song hat, THEN THE Freigabe_Verwaltung SHALL eine Fehlermeldung „Song ist bereits für diesen Nutzer freigegeben" zurückgeben und keine doppelte Freigabe erstellen
3. IF der Eigentümer versucht, einen Song für sich selbst freizugeben, THEN THE Freigabe_Verwaltung SHALL eine Fehlermeldung „Freigabe an sich selbst ist nicht möglich" zurückgeben
4. IF der angegebene Empfänger nicht als registrierter Nutzer existiert, THEN THE Freigabe_Verwaltung SHALL eine Fehlermeldung „Nutzer nicht gefunden" zurückgeben
5. THE Freigabe_Verwaltung SHALL bei der Freigabe die Eigentümerschaft des Songs prüfen und den Zugriff verweigern, wenn der anfragende Nutzer nicht der Eigentümer ist

### Anforderung 2: Set-Freigabe erstellen

**User Story:** Als Eigentümer möchte ich ein Set gezielt mit einem anderen registrierten Nutzer teilen, damit dieser alle Songs des Sets lernen kann.

#### Akzeptanzkriterien

1. WHEN der Eigentümer ein Set für einen Empfänger freigibt, THE Freigabe_Verwaltung SHALL eine Set_Freigabe erstellen, die dem Empfänger Lesezugriff auf das Set und alle darin enthaltenen Songs gewährt
2. WHEN ein Set freigegeben ist und der Eigentümer einen neuen Song zu diesem Set hinzufügt, THE Freigabe_Verwaltung SHALL dem Empfänger automatisch Lesezugriff auf den neuen Song gewähren
3. IF der Eigentümer versucht, ein Set für einen Nutzer freizugeben, der bereits Zugriff auf dieses Set hat, THEN THE Freigabe_Verwaltung SHALL eine Fehlermeldung „Set ist bereits für diesen Nutzer freigegeben" zurückgeben
4. IF der Eigentümer versucht, ein Set für sich selbst freizugeben, THEN THE Freigabe_Verwaltung SHALL eine Fehlermeldung „Freigabe an sich selbst ist nicht möglich" zurückgeben
5. THE Freigabe_Verwaltung SHALL bei der Set-Freigabe die Eigentümerschaft des Sets prüfen und den Zugriff verweigern, wenn der anfragende Nutzer nicht der Eigentümer ist

### Anforderung 3: Freigabe widerrufen

**User Story:** Als Eigentümer möchte ich eine Freigabe jederzeit widerrufen können, damit ich die Kontrolle über meine Inhalte behalte.

#### Akzeptanzkriterien

1. WHEN der Eigentümer eine Song_Freigabe widerruft, THE Freigabe_Verwaltung SHALL die Freigabe löschen und dem Empfänger den Zugriff auf den Song entziehen
2. WHEN der Eigentümer eine Set_Freigabe widerruft, THE Freigabe_Verwaltung SHALL die Freigabe löschen und dem Empfänger den Zugriff auf das Set und alle über diese Set-Freigabe gewährten Song-Zugriffe entziehen
3. THE Freigabe_Verwaltung SHALL beim Widerrufen die Eigentümerschaft prüfen und den Zugriff verweigern, wenn der anfragende Nutzer nicht der Eigentümer ist
4. WHEN eine Freigabe widerrufen wird, THE Freigabe_Verwaltung SHALL die Lerndaten des Empfängers (Fortschritt, Sessions, Notizen, Interpretationen) für den betroffenen Song beibehalten

### Anforderung 4: Empfänger-Dashboard — Geteilte Inhalte anzeigen

**User Story:** Als Empfänger möchte ich alle mit mir geteilten Songs und Sets in einem eigenen Dashboard-Bereich sehen, damit ich schnell auf geteilte Inhalte zugreifen kann.

#### Akzeptanzkriterien

1. THE Dashboard SHALL einen separaten Bereich „Mit mir geteilte Songs und Sets" anzeigen, wenn der Nutzer mindestens eine aktive Freigabe als Empfänger hat
2. THE Geteilte_Ansicht SHALL geteilte Sets mit ihren Songs und einzeln geteilte Songs (ohne Set-Zuordnung) in derselben Struktur wie die eigene Song-/Set-Übersicht anzeigen
3. THE Geteilte_Ansicht SHALL für jedes geteilte Set den Set-Namen, die Beschreibung und die Anzahl der Songs anzeigen
4. THE Geteilte_Ansicht SHALL für jeden geteilten Song den Titel, den Künstler, das Cover und den eigenen Lernfortschritt des Empfängers anzeigen
5. WHEN der Empfänger auf einen geteilten Song klickt, THE Geteilte_Ansicht SHALL zur Song-Detailansicht navigieren (im Lesemodus)

### Anforderung 5: Lesezugriff für Empfänger

**User Story:** Als Empfänger möchte ich geteilte Songs im Detail ansehen können, ohne sie bearbeiten zu können, damit ich den Songtext zum Lernen nutzen kann.

#### Akzeptanzkriterien

1. WHEN der Empfänger einen geteilten Song öffnet, THE Song-Detailansicht SHALL den Songtext, die Strophen, die Zeilen, die Audio-Quellen und das Cover anzeigen
2. THE Song-Detailansicht SHALL alle Bearbeitungsfunktionen (Titel, Künstler, Sprache, Strophen, Zeilen, Audio-Quellen, Cover) für den Empfänger ausblenden oder deaktivieren
3. IF der Empfänger versucht, den Song über die API zu bearbeiten oder zu löschen, THEN THE Freigabe_Verwaltung SHALL den Zugriff verweigern und den HTTP-Statuscode 403 zurückgeben
4. THE Song-Detailansicht SHALL den Namen des Eigentümers anzeigen, damit der Empfänger weiß, wer den Song geteilt hat

### Anforderung 6: Eigene Lerndaten für Empfänger

**User Story:** Als Empfänger möchte ich eigene Lernsessions, Fortschritt, Notizen und Interpretationen für geteilte Songs erstellen, damit ich unabhängig vom Eigentümer lernen kann.

#### Akzeptanzkriterien

1. WHEN der Empfänger eine Lernsession (Lückentext, Karaoke, Quiz usw.) mit einem geteilten Song startet, THE Lerndaten SHALL eine neue Session für den Empfänger erstellen und den Fortschritt des Empfängers aktualisieren
2. WHEN der Empfänger eine Notiz oder Interpretation für eine Strophe eines geteilten Songs erstellt, THE Lerndaten SHALL die Notiz oder Interpretation dem Empfänger zuordnen
3. THE Lerndaten SHALL sicherstellen, dass der Empfänger die Notizen, Interpretationen und den Fortschritt des Eigentümers nicht sehen kann
4. THE Lerndaten SHALL sicherstellen, dass der Eigentümer die Notizen, Interpretationen und den Fortschritt des Empfängers nicht sehen kann
5. WHEN der Empfänger den Fortschritt eines geteilten Songs im Dashboard sieht, THE Geteilte_Ansicht SHALL den eigenen Fortschritt des Empfängers anzeigen (nicht den des Eigentümers)

### Anforderung 7: Freigabe-Übersicht für Eigentümer

**User Story:** Als Eigentümer möchte ich sehen, mit wem ich meine Songs und Sets geteilt habe, damit ich den Überblick über meine Freigaben behalte.

#### Akzeptanzkriterien

1. WHEN der Eigentümer die Detailansicht eines Songs öffnet, THE Song-Detailansicht SHALL eine Liste aller Nutzer anzeigen, mit denen der Song geteilt ist
2. WHEN der Eigentümer die Detailansicht eines Sets öffnet, THE Set-Detailansicht SHALL eine Liste aller Nutzer anzeigen, mit denen das Set geteilt ist
3. THE Freigabe-Übersicht SHALL für jeden Empfänger den Namen und die E-Mail-Adresse anzeigen
4. THE Freigabe-Übersicht SHALL für jede Freigabe eine Aktion zum Widerrufen bereitstellen

### Anforderung 8: E-Mail-Benachrichtigung bei Freigabe

**User Story:** Als Empfänger möchte ich per E-Mail benachrichtigt werden, wenn ein anderer Nutzer einen Song oder ein Set mit mir teilt, damit ich über neue Freigaben informiert bin.

#### Akzeptanzkriterien

1. WHEN eine neue Song_Freigabe oder Set_Freigabe erstellt wird, THE SMTP_Dienst SHALL eine E-Mail an den Empfänger senden mit dem Betreff und Inhalt, der den Namen des Eigentümers und den Titel des Songs oder Sets enthält
2. IF der SMTP_Dienst nicht konfiguriert ist (keine SMTP-Umgebungsvariablen gesetzt), THEN THE Freigabe_Verwaltung SHALL die Freigabe trotzdem erstellen und den E-Mail-Versand überspringen
3. IF der E-Mail-Versand fehlschlägt, THEN THE Freigabe_Verwaltung SHALL den Fehler protokollieren, die Freigabe jedoch beibehalten

### Anforderung 9: Zugriffskontrolle für Freigaben

**User Story:** Als Nutzer möchte ich sicher sein, dass nur autorisierte Personen auf meine geteilten Inhalte zugreifen können, damit meine Daten geschützt sind.

#### Akzeptanzkriterien

1. IF ein nicht authentifizierter Benutzer auf die Freigabe-API zugreift, THEN THE Freigabe_Verwaltung SHALL den HTTP-Statuscode 401 zurückgeben
2. THE Freigabe_Verwaltung SHALL sicherstellen, dass nur der Eigentümer Freigaben erstellen und widerrufen kann
3. THE Freigabe_Verwaltung SHALL sicherstellen, dass ein Empfänger ausschließlich auf Songs und Sets zugreifen kann, für die eine aktive Freigabe besteht
4. IF ein Nutzer versucht, auf einen Song oder ein Set zuzugreifen, für den keine Freigabe und keine Eigentümerschaft besteht, THEN THE Freigabe_Verwaltung SHALL den HTTP-Statuscode 403 zurückgeben
5. WHEN ein Song aus einem geteilten Set entfernt wird, THE Freigabe_Verwaltung SHALL den Zugriff des Empfängers auf diesen Song über die Set-Freigabe entziehen (sofern keine separate Song_Freigabe besteht)

### Anforderung 10: Kaskadierendes Löschen

**User Story:** Als Eigentümer möchte ich, dass beim Löschen eines Songs oder Sets alle zugehörigen Freigaben automatisch entfernt werden, damit keine verwaisten Freigaben entstehen.

#### Akzeptanzkriterien

1. WHEN der Eigentümer einen Song löscht, THE Freigabe_Verwaltung SHALL alle Song_Freigaben für diesen Song automatisch löschen
2. WHEN der Eigentümer ein Set löscht, THE Freigabe_Verwaltung SHALL alle Set_Freigaben für dieses Set automatisch löschen
3. WHEN ein Song gelöscht wird, der über eine Set_Freigabe geteilt war, THE Freigabe_Verwaltung SHALL den Zugriff des Empfängers auf diesen Song beenden (die Set_Freigabe bleibt für die verbleibenden Songs bestehen)
