# Implementierungsplan: Spaced Repetition

## Übersicht

Schrittweise Implementierung des Spaced-Repetition-Features: Zuerst das Datenmodell und die reine Algorithmus-Funktion, dann der Service-Layer mit DB-Operationen, die API-Endpunkte, und schließlich die UI-Komponenten (Dashboard-Widget, Flip-Card, Session-Seite). Jeder Schritt baut auf dem vorherigen auf.

## Tasks

- [x] 1. Prisma-Modell `Wiederholung` und Datenbankschema
  - [x] 1.1 Neues Modell `Wiederholung` in `prisma/schema.prisma` anlegen
    - Felder: `id`, `userId`, `stropheId`, `korrektZaehler` (default 0), `faelligAm` (default now), `createdAt`, `updatedAt`
    - Relationen zu `User` und `Strophe` mit `onDelete: Cascade`
    - `@@unique([userId, stropheId])` und `@@index([userId, faelligAm])`
    - `@@map("wiederholungen")`
    - Relation `wiederholungen Wiederholung[]` in `User` und `Strophe` ergänzen
    - _Anforderungen: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Prisma-Migration generieren und anwenden
    - `npx prisma migrate dev --name add-wiederholung` ausführen
    - Prisma Client neu generieren
    - _Anforderungen: 1.1_

- [x] 2. Reine Algorithmus-Funktion `berechneIntervall()`
  - [x] 2.1 Datei `src/lib/spaced-repetition/algorithmus.ts` erstellen
    - Interface `IntervallErgebnis` mit `neuerKorrektZaehler` und `intervallTage`
    - Funktion `berechneIntervall(korrektZaehler: number, gewusst: boolean): IntervallErgebnis`
    - Logik: gewusst + Zähler 0 → {1, 1}, Zähler 1 → {2, 3}, Zähler ≥2 → {+1, 7}, nicht gewusst → {0, 1}
    - _Anforderungen: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 2.2 Property-Test: Intervallberechnung bei „Gewusst"
    - Für beliebigen `korrektZaehler >= 0` und `gewusst = true`: `neuerKorrektZaehler === korrektZaehler + 1` und `intervallTage` ist eines von `[1, 3, 7]`
    - **Validiert: Anforderungen 2.1, 2.2, 2.3**

  - [ ]* 2.3 Property-Test: Reset bei „Nicht gewusst"
    - Für beliebigen `korrektZaehler >= 0` und `gewusst = false`: `neuerKorrektZaehler === 0` und `intervallTage === 1`
    - **Validiert: Anforderung 2.4**

  - [ ]* 2.4 Property-Test: Reine Funktion (Determinismus)
    - Für gleiche Eingaben liefert `berechneIntervall` immer das gleiche Ergebnis
    - **Validiert: Anforderung 2.5**

  - [ ]* 2.5 Unit-Tests für `berechneIntervall()`
    - Konkrete Testfälle für alle vier Intervallstufen (Zähler 0, 1, 2, 5)
    - Edge-Case: sehr hoher Korrekt_Zähler (z.B. 100)
    - _Anforderungen: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Checkpoint – Algorithmus validieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Nutzer konsultieren.

- [x] 4. Service-Layer `spaced-repetition-service.ts`
  - [x] 4.1 Datei `src/lib/services/spaced-repetition-service.ts` erstellen
    - Interface `FaelligeStrophe` mit `wiederholungId`, `stropheId`, `stropheName`, `songTitel`, `songId`, `korrektZaehler`, `zeilen`
    - Funktion `getFaelligeStrophen(userId)`: Alle Wiederholungen mit `faelligAm <= heute` laden, inkl. Strophe/Song/Zeilen-Relationen
    - Funktion `getFaelligeStrophenFuerSong(userId, songId)`: Gefiltert auf einen Song
    - Funktion `getFaelligeAnzahl(userId)`: Count-Query für Dashboard-Widget
    - Funktion `erstelleWiederholung(userId, stropheId)`: Neuen Eintrag mit `faelligAm: now()` und `korrektZaehler: 0` anlegen
    - Funktion `verarbeiteReview(wiederholungId, userId, gewusst)`: `berechneIntervall()` aufrufen, Eintrag aktualisieren, neues Fälligkeitsdatum zurückgeben
    - Ownership-Check: Nur eigene Wiederholungen dürfen abgefragt/aktualisiert werden
    - _Anforderungen: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

  - [ ]* 4.2 Unit-Tests für `spaced-repetition-service.ts`
    - Test: `getFaelligeStrophen` liefert nur Strophen mit `faelligAm <= heute`
    - Test: `erstelleWiederholung` erstellt Eintrag mit korrekten Defaults
    - Test: `verarbeiteReview` aktualisiert `korrektZaehler` und `faelligAm` korrekt
    - Test: Duplikat-Erstellung wirft Fehler (unique constraint)
    - Test: Ownership-Verletzung wirft Fehler
    - _Anforderungen: 1.1, 1.3, 1.4, 2.1, 2.4_

- [x] 5. API-Endpunkte
  - [x] 5.1 `GET /api/spaced-repetition/queue` in `src/app/api/spaced-repetition/queue/route.ts`
    - Auth-Check via bestehende Middleware
    - Optionaler Query-Parameter `songId` zum Filtern auf einen Song
    - Response: `{ strophen: FaelligeStrophe[], anzahl: number }`
    - _Anforderungen: 1.1, 1.2_

  - [x] 5.2 `POST /api/spaced-repetition/review` in `src/app/api/spaced-repetition/review/route.ts`
    - Auth-Check via bestehende Middleware
    - Body: `{ wiederholungId: string, gewusst: boolean }`
    - Validierung: `wiederholungId` und `gewusst` müssen vorhanden sein
    - Ruft `verarbeiteReview()` auf
    - Response: `{ naechstesFaelligkeitsdatum: string, intervallTage: number }`
    - _Anforderungen: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 5.3 Unit-Tests für API-Endpunkte
    - Test: Queue-Endpunkt liefert korrekte Struktur
    - Test: Review-Endpunkt aktualisiert Wiederholung
    - Test: Unauthentifizierte Requests werden abgelehnt (401)
    - Test: Ungültige Body-Daten werden abgelehnt (400)
    - _Anforderungen: 1.1, 2.1, 2.4_

- [x] 6. Checkpoint – Backend validieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Nutzer konsultieren.

- [x] 7. Dashboard-Widget
  - [x] 7.1 Komponente `SpacedRepetitionWidget` in `src/components/spaced-repetition/spaced-repetition-widget.tsx`
    - Props: `faelligeAnzahl: number`
    - Zeigt „N Strophen heute fällig" als Karte
    - Bei `faelligeAnzahl === 0`: Zeigt „Keine Strophen fällig — gut gemacht!" in gedämpfter Farbe
    - Klick navigiert zum ersten Song mit fälligen Strophen
    - `aria-live="polite"` für Barrierefreiheit
    - _Anforderungen: 1.1, 1.2_

  - [x] 7.2 Dashboard-Integration
    - `SpacedRepetitionWidget` in `src/app/(main)/dashboard/page.tsx` einbinden
    - Dashboard-API (`src/app/api/dashboard/route.ts`) um `faelligeStrophenAnzahl` erweitern
    - _Anforderungen: 1.1_

- [ ] 8. FlipCard-Komponente und Session-UI
  - [-] 8.1 Komponente `FlipCard` in `src/components/spaced-repetition/flip-card.tsx`
    - Props: `stropheName`, `zeilen`, `aufgedeckt`, `onFlip`
    - Vorderseite: Strophen-Name zentriert, „Tippe zum Aufdecken"
    - Rückseite: Vollständiger Strophentext (alle Zeilen sortiert nach `orderIndex`)
    - CSS-Flip-Animation (`transform: rotateY`, 400ms transition)
    - `aria-live="polite"` für aufgedeckten Text

  - [~] 8.2 Komponente `SessionView` in `src/components/spaced-repetition/session-view.tsx`
    - Props: `strophen: FaelligeStrophe[]`, `songTitel: string`, `onComplete: () => void`
    - Fortschrittsindikator: „N / M erledigt"
    - Zeigt eine FlipCard pro Strophe
    - Nach Aufdecken: Buttons „Gewusst" (grün) / „Nicht gewusst" (rot)
    - Nach Bewertung: Label „Nächste Wiederholung in X Tagen"
    - Ruft `POST /api/spaced-repetition/review` pro Bewertung auf
    - Nach letzter Strophe: Zusammenfassung anzeigen und `onComplete` aufrufen

  - [~] 8.3 Session-Seite `src/app/(main)/songs/[id]/spaced-repetition/page.tsx`
    - Lädt fällige Strophen via `GET /api/spaced-repetition/queue?songId={id}`
    - Rendert `SessionView` mit den fälligen Strophen
    - Bei Abschluss: Session-Eintrag via `POST /api/sessions` mit `lernmethode: SPACED_REPETITION` erstellen
    - Navigiert zurück zur Song-Detailseite
    - _Anforderungen: 1.1, 2.1, 2.2, 2.3, 2.4_

  - [ ]* 8.4 Unit-Tests für UI-Komponenten
    - Test: FlipCard zeigt Strophen-Name auf Vorderseite
    - Test: FlipCard zeigt Zeilen nach Flip
    - Test: SessionView zeigt Fortschrittsindikator korrekt
    - Test: „Gewusst"/„Nicht gewusst"-Buttons rufen Review-API auf

- [~] 9. Abschluss-Checkpoint
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Nutzer konsultieren.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften des Algorithmus
