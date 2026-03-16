# Bugfix-Anforderungen

## Einleitung

Der Lückentest (Cloze-Test) weist zwei UX-Probleme auf, die das Nutzungserlebnis beeinträchtigen:

1. **Navigation zwischen Lücken**: Um von einer Lücke zur nächsten zu springen, muss der Nutzer zweimal TAB drücken (wegen des dazwischenliegenden Hint-Buttons). Die Leertaste soll stattdessen den Fokus zur nächsten Lücke verschieben, um eine flüssigere Eingabe zu ermöglichen.

2. **Satzzeichen in Lücken**: Satzzeichen wie Kommas, Punkte und Ausrufezeichen werden als Teil der Lückenwörter behandelt. Der Nutzer muss z.B. `"Straßen,"` statt `"Straßen"` eingeben. Satzzeichen sollen niemals Teil einer Lücke sein.

## Fehleranalyse

### Aktuelles Verhalten (Defekt)

1.1 WENN der Nutzer in einem Lücken-Eingabefeld die Leertaste drückt, DANN wird ein Leerzeichen in das aktuelle Eingabefeld eingefügt, anstatt den Fokus zur nächsten Lücke zu verschieben.

1.2 WENN der Nutzer per TAB von einer Lücke zur nächsten navigieren möchte, DANN muss er TAB zweimal drücken, da der Hint-Button zwischen den Lücken den Fokus abfängt.

1.3 WENN ein Songtext Wörter mit angehängten Satzzeichen enthält (z.B. `"Straßen,"`, `"München!"`), DANN werden die Satzzeichen als Teil des Lückenworts gespeichert und der Nutzer muss das Satzzeichen mit eingeben, um die Antwort als korrekt gewertet zu bekommen.

1.4 WENN ein Wort mit Satzzeichen als Lücke dargestellt wird, DANN fehlt das Satzzeichen im sichtbaren Text neben der Lücke, da es in der Lücke „versteckt" ist.

### Erwartetes Verhalten (Korrekt)

2.1 WENN der Nutzer in einem Lücken-Eingabefeld die Leertaste drückt, DANN SOLL das System den Fokus auf das nächste Lücken-Eingabefeld verschieben, ohne ein Leerzeichen einzufügen.

2.2 WENN der Nutzer die Leertaste im letzten Lücken-Eingabefeld drückt, DANN SOLL der Fokus im aktuellen Feld verbleiben (kein Fehler, kein Sprung).

2.3 WENN der Lückengenerator Wörter aus dem Songtext extrahiert, DANN SOLL das System führende und nachfolgende Satzzeichen (`,`, `.`, `!`, `?`, `;`, `:`, `"`, `'`, `(`, `)`, `–`, `…`) vom Wort abtrennen, sodass nur das reine Wort als Lückenantwort gilt.

2.4 WENN ein Wort mit angehängtem Satzzeichen als Lücke dargestellt wird, DANN SOLL das abgetrennte Satzzeichen als normaler Text direkt nach dem Lücken-Eingabefeld angezeigt werden.

### Unverändertes Verhalten (Regressionsprävention)

3.1 WENN der Nutzer Text in ein Lücken-Eingabefeld tippt (Buchstaben, Zahlen, Umlaute), DANN SOLL das System WEITERHIN die Zeichen normal in das Feld einfügen.

3.2 WENN der Nutzer ein Lücken-Eingabefeld verlässt (Blur), DANN SOLL das System WEITERHIN die Antwort case-insensitiv validieren und visuelles Feedback (grün/rot) anzeigen.

3.3 WENN der Nutzer TAB drückt, DANN SOLL das System WEITERHIN den Browser-Standard-Fokus-Wechsel zum nächsten fokussierbaren Element durchführen.

3.4 WENN Wörter ohne Satzzeichen als Lücken generiert werden, DANN SOLL das System WEITERHIN diese Wörter unverändert als Lückenantwort verwenden.

3.5 WENN der Schwierigkeitsgrad gewechselt wird, DANN SOLL das System WEITERHIN die Lücken deterministisch neu generieren und alle Eingaben zurücksetzen.

3.6 WENN der Schwierigkeitsgrad „Blind" gewählt ist, DANN SOLL das System WEITERHIN 100% der Wörter als Lücken markieren.

3.7 WENN der Hint-Button gedrückt wird, DANN SOLL das System WEITERHIN den Hinweis für die zugehörige Lücke anzeigen.
