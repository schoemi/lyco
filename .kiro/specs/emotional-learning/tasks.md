# Implementierungsplan: Emotionales Lernen

## Übersicht

Schrittweise Implementierung der Lernmethode „Emotionales Lernen" für Lyco. Beginnt mit der Prisma-Schema-Erweiterung (Interpretation-Modell), geht über den InterpretationService und API-Routen bis hin zu den Frontend-Komponenten. Property-Tests validieren Korrektheit auf jeder Ebene.

## Tasks

- [x] 1. Prisma-Schema erweitern und TypeScript-Typen erstellen
  - [x] 1.1 Interpretation-Modell zum Prisma-Schema hinzufügen
    - `Interpretation`-Modell in `prisma/schema.prisma` ergänzen mit Feldern: `id`, `userId`, `stropheId`, `text`, `updatedAt`
    - `@@unique([userId, stropheId])` Constraint und `@@map("interpretationen")` setzen
    - Cascade-Delete über `onDelete: Cascade` auf `user` und `strophe` Relationen
    - Relationen `interpretationen Interpretation[]` in `User`- und `Strophe`-Modell ergänzen
    - Prisma-Migration ausführen: `npx prisma migrate dev --name add-interpretation`
    - _Anforderungen: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 TypeScript-Typen für Interpretation erstellen
    - Datei `src/types/interpretation.ts` anlegen
    - `InterpretationResponse`-Interface: `id`, `stropheId`, `text`, `updatedAt` (string)
    - `UpsertInterpretationInput`-Interface: `stropheId`, `text`
    - Import von Prisma-Typen aus `@/generated/prisma/client`
    - _Anforderungen: 1.1, 2.1, 3.1_

- [x] 2. InterpretationService implementieren
  - [x] 2.1 InterpretationService erstellen
    - Datei `src/lib/services/interpretation-service.ts` anlegen
    - `upsertInterpretation(userId, stropheId, text)` – Validierung (leerer Text), Ownership-Check (Strophe → Song → userId), Prisma-Upsert auf `userId_stropheId`
    - `deleteInterpretation(userId, interpretationId)` – Existenz- und Ownership-Check, dann Löschen
    - `getInterpretationsForSong(userId, songId)` – Song-Existenz- und Ownership-Check, dann alle Interpretationen des Users für den Song laden
    - Muster analog zu `note-service.ts` (gleiche Fehlerbehandlung: „Zugriff verweigert", „Strophe nicht gefunden", „Interpretationstext ist erforderlich")
    - _Anforderungen: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 2.2 Property-Test: Interpretation Upsert Round-Trip (Property 1)
    - **Property 1: Interpretation Upsert Round-Trip**
    - **Validiert: Anforderungen 1.2, 2.1, 2.2, 2.3, 2.6**
    - Datei `__tests__/emotional/interpretation-upsert.property.test.ts`
    - vi.hoisted/In-Memory-Store/Mock-Prisma-Pattern (analog `note-upsert.property.test.ts`)
    - Erstellen → Abrufen → gleicher Text; erneuter Upsert → Update ohne Duplikat; Löschen → nicht mehr abrufbar
    - `numRuns: 20`

  - [x] 2.3 Property-Test: Interpretation Ownership (Property 2)
    - **Property 2: Interpretation Ownership**
    - **Validiert: Anforderungen 2.4, 4.7**
    - Datei `__tests__/emotional/interpretation-ownership.property.test.ts`
    - Zugriff auf Strophen fremder Songs muss mit „Zugriff verweigert" abgelehnt werden
    - `numRuns: 20`

  - [x] 2.4 Property-Test: Interpretation Validierung (Property 3)
    - **Property 3: Interpretation Validierung**
    - **Validiert: Anforderungen 2.5, 3.5**
    - Datei `__tests__/emotional/interpretation-validation.property.test.ts`
    - Leerer String / nur Whitespace → Fehler; fehlende Pflichtfelder → Fehler
    - `numRuns: 20`

- [x] 3. Checkpoint – Service-Tests laufen
  - Sicherstellen, dass alle Tests bestehen, den Benutzer bei Fragen ansprechen.

- [x] 4. API-Routen für Interpretationen implementieren
  - [x] 4.1 POST /api/interpretations Route erstellen
    - Datei `src/app/api/interpretations/route.ts` anlegen
    - Auth-Check via `auth()`, dann `upsertInterpretation` aufrufen
    - Eingabevalidierung: `stropheId` und `text` als Pflichtfelder (HTTP 400 bei Fehlen)
    - Fehlerbehandlung: 401 (nicht authentifiziert), 400 (Validierung), 403 (Zugriff verweigert), 404 (Strophe nicht gefunden), 500 (interner Fehler)
    - _Anforderungen: 3.1, 3.4, 3.5_

  - [x] 4.2 GET /api/interpretations Route erstellen
    - GET-Handler in `src/app/api/interpretations/route.ts` ergänzen
    - Query-Parameter `songId` auslesen, Auth-Check, dann `getInterpretationsForSong` aufrufen
    - Fehlerbehandlung analog zu POST
    - _Anforderungen: 3.3, 3.4_

  - [x] 4.3 DELETE /api/interpretations/[id] Route erstellen
    - Datei `src/app/api/interpretations/[id]/route.ts` anlegen
    - Auth-Check, `id` aus Params, dann `deleteInterpretation` aufrufen
    - Fehlerbehandlung: 401, 403, 404, 500
    - _Anforderungen: 3.2, 3.4_

  - [x] 4.4 Property-Test: Interpretation Auth Required (Property 4)
    - **Property 4: Interpretation Auth Required**
    - **Validiert: Anforderungen 3.4**
    - Datei `__tests__/emotional/interpretation-auth.property.test.ts`
    - Alle Interpretation-API-Routen (POST, GET, DELETE) ohne Session → HTTP 401
    - Muster analog zu `auth-required.property.test.ts`
    - `numRuns: 20`

- [x] 5. Checkpoint – API-Tests laufen
  - Sicherstellen, dass alle Tests bestehen, den Benutzer bei Fragen ansprechen.

- [x] 6. Frontend-Komponenten implementieren
  - [x] 6.1 EmotionalPage und Navigationsleiste erstellen
    - Datei `src/app/(main)/songs/[id]/emotional/page.tsx` anlegen
    - Song-Daten via `GET /api/songs/[id]` laden, Interpretationen via `GET /api/interpretations?songId=X`
    - Session-Tracking: `POST /api/sessions` mit Lernmethode `EMOTIONAL` beim Seitenaufruf
    - Ownership-Check: Weiterleitung zum Dashboard bei fremdem Song
    - Navigationsleiste: Zurück-Button (links), Song-Titel (Mitte), „Emotionales Lernen" Label (rechts)
    - _Anforderungen: 4.1, 4.2, 4.7, 4.8, 8.1, 8.2_

  - [x] 6.2 EmotionsTags und ModeTabs Komponenten erstellen
    - `src/components/emotional/emotions-tags.tsx` – Horizontale Pill-Reihe, nicht-editierbar
    - `src/components/emotional/mode-tabs.tsx` – Drei Tabs: „Übersetzung", „Interpretation", „Meine Notizen"; aktiver Tab mit lila Hintergrund; `role="tablist"`, `role="tab"`, `aria-selected`
    - _Anforderungen: 4.3, 4.4, 4.5, 4.6, 11.1, 11.2_

  - [x] 6.3 StropheCard und RevealLine Komponenten erstellen
    - `src/components/emotional/strophe-card.tsx` – Strophen-Karte mit Header (Name + „Alle aufdecken"-Button), Zeilen-Paare
    - `src/components/emotional/reveal-line.tsx` – Original-Zeile (15px, primäre Farbe) + Übersetzung (13px, kursiv, sekundär); initial verborgen (grauer Balken); Klick → aufdecken mit 200ms CSS-Transition; `aria-hidden` Attribut
    - Aufdecken-Zustand als React-State (`Record<string, Set<string>>`), bleibt bei Tab-Wechsel erhalten
    - Keine Übersetzung → kein Balken/Platzhalter
    - „Alle aufdecken"-Button mit `aria-label` inkl. Strophen-Name
    - _Anforderungen: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 11.3, 11.4_

  - [x] 6.4 TranslationTab, InterpretationTab und NotesTab erstellen
    - `src/components/emotional/translation-tab.tsx` – Rendert StropheCards mit RevealLine im Übersetzungs-Modus
    - `src/components/emotional/interpretation-tab.tsx` – StropheCards mit Interpretations-Box (lila #EEEDFE, Label „Bedeutung dieser Strophe", editierbares Textfeld, Auto-Save bei Blur via POST /api/interpretations); `aria-label` auf Textarea
    - `src/components/emotional/notes-tab.tsx` – StropheCards mit Notizfeld (Placeholder „Meine persönliche Verbindung zu diesem Abschnitt...", Auto-Save bei Blur via bestehende Notiz-API); `aria-label` auf Textarea
    - _Anforderungen: 5.1, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 11.5_

  - [x] 6.5 ActionButtons Komponente erstellen
    - `src/components/emotional/action-buttons.tsx` – 2-Spalten-Raster: „Symbolik vertiefen" (sekundär) und „Zum Lückentext" (primär, lila)
    - „Zum Lückentext" → Navigation zur Lückentext-Route
    - „Symbolik vertiefen" → Interpretations-Tab aktivieren, zum ersten Strophen-Abschnitt scrollen
    - Responsive: unter 768px einspaltig (Buttons untereinander)
    - Mindestgröße 44x44px für Touch-Eingaben
    - _Anforderungen: 9.1, 9.2, 9.3, 10.1, 10.2, 10.3_

  - [x] 6.6 Property-Test: ARIA-Attribute auf Emotional-Lernen-Komponenten (Property 5)
    - **Property 5: ARIA-Attribute auf Emotional-Lernen-Komponenten**
    - **Validiert: Anforderungen 11.2, 11.3, 11.4, 11.5**
    - Datei `__tests__/emotional/aria-attributes.property.test.ts`
    - Statische TSX-Analyse (analog `song-accessibility.property.test.ts`): Tabs mit `role="tablist"`/`role="tab"`/`aria-selected`; „Alle aufdecken"-Buttons mit `aria-label`; verborgene Zeilen mit `aria-hidden`; Textfelder mit `aria-label`
    - `numRuns: 20`

- [x] 7. Final Checkpoint – Alle Tests laufen
  - Sicherstellen, dass alle Tests bestehen, den Benutzer bei Fragen ansprechen.

## Hinweise

- Tasks mit `*` markiert sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften mit `numRuns: 20`
- Alle Tests verwenden das bestehende `vi.hoisted`/In-Memory-Store/Mock-Prisma-Pattern
- Prisma-Typen werden aus `@/generated/prisma/client` importiert
