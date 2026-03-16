# Implementierungsplan: Hinweis-Modi für Zeile-für-Zeile-Lernmethoden

## Übersicht

Schrittweise Implementierung der vier Schwierigkeitsstufen (Sehr Leicht, Leichter, Mittel, Schwer) mit Hinweis-Anzeige für beide Lernseiten. Beginn mit der reinen Utility-Funktion `berechneHinweis()`, dann die geteilten UI-Komponenten, und abschließend Integration in beide Page-Komponenten mit localStorage-Persistierung.

## Aufgaben

- [x] 1. Hinweis-Berechnung implementieren
  - [x] 1.1 Typen und Konstanten in `src/lib/zeile-fuer-zeile/hint.ts` erstellen
    - Exportiere `Schwierigkeitsstufe` Union Type: `"sehr-leicht" | "leichter" | "mittel" | "schwer"`
    - Exportiere `SCHWIERIGKEITS_STUFEN` Array, `SCHWIERIGKEITS_LABELS` Record und `DEFAULT_SCHWIERIGKEITSSTUFE`
    - _Anforderungen: 1.1, 1.2_

  - [x] 1.2 `berechneHinweis()` Funktion in `src/lib/zeile-fuer-zeile/hint.ts` implementieren
    - Signatur: `berechneHinweis(zeile: string, stufe: Schwierigkeitsstufe): string`
    - Trimmt die Zeile, leere/Whitespace-Zeilen → `""`
    - `"schwer"` → `""`
    - `"sehr-leicht"` → `"{erstesWort} … {letztesWort}"` (ein Wort → nur dieses Wort)
    - `"leichter"` → `"{erstesWort}"`
    - `"mittel"` → `"{ersterBuchstabe}…"`
    - _Anforderungen: 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 1.3 Property-Test für `berechneHinweis()` schreiben
    - **Property 1: Schwer liefert immer leeren String**
    - Datei: `__tests__/zeile-fuer-zeile/hint-schwer.property.test.ts`
    - **Validiert: Anforderungen 1.6**

  - [ ]* 1.4 Property-Test für Hinweis-Konsistenz schreiben
    - **Property 2: Leere/Whitespace-Zeilen liefern immer leeren Hinweis unabhängig von Stufe**
    - Datei: `__tests__/zeile-fuer-zeile/hint-leer.property.test.ts`
    - **Validiert: Anforderungen 2.5**

  - [ ]* 1.5 Property-Test für Sehr-Leicht-Modus schreiben
    - **Property 3: Sehr-Leicht-Hinweis enthält erstes und letztes Wort der Zeile**
    - Datei: `__tests__/zeile-fuer-zeile/hint-sehr-leicht.property.test.ts`
    - **Validiert: Anforderungen 1.3, 2.2, 2.7**

  - [ ]* 1.6 Property-Test für Mittel-Modus schreiben
    - **Property 4: Mittel-Hinweis beginnt mit erstem Buchstaben des ersten Wortes gefolgt von „…"**
    - Datei: `__tests__/zeile-fuer-zeile/hint-mittel.property.test.ts`
    - **Validiert: Anforderungen 1.5, 2.4, 2.8**

  - [ ]* 1.7 Property-Test für Trim-Toleranz schreiben
    - **Property 5: Hinweis-Berechnung ignoriert führende/abschließende Leerzeichen**
    - Datei: `__tests__/zeile-fuer-zeile/hint-trim.property.test.ts`
    - **Validiert: Anforderungen 2.6**

- [x] 2. Checkpoint – Hinweis-Logik verifizieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. UI-Komponenten erstellen
  - [x] 3.1 `SchwierigkeitsAuswahl` implementieren in `src/components/zeile-fuer-zeile/schwierigkeits-auswahl.tsx`
    - Props: `value: Schwierigkeitsstufe`, `onChange: (stufe: Schwierigkeitsstufe) => void`
    - Segment-Control mit 4 Segmenten: Sehr Leicht | Leichter | Mittel | Schwer
    - `role="radiogroup"` mit `aria-label="Schwierigkeitsstufe auswählen"`
    - Jedes Segment: `role="radio"` mit `aria-checked`
    - Tastaturnavigation: Pfeiltasten links/rechts
    - Mindestgröße 44×44px pro Segment
    - Aktives Segment visuell hervorgehoben (purple-Farbschema)
    - _Anforderungen: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.5, 7.6_

  - [x] 3.2 `HinweisAnzeige` implementieren in `src/components/zeile-fuer-zeile/hinweis-anzeige.tsx`
    - Props: `hinweis: string`
    - Zeigt Hinweis kursiv in gedämpfter Farbe (`text-gray-400 italic`)
    - `aria-live="polite"` für Screenreader-Ankündigungen
    - `aria-label="Hinweis: {hinweis}"` wenn Hinweis vorhanden
    - Rendert leeres Element wenn `hinweis` leer ist
    - _Anforderungen: 4.1, 4.2, 4.3, 7.3, 7.4_

  - [ ]* 3.3 Unit-Tests für `SchwierigkeitsAuswahl` schreiben
    - Teste Rendering aller 4 Stufen, aria-Attribute, Tastaturnavigation
    - Datei: `__tests__/zeile-fuer-zeile/schwierigkeits-auswahl.test.ts`
    - _Anforderungen: 3.3, 3.4, 7.1, 7.2, 7.5_

  - [ ]* 3.4 Unit-Tests für `HinweisAnzeige` schreiben
    - Teste Anzeige/Ausblendung, aria-live, aria-label
    - Datei: `__tests__/zeile-fuer-zeile/hinweis-anzeige.test.ts`
    - _Anforderungen: 4.1, 4.2, 4.3, 7.3, 7.4_

- [x] 4. Checkpoint – Komponenten verifizieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Integration in Zeile-für-Zeile-Seite
  - [x] 5.1 Schwierigkeitsstufe-State und localStorage-Persistierung in `src/app/(main)/songs/[id]/zeile-fuer-zeile/page.tsx` hinzufügen
    - Neuen State `schwierigkeitsstufe` mit Initialisierung aus `localStorage` (Schlüssel: `schwierigkeit-zeile-fuer-zeile`)
    - Fallback auf `"schwer"` bei fehlendem oder ungültigem Wert
    - `useEffect` zum Speichern bei Änderung
    - _Anforderungen: 6.1, 6.3, 6.5_

  - [x] 5.2 `SchwierigkeitsAuswahl` und `HinweisAnzeige` in Zeile-für-Zeile-Seite einbinden
    - `berechneHinweis(currentZeile.text, schwierigkeitsstufe)` aufrufen
    - `<SchwierigkeitsAuswahl>` oberhalb des Eingabefelds platzieren
    - `<HinweisAnzeige>` zwischen SchwierigkeitsAuswahl und EingabeBereich platzieren
    - Hinweis ausblenden wenn `zeilenStatus === "loesung"`
    - Eingabe und Fehlversuche bei Schwierigkeitswechsel beibehalten
    - _Anforderungen: 3.1, 3.5, 3.6, 3.7, 4.1, 4.4, 4.5, 5.1_

- [x] 6. Integration in Rückwärts-Seite
  - [x] 6.1 Schwierigkeitsstufe-State und localStorage-Persistierung in `src/app/(main)/songs/[id]/rueckwaerts/page.tsx` hinzufügen
    - Neuen State `schwierigkeitsstufe` mit Initialisierung aus `localStorage` (Schlüssel: `schwierigkeit-rueckwaerts`)
    - Fallback auf `"schwer"` bei fehlendem oder ungültigem Wert
    - `useEffect` zum Speichern bei Änderung
    - _Anforderungen: 6.2, 6.4, 6.5_

  - [x] 6.2 `SchwierigkeitsAuswahl` und `HinweisAnzeige` in Rückwärts-Seite einbinden
    - Identische Einbindung wie in Zeile-für-Zeile-Seite
    - `berechneHinweis(currentZeile.text, schwierigkeitsstufe)` aufrufen
    - `<SchwierigkeitsAuswahl>` und `<HinweisAnzeige>` im JSX platzieren
    - Hinweis ausblenden wenn `zeilenStatus === "loesung"`
    - _Anforderungen: 3.2, 3.5, 3.6, 3.7, 4.1, 4.4, 4.5, 5.1, 5.2, 5.3_

- [x] 7. Checkpoint – Integration verifizieren
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Integrationstests und finale Validierung
  - [ ]* 8.1 Property-Test: Schwierigkeitswechsel behält Eingabe und Fehlversuche bei
    - **Property 6: Schwierigkeitswechsel verändert weder Eingabe noch Fehlversuch-Zähler**
    - Datei: `__tests__/zeile-fuer-zeile/hint-mode-switch.property.test.ts`
    - **Validiert: Anforderungen 3.6, 3.7**

  - [ ]* 8.2 Property-Test: localStorage-Persistierung ist seitenspezifisch
    - **Property 7: Schwierigkeitsstufe wird pro Seite unabhängig in localStorage gespeichert**
    - Datei: `__tests__/zeile-fuer-zeile/hint-persistence.property.test.ts`
    - **Validiert: Anforderungen 5.4, 6.1, 6.2**

  - [ ]* 8.3 Unit-Tests für Integration beider Seiten schreiben
    - Teste dass beide Seiten dieselben Komponenten und Utility-Funktion nutzen
    - Teste Hinweis-Aktualisierung bei Zeilenwechsel
    - Datei: `__tests__/zeile-fuer-zeile/hint-integration.test.ts`
    - _Anforderungen: 4.4, 5.1, 5.2, 5.3_

- [x] 9. Abschluss-Checkpoint – Alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Aufgaben mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jede Aufgabe referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints sichern inkrementelle Validierung
- Property-Tests validieren universelle Korrektheitseigenschaften
- Die bestehenden Komponenten `EingabeBereich` und `AktiveZeile` bleiben unverändert
- Die Hinweis-Logik ist eine reine Funktion ohne Seiteneffekte – ideal für Property-Tests
