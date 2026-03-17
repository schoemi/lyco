# Implementation Plan: Gamification & Fortschritt

## Overview

Implementierung des Gamification- und Fortschrittssystems für den Song Text Trainer. Die Umsetzung erfolgt inkrementell: zuerst Datenmodell und reine Funktionen, dann Service-Schicht und API-Endpunkte, anschließend UI-Komponenten und abschließend Integration. Alle Berechnungen werden als reine Funktionen in `src/lib/gamification/` implementiert und durch Property-Based Tests abgesichert.

## Tasks

- [x] 1. Datenmodell: Streak-Tabelle anlegen
  - [x] 1.1 Prisma-Schema um Streak-Modell erweitern
    - Neues `Streak`-Modell in `prisma/schema.prisma` hinzufügen mit Feldern `id`, `userId` (unique), `currentStreak`, `lastSessionDate`, `updatedAt`
    - Optionale `streak`-Relation im bestehenden `User`-Modell ergänzen
    - Migration ausführen: `npx prisma migrate dev --name add-streak-model`
    - _Requirements: 1.1_

- [x] 2. Reine Funktionen implementieren
  - [x] 2.1 Streak-Berechnung (`src/lib/gamification/streak.ts`)
    - `berechneStreak(input: StreakInput): StreakResult` implementieren
    - Logik: gleicher Tag → Streak unverändert, Vortag → Streak +1, >1 Tag oder null → Streak = 1
    - Interfaces `StreakInput` und `StreakResult` definieren
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4_

  - [x] 2.2 Property-Test: Streak-Berechnung
    - **Property 1: Streak-Berechnung ist korrekt**
    - Datei: `__tests__/gamification/streak-berechnung.property.test.ts`
    - Teste alle Datumskombinationen: gleicher Tag, Vortag, >1 Tag Differenz, null-Datum
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 3.2, 3.3, 3.4, 11.3**

  - [x] 2.3 Song-Fortschritt (`src/lib/gamification/song-progress.ts`)
    - `berechneSongFortschritt(strophenFortschritte: number[]): number` implementieren
    - Arithmetisches Mittel, gerundet, Ergebnis in [0, 100], leere Liste → 0
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.4 Status-Punkt-Farbe (`src/lib/gamification/status-punkt.ts`)
    - `getStatusPunktFarbe(fortschrittProzent: number): StatusPunktFarbe` implementieren
    - Typ `StatusPunktFarbe = "grau" | "orange" | "gruen"`
    - 0% → grau, 1–99% → orange, 100% → grün
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [x] 2.5 Durchschnittsfortschritt (`src/lib/gamification/durchschnitt.ts`)
    - `berechneDurchschnitt(songFortschritte: number[]): number` implementieren
    - Arithmetisches Mittel, gerundet, Ergebnis in [0, 100], leere Liste → 0
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x] 2.6 Property-Test: Fortschrittsberechnung
    - **Property 3: Fortschrittsberechnung als arithmetisches Mittel mit ganzzahligem Ergebnis in [0, 100]**
    - Datei: `__tests__/gamification/fortschritt-durchschnitt.property.test.ts`
    - Teste `berechneSongFortschritt` und `berechneDurchschnitt` gemeinsam
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 8.1, 8.2, 8.3**

  - [x] 2.7 Property-Test: Status-Punkt-Farbzuordnung
    - **Property 4: Status-Punkt-Farbzuordnung ist vollständig und korrekt**
    - Datei: `__tests__/gamification/status-punkt-farbe.property.test.ts`
    - Teste alle ganzzahligen Werte in [0, 100] auf korrekte Farbzuordnung
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 3. Checkpoint – Reine Funktionen validieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Service-Schicht implementieren
  - [x] 4.1 Streak-Service (`src/lib/services/streak-service.ts`)
    - `getStreak(userId: string): Promise<number>` – Liest Streak, gibt 0 zurück wenn verfallen oder nicht vorhanden
    - `updateStreak(userId: string, tx?: PrismaTransaction): Promise<StreakResult>` – Aktualisiert Streak via `berechneStreak`, erstellt Datensatz bei Bedarf
    - Streak-Verfall prüfen: wenn `lastSessionDate` > 1 Tag zurückliegt → 0
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.2, 11.3_

  - [x] 4.2 Unit-Tests: Streak-Service
    - Datei: `__tests__/gamification/streak-service.test.ts`
    - Teste Streak-Erstellung, Aktualisierung, Verfall und Fehlerbehandlung mit Prisma-Mock
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 4.3 Session-Service erweitern (`src/lib/services/session-service.ts`)
    - `createSessionWithStreak(userId, songId, lernmethode): Promise<SessionCreateResult>` hinzufügen
    - Streak-Aktualisierung innerhalb derselben Datenbanktransaktion
    - Try-Catch um Streak-Update: bei Fehler loggen, Session trotzdem abschließen
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 4.4 Property-Test: Session-Zählung
    - **Property 5: Session-Zählung ist methodenunabhängig und monoton steigend**
    - Datei: `__tests__/gamification/session-zaehlung.property.test.ts`
    - Teste dass jede Session den Zähler um genau 1 erhöht, unabhängig von Lernmethode
    - **Validates: Requirements 7.1, 7.3, 7.4**

- [x] 5. API-Endpunkte implementieren
  - [x] 5.1 Streak-API (`src/app/api/streak/route.ts`)
    - GET-Endpunkt: Authentifizierung prüfen, `getStreak(userId)` aufrufen, `{ streak: number }` zurückgeben
    - 401 bei fehlender Authentifizierung, 500 bei internem Fehler
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 5.2 Sessions-API erweitern (`src/app/api/sessions/route.ts`)
    - POST-Handler: `createSessionWithStreak` statt `createSession` aufrufen
    - Response um `streak`-Feld erweitern
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 5.3 Dashboard-API erweitern (`src/app/api/dashboard/route.ts`)
    - Response um `streak` und `activeSongCount` Felder erweitern
    - `activeSongCount`: Anzahl Songs mit mindestens einer Session
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 5.4 Unit-Tests: Streak-API
    - Datei: `__tests__/gamification/streak-api.test.ts`
    - Teste Authentifizierung, Response-Format, Streak-Verfall-Szenario
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 5.5 Unit-Tests: Session-Streak-Integration
    - Datei: `__tests__/gamification/session-streak-integration.test.ts`
    - Teste dass Session-Abschluss den Streak korrekt aktualisiert
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 5.6 Property-Test: Aktive-Songs-Zählung
    - **Property 6: Aktive-Songs-Zählung basiert auf Session-Existenz**
    - Datei: `__tests__/gamification/aktive-songs.property.test.ts`
    - Teste dass aktive Songs = Songs mit sessionCount > 0
    - **Validates: Requirements 9.2**

- [x] 6. Checkpoint – Backend validieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. UI-Komponenten implementieren
  - [x] 7.1 StreakPill-Komponente (`src/components/gamification/streak-pill.tsx`)
    - Props: `{ streak: number }`
    - Orange Pill mit Flammen-Icon, Text „N Tage Streak" / „1 Tag Streak"
    - Nicht rendern wenn `streak === 0`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 7.2 Property-Test: Streak-Anzeige-Text
    - **Property 2: Streak-Anzeige-Text ist korrekt formatiert**
    - Datei: `__tests__/gamification/streak-pill.property.test.ts`
    - Teste Singular/Plural-Text und Nicht-Rendern bei Streak = 0
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x] 7.3 StatusPunkt-Komponente (`src/components/gamification/status-punkt.tsx`)
    - Props: `{ fortschritt: number }`
    - Rendert farbigen Punkt via `getStatusPunktFarbe(fortschritt)`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.4 MetrikKarte-Komponente (`src/components/gamification/metrik-karte.tsx`)
    - Props: `{ label: string, value: string | number, fortschrittsbalken?: number }`
    - Wiederverwendbare Karte mit Label, Wert und optionalem Fortschrittsbalken
    - _Requirements: 9.1, 9.4, 9.5_

  - [x] 7.5 Unit-Tests: MetrikKarte
    - Datei: `__tests__/gamification/metrik-karte.test.ts`
    - Teste Rendering von Label, Wert und optionalem Fortschrittsbalken
    - _Requirements: 9.1, 9.4_

  - [x] 7.6 Property-Test: Strophe-Gelernt-Schwellenwert
    - **Property 7: Strophe-Gelernt-Schwellenwert**
    - Datei: `__tests__/gamification/strophe-gelernt.property.test.ts`
    - Teste dass korrektZaehler >= 3 oder 2x fehlerfrei → 100%, sonst < 100%
    - **Validates: Requirements 4.1, 4.2**

- [x] 8. Integration und Verdrahtung
  - [x] 8.1 StreakPill in MainLayout einbinden
    - `src/components/app-header.tsx` (oder MainLayout) erweitern
    - Streak-Wert via `GET /api/streak` laden und an StreakPill übergeben
    - Streak nach Session-Abschluss aktualisieren ohne Seitenneuladen
    - _Requirements: 2.1, 2.4, 2.5_

  - [x] 8.2 StatusPunkt in SongRow einbinden
    - Bestehende inline Status-Punkt-Logik in `SongRow` durch `StatusPunkt`-Komponente ersetzen
    - _Requirements: 6.4_

  - [x] 8.3 Dashboard-Metrikkarten einbinden
    - Drei `MetrikKarte`-Instanzen im Dashboard: „Songs aktiv", „Sessions gesamt", „Ø Fortschritt"
    - Daten aus erweiterter Dashboard-API laden
    - 3-Spalten-Raster auf Desktop, 1-Spalte auf Mobile
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 8.4 TypeScript-Typen erweitern
    - `DashboardData` in `src/types/song.ts` um `streak` und `activeSongCount` erweitern
    - _Requirements: 9.1_

  - [x] 8.5 Unit-Tests: Dashboard-Metriken
    - Datei: `__tests__/gamification/dashboard-metriken.test.ts`
    - Teste dass Dashboard-API korrekte Metriken liefert (activeSongCount, Sessions gesamt, Durchschnittsfortschritt)
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 9. Final Checkpoint – Alle Tests und Integration validieren
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachvollziehbarkeit
- Checkpoints sichern inkrementelle Validierung ab
- Property-Tests validieren universelle Korrektheitseigenschaften mit `fast-check`
- Unit-Tests validieren spezifische Beispiele, Edge Cases und Integrationspunkte
- Alle reinen Funktionen liegen in `src/lib/gamification/`, Services in `src/lib/services/`
