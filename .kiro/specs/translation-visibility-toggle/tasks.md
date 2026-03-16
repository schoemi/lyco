# Implementierungsplan: Übersetzung ein-/ausblenden (Translation Visibility Toggle)

## Übersicht

Schrittweise Implementierung eines clientseitigen Toggle-Schalters auf der Song-Detailseite, der die Sichtbarkeit aller Übersetzungszeilen steuert. Die Implementierung erfolgt bottom-up: zuerst die neue Toggle-Komponente, dann die Anpassung der Zeilen- und Strophen-Editoren, und schließlich die Integration in die Song-Detailseite.

## Aufgaben

- [x] 1. TranslationToggle-Komponente erstellen
  - [x] 1.1 Neue Datei `src/components/songs/translation-toggle.tsx` anlegen
    - Interface `TranslationToggleProps` mit `checked: boolean` und `onChange: (checked: boolean) => void` definieren
    - Toggle-Button mit `role="switch"`, `aria-checked`, `aria-label="Übersetzung ein-/ausblenden"` implementieren
    - Beschriftung „Übersetzung" als sichtbares Label rendern
    - Tastatursteuerung über Space und Enter sicherstellen
    - Mindestgröße 44×44px als Touch-Target setzen
    - Visueller Zustandswechsel: Blau (aktiviert) / Grau (deaktiviert), konsistent mit bestehendem Farbschema
    - _Anforderungen: 1.3, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4_

  - [x] 1.2 Unit-Tests für TranslationToggle schreiben
    - Prüfen, dass `role="switch"` und `aria-checked` korrekt gesetzt werden
    - Prüfen, dass Klick und Tastatur (Space/Enter) `onChange` auslösen
    - Prüfen, dass visueller Zustand zwischen aktiviert/deaktiviert wechselt
    - _Anforderungen: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3_

- [x] 2. ZeileEditor um showTranslations-Prop erweitern
  - [x] 2.1 `showTranslations?: boolean` Prop (Standard: `true`) zum `ZeileEditorProps`-Interface in `src/components/songs/zeile-editor.tsx` hinzufügen
    - In der Display-Ansicht (nicht-editierend): `zeile.uebersetzung` nur rendern wenn `showTranslations` true ist
    - In der Edit-Form: Übersetzungsfeld bleibt immer sichtbar (Bearbeitung nicht einschränken)
    - _Anforderungen: 3.1, 3.2_

  - [x] 2.2 Unit-Tests für ZeileEditor showTranslations-Verhalten schreiben
    - Prüfen, dass Übersetzung bei `showTranslations={true}` angezeigt wird
    - Prüfen, dass Übersetzung bei `showTranslations={false}` ausgeblendet wird
    - Prüfen, dass Übersetzungsfeld im Edit-Modus immer sichtbar bleibt
    - _Anforderungen: 3.1, 3.2_

- [x] 3. StropheEditor um showTranslations-Prop erweitern
  - [x] 3.1 `showTranslations?: boolean` Prop (Standard: `true`) zum `StropheEditorProps`-Interface in `src/components/songs/strophe-editor.tsx` hinzufügen
    - In der Read-only-Ansicht: `zeile.uebersetzung` nur rendern wenn `showTranslations` true ist
    - In der Editing-Ansicht: `showTranslations` als Prop an `ZeileEditor` weitergeben
    - _Anforderungen: 3.1, 3.2, 3.3_

  - [x] 3.2 Unit-Tests für StropheEditor showTranslations-Durchreichung schreiben
    - Prüfen, dass `showTranslations` korrekt an ZeileEditor weitergegeben wird
    - Prüfen, dass Read-only-Ansicht Übersetzungen bei `showTranslations={false}` ausblendet
    - _Anforderungen: 3.1, 3.2, 3.3_

- [x] 4. Checkpoint – Komponenten-Tests prüfen
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer fragen.

- [x] 5. SongDetailPage integrieren
  - [x] 5.1 State und Berechnung in `src/app/(main)/songs/[id]/page.tsx` hinzufügen
    - `useMemo` Import hinzufügen
    - `TranslationToggle` Import hinzufügen
    - `hasAnyTranslation`-Hilfsfunktion implementieren: prüft ob mindestens eine Zeile in allen Strophen eine nicht-leere `uebersetzung` besitzt
    - `const [showTranslations, setShowTranslations] = useState(true)` State hinzufügen
    - `const hasTranslations = useMemo(() => hasAnyTranslation(song.strophen), [song.strophen])` Berechnung hinzufügen
    - _Anforderungen: 1.1, 1.2, 2.1, 2.2_

  - [x] 5.2 TranslationToggle in der Aktionsleiste rendern
    - Toggle in der Aktionsleiste neben den bestehenden Buttons (Analysieren, Übersetzen, Bearbeiten, Löschen) einfügen
    - Toggle nur rendern wenn `hasTranslations && !editing`
    - `checked={showTranslations}` und `onChange={setShowTranslations}` übergeben
    - _Anforderungen: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 5.4_

  - [x] 5.3 `showTranslations` Prop an StropheEditor übergeben
    - `showTranslations={showTranslations}` als Prop an die `StropheEditor`-Komponente weitergeben
    - _Anforderungen: 3.3, 3.4_

  - [x] 5.4 Unit-Tests für SongDetailPage Toggle-Integration schreiben
    - Prüfen, dass Toggle angezeigt wird wenn Übersetzungen vorhanden sind
    - Prüfen, dass Toggle ausgeblendet wird wenn keine Übersetzungen vorhanden sind
    - Prüfen, dass Toggle im Bearbeitungsmodus ausgeblendet wird
    - Prüfen, dass Standardzustand aktiviert ist
    - Prüfen, dass Toggle-Umschaltung die Übersetzungszeilen sofort ein-/ausblendet
    - Prüfen, dass Toggle nach erfolgreicher Übersetzung eingeblendet wird (Anforderung 2.3)
    - _Anforderungen: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 2.3, 3.4_

- [x] 6. Abschluss-Checkpoint – Alle Tests und Integration prüfen
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer fragen.

## Hinweise

- Aufgaben mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jede Aufgabe referenziert spezifische Anforderungen zur Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Keine Backend-Änderungen erforderlich – rein clientseitige Implementierung
