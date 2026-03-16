# Implementierungsplan

- [x] 1. Bug-Condition Explorations-Test schreiben
  - **Property 1: Bug Condition** – Satzzeichen in Lückenwörtern & fehlende Leertasten-Navigation
  - **WICHTIG**: Diesen Property-Based Test VOR der Implementierung des Fixes schreiben
  - **KRITISCH**: Dieser Test MUSS auf dem unfixierten Code FEHLSCHLAGEN – das Fehlschlagen bestätigt, dass der Bug existiert
  - **NICHT versuchen, den Test oder den Code zu reparieren, wenn er fehlschlägt**
  - **HINWEIS**: Dieser Test kodiert das erwartete Verhalten – er validiert den Fix, wenn er nach der Implementierung besteht
  - **ZIEL**: Gegenbeispiele finden, die den Bug demonstrieren
  - **Scoped PBT Ansatz**:
    - Bug B (Satzzeichen): Für zufällige Wörter mit angehängten Satzzeichen (z.B. `"Straßen,"`, `"München!"`, `"(Hallo)"`) prüfen, dass `generateGaps` das reine Wort als `word` zurückgibt und `prefix`/`suffix` korrekt gesetzt sind (aus `isBugCondition_B` im Design)
    - Bug A (Leertaste): `GapInput` rendern, Leertaste simulieren, prüfen dass `preventDefault` aufgerufen wird und Fokus zum nächsten Gap-Input wechselt (aus `isBugCondition_A` im Design)
  - Testdatei: `__tests__/cloze/cloze-ux-bugcondition.property.test.ts`
  - Test auf UNFIXIERTEM Code ausführen
  - **ERWARTETES ERGEBNIS**: Test SCHLÄGT FEHL (das ist korrekt – es beweist, dass der Bug existiert)
  - Gegenbeispiele dokumentieren (z.B. `generateGaps` gibt `word: "Straßen,"` statt `word: "Straßen"` zurück; Leertaste fügt Leerzeichen ein statt zu navigieren)
  - Aufgabe als abgeschlossen markieren, wenn Test geschrieben, ausgeführt und Fehlschlag dokumentiert ist
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Preservation Property-Tests schreiben (VOR der Implementierung des Fixes)
  - **Property 2: Preservation** – Bestehendes Verhalten für Nicht-Bug-Eingaben
  - **WICHTIG**: Observation-First-Methodik befolgen
  - Beobachten: `generateGaps` mit Wörtern ohne Satzzeichen (z.B. `"Freiheit"`, `"Liebe"`) auf unfixiertem Code aufrufen – `word` enthält das unveränderte Wort
  - Beobachten: `GapInput` mit Buchstaben-/Zahlen-/Umlaut-Eingaben auf unfixiertem Code – Zeichen werden normal eingefügt
  - Beobachten: Schwierigkeitsgrad-Wechsel generiert deterministisch neue Lücken; Blind-Modus markiert 100% als Lücken
  - Property-Based Test schreiben:
    - Für alle zufällig generierten Wörter OHNE führende/nachfolgende Satzzeichen: `generateGaps` gibt `word` unverändert zurück, `prefix === ""`, `suffix === ""` (aus Preservation-Anforderungen im Design)
    - Für alle Tasteneingaben die NICHT Leertaste sind: `GapInput` lässt das Zeichen normal durch (aus Preservation-Anforderungen im Design)
    - Für Schwierigkeitsgrad-Wechsel: Lücken werden deterministisch neu generiert (Req 3.5, 3.6)
  - Testdatei: `__tests__/cloze/cloze-ux-preservation.property.test.ts`
  - Tests auf UNFIXIERTEM Code ausführen
  - **ERWARTETES ERGEBNIS**: Tests BESTEHEN (das bestätigt das Baseline-Verhalten, das bewahrt werden muss)
  - Aufgabe als abgeschlossen markieren, wenn Tests geschrieben, ausgeführt und auf unfixiertem Code bestanden
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix für Satzzeichen-Abtrennung und Leertasten-Navigation

  - [x] 3.1 `GapData`-Interface erweitern
    - `prefix: string` und `suffix: string` Felder zum `GapData`-Interface in `src/types/cloze.ts` hinzufügen
    - Diese Felder speichern abgetrennte führende/nachfolgende Satzzeichen
    - _Bug_Condition: isBugCondition_B(input) – Wort enthält führende/nachfolgende Satzzeichen_
    - _Expected_Behavior: word enthält nur das reine Wort, prefix/suffix enthalten Satzzeichen_
    - _Requirements: 2.3, 2.4_

  - [x] 3.2 `stripPunctuation`-Hilfsfunktion und `generateGaps`-Anpassung implementieren
    - Exportierte `stripPunctuation`-Funktion in `src/lib/cloze/gap-generator.ts` erstellen
    - Regex-Pattern: `/^([,.\!?;:"'()–…]*)(.*?)([,.\!?;:"'()–…]*)$/` zum Abtrennen von führenden und nachfolgenden Satzzeichen
    - `generateGaps` anpassen: nach dem Splitten `stripPunctuation` auf jedes Token anwenden
    - `prefix` und `suffix` in jedem `GapData`-Objekt setzen
    - _Bug_Condition: isBugCondition_B(input) – punctuationPattern.test(input.word)_
    - _Expected_Behavior: result.word enthält keine Satzzeichen, result.prefix/suffix korrekt gesetzt_
    - _Preservation: Wörter ohne Satzzeichen bleiben unverändert (word gleich, prefix/suffix leer)_
    - _Requirements: 2.3, 2.4, 3.4, 3.5, 3.6_

  - [x] 3.3 `onKeyDown`-Handler für Leertaste in `GapInput` hinzufügen
    - `onKeyDown`-Handler in `src/components/cloze/gap-input.tsx` implementieren
    - Bei `e.key === ' '`: `e.preventDefault()` aufrufen, nächstes `input[id^="gap-"]`-Element im DOM finden und fokussieren
    - Wenn kein nächstes Feld existiert (letzte Lücke): Fokus bleibt im aktuellen Feld
    - Andere Tasten (Buchstaben, Zahlen, TAB etc.) werden NICHT beeinflusst
    - _Bug_Condition: isBugCondition_A(input) – input.key === ' ' in GapInput_
    - _Expected_Behavior: preventDefault aufgerufen, Fokus auf nächstes Gap-Input verschoben_
    - _Preservation: Alle Nicht-Leertasten-Eingaben bleiben unverändert (Req 3.1, 3.3)_
    - _Requirements: 2.1, 2.2, 3.1, 3.3_

  - [x] 3.4 Satzzeichen-Anzeige in `StanzaBlock` implementieren
    - `src/components/cloze/stanza-block.tsx` anpassen: `prefix`- und `suffix`-Felder aus `GapData` als `<span>`-Elemente vor/nach dem `GapInput` rendern
    - Für Nicht-Lücken-Wörter: `prefix + word + suffix` als zusammenhängenden Text anzeigen
    - _Expected_Behavior: Satzzeichen werden als normaler Text neben der Lücke angezeigt_
    - _Preservation: Nicht-Lücken-Wörter werden weiterhin korrekt angezeigt_
    - _Requirements: 2.4, 3.4_

  - [x] 3.5 Bug-Condition Explorations-Test erneut ausführen – muss jetzt bestehen
    - **Property 1: Expected Behavior** – Satzzeichen korrekt abgetrennt & Leertaste navigiert
    - **WICHTIG**: Den GLEICHEN Test aus Aufgabe 1 erneut ausführen – KEINEN neuen Test schreiben
    - Der Test aus Aufgabe 1 kodiert das erwartete Verhalten
    - Wenn dieser Test besteht, bestätigt er, dass das erwartete Verhalten erfüllt ist
    - **ERWARTETES ERGEBNIS**: Test BESTEHT (bestätigt, dass der Bug behoben ist)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.6 Preservation-Tests erneut ausführen – müssen weiterhin bestehen
    - **Property 2: Preservation** – Bestehendes Verhalten unverändert
    - **WICHTIG**: Die GLEICHEN Tests aus Aufgabe 2 erneut ausführen – KEINE neuen Tests schreiben
    - **ERWARTETES ERGEBNIS**: Tests BESTEHEN (bestätigt, dass keine Regressionen eingeführt wurden)
    - Alle Tests müssen nach dem Fix weiterhin bestehen

- [x] 4. Checkpoint – Sicherstellen, dass alle Tests bestehen
  - Alle bestehenden Tests ausführen (`gap-generator.test.ts`, `gap-input.test.ts`, `stanza-block.test.ts`, `validate-answer.property.test.ts` etc.)
  - Sicherstellen, dass keine Regressionen eingeführt wurden
  - Bei Fragen den Nutzer konsultieren
