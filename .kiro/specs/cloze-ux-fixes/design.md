# Cloze UX Fixes – Bugfix-Design

## Übersicht

Dieses Design beschreibt die technische Behebung zweier UX-Bugs im Lückentest (Cloze-Test):

1. **Leertaste als Navigation**: Die Leertaste soll den Fokus von einer Lücke zur nächsten verschieben, anstatt ein Leerzeichen einzufügen. Dadurch wird die Navigation flüssiger, da der Nutzer nicht zweimal TAB drücken muss (wegen des dazwischenliegenden Hint-Buttons).

2. **Satzzeichen-Abtrennung**: Der Lückengenerator soll führende und nachfolgende Satzzeichen von Wörtern abtrennen, sodass nur das reine Wort als Lückenantwort gilt. Abgetrennte Satzzeichen werden als normaler Text neben der Lücke angezeigt.

## Glossar

- **Bug_Condition (C)**: Die Bedingung, die den Bug auslöst – (1) Leertaste in einem Lücken-Eingabefeld fügt Leerzeichen ein statt zu navigieren; (2) Satzzeichen werden als Teil des Lückenworts behandelt
- **Property (P)**: Das gewünschte Verhalten – (1) Leertaste verschiebt Fokus zur nächsten Lücke; (2) Satzzeichen werden abgetrennt und separat angezeigt
- **Preservation**: Bestehendes Verhalten, das unverändert bleiben muss – normale Texteingabe, TAB-Navigation, Blur-Validierung, Schwierigkeitsgrad-Wechsel
- **`GapInput`**: Die React-Komponente in `src/components/cloze/gap-input.tsx`, die ein einzelnes Lücken-Eingabefeld rendert
- **`generateGaps`**: Die Funktion in `src/lib/cloze/gap-generator.ts`, die aus Zeilen und Schwierigkeitsgrad die Lückendaten erzeugt
- **`GapData`**: Das Interface mit `gapId`, `zeileId`, `wordIndex`, `word`, `isGap` – beschreibt ein Wort/eine Lücke
- **`StanzaBlock`**: Die Komponente in `src/components/cloze/stanza-block.tsx`, die eine Strophe mit Lücken rendert

## Bug-Details

### Bug-Bedingung

Der Bug manifestiert sich in zwei unabhängigen Szenarien:

**Bug A – Leertaste**: Wenn der Nutzer in einem `GapInput`-Feld die Leertaste drückt, wird ein Leerzeichen in das Feld eingefügt. Es gibt keinen `onKeyDown`-Handler, der die Leertaste abfängt und stattdessen den Fokus zur nächsten Lücke verschiebt.

**Bug B – Satzzeichen**: Wenn der Songtext Wörter mit angehängten Satzzeichen enthält (z.B. `"Straßen,"`, `"München!"`), speichert `generateGaps` das gesamte Token inklusive Satzzeichen als `word`. Der Nutzer muss das Satzzeichen mit eingeben, und das Satzzeichen verschwindet aus dem sichtbaren Text.

**Formale Spezifikation:**
```
FUNCTION isBugCondition_A(input)
  INPUT: input of type KeyboardEvent in einem GapInput-Feld
  OUTPUT: boolean

  RETURN input.key === ' '
         AND input.target ist ein GapInput-Eingabefeld
         AND es existiert eine nächste Lücke im Dokument
         AND Fokus wird NICHT zur nächsten Lücke verschoben
END FUNCTION

FUNCTION isBugCondition_B(input)
  INPUT: input of type { word: string } aus generateGaps
  OUTPUT: boolean

  punctuationPattern := /^[,.\!?;:"'()–…]+|[,.\!?;:"'()–…]+$/
  RETURN punctuationPattern.test(input.word)
         AND input.isGap === true
END FUNCTION
```

### Beispiele

- **Bug A, Beispiel 1**: Nutzer tippt "Straßen" in Lücke 1, drückt Leertaste → Erwartet: Fokus springt zu Lücke 2. Tatsächlich: Leerzeichen wird eingefügt, Feld zeigt "Straßen ".
- **Bug A, Beispiel 2**: Nutzer ist in der letzten Lücke, drückt Leertaste → Erwartet: Fokus bleibt im Feld. Tatsächlich: Leerzeichen wird eingefügt.
- **Bug B, Beispiel 1**: Songtext enthält `"Straßen,"` → Erwartet: Lücke zeigt `____,` (Komma sichtbar), Antwort ist `"Straßen"`. Tatsächlich: Lücke zeigt `____` (Komma versteckt), Antwort ist `"Straßen,"`.
- **Bug B, Beispiel 2**: Songtext enthält `"München!"` → Erwartet: Lücke zeigt `____!`, Antwort ist `"München"`. Tatsächlich: Antwort muss `"München!"` sein.
- **Bug B, Randfall**: Wort ohne Satzzeichen `"Freiheit"` → Verhalten bleibt unverändert, `word` ist `"Freiheit"`.

## Erwartetes Verhalten

### Preservation-Anforderungen

**Unverändertes Verhalten:**
- Buchstaben, Zahlen und Umlaute werden weiterhin normal in Lücken-Eingabefelder eingefügt (Req 3.1)
- Blur-Validierung mit case-insensitivem Vergleich und visuellem Feedback (grün/rot) bleibt bestehen (Req 3.2)
- TAB-Navigation folgt weiterhin dem Browser-Standard-Fokus-Wechsel (Req 3.3)
- Wörter ohne Satzzeichen werden weiterhin unverändert als Lückenantwort verwendet (Req 3.4)
- Schwierigkeitsgrad-Wechsel generiert weiterhin deterministisch neue Lücken (Req 3.5)
- Blind-Modus markiert weiterhin 100% der Wörter als Lücken (Req 3.6)
- Hint-Button funktioniert weiterhin wie gewohnt (Req 3.7)

**Scope:**
Alle Eingaben, die NICHT die Leertaste in einem Lückenfeld oder Satzzeichen in Wörtern betreffen, sollen vollständig unberührt bleiben. Dies umfasst:
- Alle Buchstaben-, Zahlen- und Sonderzeichen-Eingaben
- Maus-Interaktionen (Klick, Blur)
- TAB- und Shift+TAB-Navigation
- Wörter ohne angehängte Satzzeichen

## Hypothese zur Ursache

Basierend auf der Code-Analyse sind die Ursachen klar identifizierbar:

1. **Fehlender `onKeyDown`-Handler in `GapInput`**: Die Komponente `gap-input.tsx` hat keinen `onKeyDown`-Handler. Es gibt keine Logik, die die Leertaste abfängt (`e.preventDefault()`) und den Fokus zum nächsten `GapInput`-Feld verschiebt. Die Komponente kennt auch keine Referenz auf andere Lücken-Felder.

2. **Keine Satzzeichen-Abtrennung in `generateGaps`**: Die Funktion `gap-generator.ts` splittet Zeilen mit `zeile.text.split(/\s+/)` und verwendet die resultierenden Tokens direkt als `word`. Es gibt keinen Schritt, der führende/nachfolgende Satzzeichen abtrennt. Das `GapData`-Interface hat kein Feld für abgetrennte Satzzeichen.

3. **Kein `suffix`-Feld in `GapData`**: Das Interface `GapData` in `src/types/cloze.ts` enthält kein Feld für nachgestellte Satzzeichen. `StanzaBlock` kann daher keine Satzzeichen neben der Lücke anzeigen.

4. **HintButton ohne `tabIndex={-1}`**: Der `HintButton` zwischen den Lücken hat keinen `tabIndex={-1}`, wodurch er bei TAB-Navigation den Fokus abfängt. Dies ist ein sekundäres Problem, das durch die Leertasten-Navigation umgangen wird, aber für TAB-Nutzer weiterhin besteht.

## Correctness Properties

Property 1: Bug Condition A – Leertaste navigiert zur nächsten Lücke

_For any_ Lücken-Eingabefeld, in dem der Nutzer die Leertaste drückt und eine weitere Lücke im Dokument existiert, SOLL die `GapInput`-Komponente das Einfügen eines Leerzeichens verhindern und den Fokus auf das nächste Lücken-Eingabefeld verschieben.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition B – Satzzeichen werden vom Lückenwort abgetrennt

_For any_ Wort im Songtext, das führende oder nachfolgende Satzzeichen enthält, SOLL `generateGaps` das reine Wort (ohne Satzzeichen) als `word` speichern und die abgetrennten Satzzeichen in einem separaten Feld (`suffix`/`prefix`) bereitstellen.

**Validates: Requirements 2.3, 2.4**

Property 3: Preservation – Normale Texteingabe bleibt unverändert

_For any_ Tastendruck, der NICHT die Leertaste ist (Buchstaben, Zahlen, Umlaute, Sonderzeichen), SOLL die `GapInput`-Komponente das Zeichen weiterhin normal in das Eingabefeld einfügen, identisch zum Verhalten vor dem Fix.

**Validates: Requirements 3.1, 3.3**

Property 4: Preservation – Wörter ohne Satzzeichen bleiben unverändert

_For any_ Wort im Songtext, das KEINE führenden oder nachfolgenden Satzzeichen enthält, SOLL `generateGaps` das Wort unverändert als `word` speichern, mit leerem `suffix` und `prefix`.

**Validates: Requirements 3.4, 3.5, 3.6**

## Fix-Implementierung

### Erforderliche Änderungen

Unter der Annahme, dass unsere Ursachenanalyse korrekt ist:

**Datei**: `src/types/cloze.ts`

**Änderung 1 – GapData erweitern**:
- Felder `prefix: string` und `suffix: string` zum `GapData`-Interface hinzufügen
- Diese Felder speichern abgetrennte Satzzeichen (z.B. `suffix: ","` für `"Straßen,"`)

---

**Datei**: `src/lib/cloze/gap-generator.ts`

**Funktion**: `generateGaps`

**Änderung 2 – Satzzeichen abtrennen**:
- Nach dem Splitten der Zeile in Tokens eine `stripPunctuation`-Hilfsfunktion anwenden
- Regex-Pattern: `/^([,.\!?;:"'()–…]*)(.*?)([,.\!?;:"'()–…]*)$/` zum Abtrennen von führenden und nachfolgenden Satzzeichen
- Das reine Wort als `word` speichern, Satzzeichen als `prefix` und `suffix`
- Die `stripPunctuation`-Funktion als exportierte Hilfsfunktion implementieren (für Testbarkeit)

---

**Datei**: `src/components/cloze/gap-input.tsx`

**Funktion**: `GapInput`

**Änderung 3 – Leertaste abfangen**:
- `onKeyDown`-Handler hinzufügen, der bei `e.key === ' '` das Default-Verhalten verhindert (`e.preventDefault()`)
- Nächstes Lücken-Eingabefeld finden: alle `input[id^="gap-"]`-Elemente im DOM sammeln, aktuelles Element finden, zum nächsten springen
- Wenn kein nächstes Feld existiert (letzte Lücke), nichts tun (Fokus bleibt)

---

**Datei**: `src/components/cloze/stanza-block.tsx`

**Funktion**: `StanzaBlock`

**Änderung 4 – Satzzeichen anzeigen**:
- Beim Rendern von Lücken die `prefix`- und `suffix`-Felder aus `GapData` als `<span>`-Elemente vor/nach dem `GapInput` anzeigen
- Nicht-Lücken-Wörter: `prefix + word + suffix` als zusammenhängenden Text anzeigen (Verhalten bleibt gleich, da `word` jetzt ohne Satzzeichen ist und `prefix`/`suffix` die Satzzeichen enthalten)

## Teststrategie

### Validierungsansatz

Die Teststrategie folgt einem zweiphasigen Ansatz: Zuerst Gegenbeispiele finden, die den Bug auf dem unfixierten Code demonstrieren, dann verifizieren, dass der Fix korrekt funktioniert und bestehendes Verhalten bewahrt.

### Explorative Bug-Condition-Prüfung

**Ziel**: Gegenbeispiele finden, die den Bug VOR der Implementierung des Fixes demonstrieren. Die Ursachenanalyse bestätigen oder widerlegen.

**Testplan**: Tests schreiben, die (A) das Verhalten der Leertaste in `GapInput` prüfen und (B) die Ausgabe von `generateGaps` bei Wörtern mit Satzzeichen untersuchen. Diese Tests auf dem UNFIXIERTEN Code ausführen, um Fehler zu beobachten.

**Testfälle**:
1. **Leertaste in GapInput**: Prüfen, dass `GapInput` keinen `onKeyDown`-Handler hat, der die Leertaste abfängt (wird auf unfixiertem Code fehlschlagen)
2. **Satzzeichen in generateGaps**: `generateGaps` mit `"Straßen, führen nach München!"` aufrufen und prüfen, dass `word` Satzzeichen enthält (wird auf unfixiertem Code fehlschlagen)
3. **Suffix-Feld fehlt**: Prüfen, dass `GapData` kein `suffix`-Feld hat (wird auf unfixiertem Code fehlschlagen)

**Erwartete Gegenbeispiele**:
- `generateGaps` gibt `word: "Straßen,"` statt `word: "Straßen"` zurück
- `GapInput` hat keinen `onKeyDown`-Handler für die Leertaste
- Mögliche Ursachen: fehlende Satzzeichen-Abtrennung, fehlender Keyboard-Handler

### Fix-Prüfung

**Ziel**: Verifizieren, dass für alle Eingaben, bei denen die Bug-Bedingung gilt, die fixierte Funktion das erwartete Verhalten produziert.

**Pseudocode:**
```
FÜR ALLE input WO isBugCondition_A(input) TUE
  result := GapInput_fixed.onKeyDown(input)
  ASSERT input.defaultPrevented === true
  ASSERT document.activeElement === nächstesLückenFeld
ENDE FÜR

FÜR ALLE input WO isBugCondition_B(input) TUE
  result := generateGaps_fixed(input)
  ASSERT result.word enthält KEINE führenden/nachfolgenden Satzzeichen
  ASSERT result.suffix === abgetrennte nachfolgende Satzzeichen
  ASSERT result.prefix === abgetrennte führende Satzzeichen
ENDE FÜR
```

### Preservation-Prüfung

**Ziel**: Verifizieren, dass für alle Eingaben, bei denen die Bug-Bedingung NICHT gilt, die fixierte Funktion dasselbe Ergebnis wie die ursprüngliche Funktion produziert.

**Pseudocode:**
```
FÜR ALLE input WO NICHT isBugCondition_A(input) TUE
  ASSERT GapInput_original.onChange(input) = GapInput_fixed.onChange(input)
ENDE FÜR

FÜR ALLE input WO NICHT isBugCondition_B(input) TUE
  ASSERT generateGaps_original(input).word = generateGaps_fixed(input).word
  ASSERT generateGaps_fixed(input).suffix === ""
  ASSERT generateGaps_fixed(input).prefix === ""
ENDE FÜR
```

**Testansatz**: Property-Based Testing wird für die Preservation-Prüfung empfohlen, weil:
- Es automatisch viele Testfälle über den gesamten Eingabebereich generiert
- Es Randfälle findet, die manuelle Unit-Tests übersehen könnten
- Es starke Garantien bietet, dass das Verhalten für alle nicht-fehlerhaften Eingaben unverändert bleibt

**Testplan**: Verhalten auf UNFIXIERTEM Code zuerst beobachten für normale Texteingabe und Wörter ohne Satzzeichen, dann Property-Based Tests schreiben, die dieses Verhalten erfassen.

**Testfälle**:
1. **Normale Texteingabe**: Beobachten, dass Buchstaben/Zahlen/Umlaute korrekt eingefügt werden, dann Test schreiben, der dies nach dem Fix verifiziert
2. **Wörter ohne Satzzeichen**: Beobachten, dass `generateGaps` Wörter ohne Satzzeichen unverändert zurückgibt, dann Test schreiben, der dies nach dem Fix verifiziert
3. **TAB-Navigation**: Beobachten, dass TAB weiterhin zum nächsten fokussierbaren Element springt
4. **Blur-Validierung**: Beobachten, dass case-insensitive Validierung weiterhin funktioniert

### Unit Tests

- `stripPunctuation`-Hilfsfunktion mit verschiedenen Satzzeichen-Kombinationen testen
- `GapInput` `onKeyDown`-Handler: Leertaste wird abgefangen, andere Tasten nicht
- `generateGaps` mit Satzzeichen-haltigen Texten: `word`, `prefix`, `suffix` korrekt gesetzt
- Randfälle: Wort besteht nur aus Satzzeichen, leere Strings, mehrfache Satzzeichen

### Property-Based Tests

- Zufällige Wörter mit/ohne Satzzeichen generieren und verifizieren, dass `stripPunctuation(prefix + word + suffix)` das Original rekonstruiert
- Zufällige Zeilen generieren und verifizieren, dass `generateGaps` für Wörter ohne Satzzeichen identische Ergebnisse wie die unfixierte Version liefert
- Zufällige Tasteneingaben (nicht Leertaste) generieren und verifizieren, dass `GapInput` sie unverändert durchlässt

### Integration Tests

- Vollständiger Cloze-Test-Flow mit Satzzeichen im Songtext: Lücken korrekt angezeigt, Satzzeichen sichtbar, Antwort ohne Satzzeichen akzeptiert
- Leertasten-Navigation durch mehrere Lücken über Strophen hinweg
- Schwierigkeitsgrad-Wechsel mit Satzzeichen-haltigen Texten: Lücken werden korrekt neu generiert
