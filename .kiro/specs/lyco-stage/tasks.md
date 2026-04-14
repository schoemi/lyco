# Implementierungsplan: Lyco Stage

## Übersicht

Lyco Stage wird als PWA-Route `/stage` innerhalb der bestehenden Next.js-App implementiert. Die Umsetzung erfolgt inkrementell: zuerst Typen und Datenschicht, dann API-Endpunkte, dann Service Worker und Offline-Logik, dann UI-Komponenten und Hooks, und schließlich die vollständige Integration.

## Aufgaben

- [x] 1. TypeScript-Typen und localStorage-Hilfsfunktionen für Stage anlegen
  - Datei `src/types/stage.ts` erstellen mit `StageSettings`, `StageBundleResponse`, `StageProgressResponse`, `StageSet`, `StageSong`, `StageStrophe`, `StageZeile`, `StageStropheProgress`
  - Datei `src/lib/stage/storage.ts` erstellen mit `loadStageSettings()`, `saveStageSettings()`, `loadLastSyncTimestamp()`, `saveLastSyncTimestamp()` — analog zu `src/lib/karaoke/storage.ts`
  - Gültige Schriftgrößen-Stufen (32, 40, 48, 56, 72) und Fallback-Werte (DisplayMode: "strophe", FontSize: 48, ScrollSpeed: 3, Highlighting: true, Schwellwerte: 50/80) definieren
  - _Anforderungen: 12.2, 6.3_

  - [x] 1.1 Property-Test für Stage-Einstellungen Round-Trip schreiben
    - **Property 7: Stage-Einstellungen Round-Trip**
    - **Validates: Anforderung 12.2**
    - Testdatei: `__tests__/stage/settings-roundtrip.property.test.ts`
    - Generator: `fc.record()` mit allen `StageSettings`-Feldern

  - [x] 1.2 Property-Test für Schriftgrößen-Validierung schreiben
    - **Property 8: Schriftgrößen-Validierung**
    - **Validates: Anforderung 6.3**
    - Testdatei: `__tests__/stage/font-size-validation.property.test.ts`
    - Generator: `fc.constantFrom(32, 40, 48, 56, 72)` sowie ungültige Werte für Fallback-Prüfung

- [x] 2. `useConfidenceHighlighting`-Hook implementieren
  - Datei `src/lib/stage/use-confidence-highlighting.ts` erstellen
  - `getLineColor(stropheId: string): string` berechnet Farbe anhand Confidence-Score und konfigurierbarer Schwellwerte
  - Highlighting kann per `setEnabled(boolean)` deaktiviert werden — bei deaktiviertem Highlighting immer `#FFFFFF` zurückgeben
  - Schwellwerte über `setThresholds({ low, high })` konfigurierbar; Werte in `StageSettings` persistieren
  - _Anforderungen: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 2.1 Property-Test für Confidence-Highlighting-Farbzuordnung schreiben
    - **Property 1: Confidence-Highlighting-Farbzuordnung**
    - **Validates: Anforderungen 8.2, 8.3, 8.4, 8.5, 8.6, 8.7**
    - Testdatei: `__tests__/stage/confidence-highlighting.property.test.ts`
    - Generatoren: `fc.integer({min: 0, max: 100})` für Score, `fc.integer({min: 0, max: 100})` für Schwellwerte, `fc.boolean()` für enabled

- [x] 3. API-Endpunkt `GET /api/stage/bundle` implementieren
  - Datei `src/app/api/stage/bundle/route.ts` erstellen
  - Session-Prüfung via `auth()` — 401 bei fehlender Authentifizierung
  - Prisma-Query: alle Songs des Nutzers mit Strophen, Zeilen und Sets (inkl. `SetSong`-Reihenfolge)
  - ETag-Header als SHA-256-Hash über die serialisierte Antwort setzen
  - Antwort-Typ: `StageBundleResponse` mit `sets`, `songs`, `timestamp`
  - _Anforderungen: 13.1, 13.3, 13.4_

  - [x] 3.1 Property-Test für Bundle-API schreiben
    - **Property 10: Bundle-API liefert vollständige Nutzerdaten**
    - **Validates: Anforderung 13.1**
    - Testdatei: `__tests__/stage/bundle-api.property.test.ts`
    - Prisma-Mock mit generierten Songs/Sets

  - [x] 3.2 Property-Test für API-Authentifizierung schreiben
    - **Property 12: API-Authentifizierung**
    - **Validates: Anforderung 13.3**
    - Testdatei: `__tests__/stage/api-auth.property.test.ts`
    - Generator: `fc.constantFrom("/api/stage/bundle", "/api/stage/progress")`

  - [x] 3.3 Property-Test für ETag-Determinismus schreiben
    - **Property 13: ETag-Header-Präsenz**
    - **Validates: Anforderung 13.4**
    - Testdatei: `__tests__/stage/etag-determinism.property.test.ts`
    - Generierte API-Responses auf ETag-Konsistenz prüfen

- [x] 4. API-Endpunkt `GET /api/stage/progress` implementieren
  - Datei `src/app/api/stage/progress/route.ts` erstellen
  - Session-Prüfung via `auth()` — 401 bei fehlender Authentifizierung
  - Prisma-Query: alle `Fortschritt`-Einträge des Nutzers (`stropheId`, `prozent`)
  - ETag-Header analog zu Bundle-Endpunkt setzen
  - Antwort-Typ: `StageProgressResponse` mit `progress[]`, `timestamp`
  - _Anforderungen: 13.2, 13.3, 13.4_

  - [x] 4.1 Property-Test für Progress-API schreiben
    - **Property 11: Progress-API liefert vollständige Fortschrittsdaten**
    - **Validates: Anforderung 13.2**
    - Testdatei: `__tests__/stage/progress-api.property.test.ts`
    - Generierte Fortschrittsdaten mit Prisma-Mock

- [x] 5. Checkpoint — Alle Tests bestehen, API-Endpunkte manuell prüfbar
  - Sicherstellen, dass alle bisherigen Tests grün sind. Bei Fragen den Nutzer ansprechen.

- [x] 6. Service Worker für Offline-First implementieren
  - Datei `public/stage-sw.js` erstellen
  - Cache-Name `lyco-stage-v1` definieren
  - Cache-First-Strategie für `/api/stage/bundle` und `/api/stage/progress`
  - Cache-First für Stage-Assets (`/stage/*`, JS, CSS, Fonts)
  - Stale-While-Revalidate: bei Online-Zugang Cache im Hintergrund aktualisieren
  - Network-First für alle anderen Routen
  - _Anforderungen: 3.1, 3.2, 3.3_

  - [x] 6.1 Unit-Test für Service Worker schreiben
    - Testdatei: `__tests__/stage/service-worker.test.ts`
    - Cache-First-Verhalten, Offline-Fallback und Stale-While-Revalidate testen
    - _Anforderungen: 3.1, 3.2, 3.3_

- [x] 7. `useStageKeyboard`-Hook implementieren
  - Datei `src/lib/stage/use-stage-keyboard.ts` erstellen
  - Erweitert `useKaraokeKeyboard` um `PageUp`/`PageDown`-Support und Song-Navigation (`onNextSong`, `onPrevSong`)
  - `Escape` → zurück zur Setlist-Ansicht (`onEscape`)
  - `Space` → Auto-Scroll Toggle (`onToggleAutoScroll`)
  - _Anforderungen: 9.1, 9.3, 9.6_

  - [x] 7.1 Property-Test für Keyboard-Event-Mapping schreiben
    - **Property 2: Keyboard-Event-Mapping**
    - **Validates: Anforderungen 9.1, 9.3**
    - Testdatei: `__tests__/stage/keyboard-mapping.property.test.ts`
    - Generator: `fc.constantFrom("ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Escape")`

- [x] 8. `useStageData`-Hook implementieren
  - Datei `src/lib/stage/use-stage-data.ts` erstellen
  - Lädt `StageBundleResponse` und `StageProgressResponse` via `fetch` (Service Worker cached automatisch)
  - Gibt `sets`, `songs` (als `Map<string, StageSong>`), `progress` (als `Map<string, number>`), `lastSyncTimestamp`, `isLoading`, `error` zurück
  - Bei Netzwerkfehler ohne Cache: `error` auf "Bitte zuerst online synchronisieren" setzen
  - _Anforderungen: 3.1, 3.2, 5.4_

  - [x] 8.1 Property-Test für Read-Only-Zugriff schreiben
    - **Property 17: Read-Only-Zugriff in der Setlist-Ansicht**
    - **Validates: Anforderung 5.4**
    - Testdatei: `__tests__/stage/readonly-access.property.test.ts`
    - Sicherstellen, dass keine Mutationsmethoden (POST/PUT/PATCH/DELETE) aufgerufen werden

- [x] 9. `usePreflightCheck`-Hook implementieren
  - Datei `src/lib/stage/use-preflight-check.ts` erstellen
  - `start()` ruft `/api/stage/bundle` und `/api/stage/progress` auf und speichert Antworten im Cache
  - Fortschritt (`loaded`/`total`) wird pro Song aktualisiert
  - Fehlgeschlagene Songs werden namentlich in `failedSongs[]` gesammelt — Preflight läuft für übrige Songs weiter
  - Nach erfolgreichem Abschluss: Zeitstempel via `saveLastSyncTimestamp()` persistieren
  - `navigator.storage.persist()` aufrufen; bei Ablehnung `persistWarning: true` setzen
  - _Anforderungen: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 3.4, 3.5_

  - [x] 9.1 Property-Test für Preflight-Fortschrittsanzeige schreiben
    - **Property 15: Preflight-Fortschrittsanzeige**
    - **Validates: Anforderung 4.3**
    - Testdatei: `__tests__/stage/preflight-progress.property.test.ts`
    - Generator: `fc.integer({min: 1, max: 100})` für Songanzahl

  - [x] 9.2 Property-Test für Preflight-Fehlertoleranz schreiben
    - **Property 16: Preflight-Fehlertoleranz**
    - **Validates: Anforderung 4.5**
    - Testdatei: `__tests__/stage/preflight-errors.property.test.ts`
    - Generatoren: `fc.array()` für Songs, `fc.subarray()` für fehlgeschlagene Songs

  - [x] 9.3 Property-Test für Sync-Zeitstempel-Persistenz schreiben
    - **Property 20: Sync-Zeitstempel-Persistenz**
    - **Validates: Anforderung 4.6**
    - Testdatei: `__tests__/stage/sync-timestamp.property.test.ts`
    - Generator: `fc.date()` für Zeitstempel

- [x] 10. Checkpoint — Alle Hooks und API-Endpunkte vollständig getestet
  - Sicherstellen, dass alle bisherigen Tests grün sind. Bei Fragen den Nutzer ansprechen.

- [x] 11. Stage-Layout und PWA-Manifest implementieren
  - Datei `src/app/stage/layout.tsx` erstellen: schwarzer Hintergrund (`#000000`), kein Navigation-Chrome, Fullscreen-API-Integration via `document.documentElement.requestFullscreen()`
  - Auth-Prüfung: nicht authentifizierte Nutzer zu `/login` weiterleiten (analog zu bestehenden geschützten Routen)
  - Datei `src/app/manifest.json` (oder `src/app/manifest.ts` als Route Handler) erstellen mit `display: "standalone"`, `theme_color: "#000000"`, `start_url: "/stage"`
  - Service Worker in `layout.tsx` registrieren: `navigator.serviceWorker.register("/stage-sw.js")`
  - _Anforderungen: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2_

  - [x] 11.1 Unit-Test für Stage-Layout schreiben
    - Testdatei: `__tests__/stage/stage-layout.test.ts`
    - Schwarzen Hintergrund, fehlendes Navigation-Chrome und Fullscreen-API-Aufruf testen
    - _Anforderungen: 1.1, 1.2, 1.3_

  - [x] 11.2 Unit-Test für PWA-Manifest schreiben
    - Testdatei: `__tests__/stage/manifest.test.ts`
    - Manifest-Felder `display`, `theme_color`, `start_url` prüfen
    - _Anforderungen: 2.1_

- [x] 12. `PreflightCheck`-Komponente implementieren
  - Datei `src/components/stage/preflight-check.tsx` erstellen
  - Fortschrittsbalken mit `loaded`/`total` aus `usePreflightCheck`
  - Fehlgeschlagene Songs namentlich auflisten
  - Zeitstempel der letzten Synchronisation anzeigen
  - Warnung bei abgelehntem `navigator.storage.persist()` anzeigen
  - _Anforderungen: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 3.4, 3.5_

  - [x] 12.1 Unit-Test für Preflight-Check-Komponente schreiben
    - Testdatei: `__tests__/stage/preflight-check.test.ts`
    - Erfolgreichen Sync und Zeitstempel-Anzeige testen
    - _Anforderungen: 4.4, 4.6_

  - [x] 12.2 Unit-Test für Persistent-Storage-Warnung schreiben
    - Testdatei: `__tests__/stage/persist-warning.test.ts`
    - Warnung bei abgelehntem `persist()` testen
    - _Anforderungen: 3.5_

- [x] 13. `NextSongHint`-Komponente implementieren
  - Datei `src/components/stage/next-song-hint.tsx` erstellen
  - Zeigt Titel des nächsten Songs am unteren Bildschirmrand an, wenn `visible === true`
  - Bei `nextSongTitle === null` → "Ende der Setlist" anzeigen
  - Dezente, gedimmte Darstellung (z.B. `text-white/40`)
  - _Anforderungen: 11.1, 11.2, 11.3_

  - [x] 13.1 Property-Test für Nächster-Song-Hinweis schreiben
    - **Property 6: Nächster-Song-Hinweis bei letzten Zeilen**
    - **Validates: Anforderung 11.1**
    - Testdatei: `__tests__/stage/next-song-hint.property.test.ts`
    - Generatoren: `fc.integer()` für aktive Zeile, `fc.integer({min: 1})` für Gesamtzeilen, `fc.boolean()` für letzter Song

  - [x] 13.2 Unit-Test für "Ende der Setlist"-Hinweis schreiben
    - Testdatei: `__tests__/stage/setlist-end.test.ts`
    - _Anforderungen: 11.2_

- [x] 14. `StageEinstellungsDialog`-Komponente implementieren
  - Datei `src/components/stage/stage-einstellungs-dialog.tsx` erstellen
  - Erweitert `EinstellungsDialog` um: Schriftgrößen-Auswahl (5 Stufen), Highlighting an/aus, Highlighting-Schwellwerte (low/high), DisplayMode-Auswahl
  - Änderungen sofort ohne Neuladen anwenden (via `onSettingsChange`-Callback)
  - Einstellungen via `saveStageSettings()` in localStorage persistieren
  - _Anforderungen: 12.1, 12.2, 12.3, 12.4_

  - [x] 14.1 Unit-Test für Einstellungs-Dialog schreiben
    - Testdatei: `__tests__/stage/einstellungs-dialog.test.ts`
    - Dialog öffnen/schließen und Werte-Änderungen testen
    - _Anforderungen: 12.1, 12.3_

- [x] 15. `StrophenAnzeige` und `SongAnzeige` um Confidence-Highlighting erweitern
  - `src/components/karaoke/strophen-anzeige.tsx` und `src/components/karaoke/song-anzeige.tsx` um optionalen `getLineColor?: (stropheId: string) => string`-Prop erweitern
  - Wenn `getLineColor` übergeben wird, Zeilenfarbe entsprechend setzen; andernfalls Standardverhalten beibehalten (keine Breaking Changes)
  - _Anforderungen: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 16. Prompter-Ansicht (`src/app/stage/[songId]/page.tsx`) implementieren
  - Seite erstellt mit `useStageData()`, `useConfidenceHighlighting()`, `useStageKeyboard()`, `useKaraokeSwipe()`, `useAutoScroll()`
  - Bestehende Karaoke-Komponenten (`TextAnzeige`, `StrophenTitel`) direkt wiederverwenden
  - Schriftgröße aus `StageSettings.fontSize` als Inline-Style auf den Text-Container anwenden
  - Song-Info-Einblendung (Titel + Künstler) für 3 Sekunden bei Song-Wechsel anzeigen
  - `NextSongHint` einbinden: sichtbar wenn aktive Zeile innerhalb der letzten 3 Zeilen des Songs
  - `aria-live="polite"`-Region mit aktivem Zeilentext für Screenreader
  - Alle interaktiven Elemente mit `aria-label` versehen
  - _Anforderungen: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 8.1–8.7, 9.1–9.6, 10.1–10.4, 11.1–11.3, 14.1, 14.2, 14.3_

  - [x] 16.1 Property-Test für Swipe-Navigationsrichtung schreiben
    - **Property 3: Swipe-Navigationsrichtung**
    - **Validates: Anforderungen 10.1, 10.2**
    - Testdatei: `__tests__/stage/swipe-navigation.property.test.ts`
    - Generatoren: `fc.integer()` für deltaY, `fc.integer({min: 0})` für aktuelle Position, `fc.integer({min: 1})` für Gesamtzeilen

  - [x] 16.2 Property-Test für manuelle Navigation pausiert Auto-Scroll schreiben
    - **Property 4: Manuelle Navigation pausiert Auto-Scroll**
    - **Validates: Anforderung 7.3**
    - Testdatei: `__tests__/stage/autoscroll-pause.property.test.ts`
    - Generator: `fc.constantFrom("keyboard", "swipe", "touch")` für Navigationstyp

  - [x] 16.3 Property-Test für Auto-Scroll-Geschwindigkeit schreiben
    - **Property 19: Auto-Scroll-Geschwindigkeit**
    - **Validates: Anforderung 7.2**
    - Testdatei: `__tests__/stage/autoscroll-speed.property.test.ts`
    - Generator: `fc.integer({min: 1, max: 10})` für Scroll-Geschwindigkeit

  - [x] 16.4 Property-Test für Strophentitel-Anzeige schreiben
    - **Property 18: Strophentitel-Anzeige**
    - **Validates: Anforderung 6.5**
    - Testdatei: `__tests__/stage/strophen-titel.property.test.ts`
    - Generierte Songs mit Strophen

  - [x] 16.5 Property-Test für DisplayMode-Unterstützung schreiben
    - **Property 9: DisplayMode-Unterstützung**
    - **Validates: Anforderung 6.2**
    - Testdatei: `__tests__/stage/display-mode.property.test.ts`
    - Generator: `fc.constantFrom("einzelzeile", "strophe", "song")`

  - [x] 16.6 Property-Test für Aria-Live-Region schreiben
    - **Property 14: Aria-Live-Region aktualisiert sich mit aktiver Zeile**
    - **Validates: Anforderung 14.1**
    - Testdatei: `__tests__/stage/aria-live.property.test.ts`
    - Generierte FlatLines

  - [x] 16.7 Unit-Test für Song-Info-Einblendung schreiben
    - Testdatei: `__tests__/stage/song-info-overlay.test.ts`
    - 3-Sekunden-Einblendung bei Song-Wechsel testen
    - _Anforderungen: 6.6_

- [x] 17. Setlist-Ansicht (`src/app/stage/page.tsx`) implementieren
  - Seite erstellt mit `useStageData()` und `usePreflightCheck()`
  - Alle Sets des Nutzers mit Songs in gespeicherter `orderIndex`-Reihenfolge anzeigen
  - Aktiven Song visuell hervorheben
  - "Bühne vorbereiten"-Button: löst `usePreflightCheck().start()` aus, zeigt `PreflightCheck`-Komponente
  - Zeitstempel der letzten Synchronisation anzeigen
  - Bei letztem Song einer Setlist: zurück zur Setlist-Ansicht navigieren
  - `StageEinstellungsDialog` über Zahnrad-Icon erreichbar
  - _Anforderungen: 5.1, 5.2, 5.3, 5.4, 5.5, 4.1–4.6, 12.1_

  - [x] 17.1 Property-Test für Setlist-Reihenfolge-Erhaltung schreiben
    - **Property 5: Setlist-Reihenfolge-Erhaltung**
    - **Validates: Anforderung 5.1**
    - Testdatei: `__tests__/stage/setlist-order.property.test.ts`
    - Generator: `fc.array(fc.record({songId: fc.uuid(), orderIndex: fc.nat()}))`

  - [x] 17.2 Unit-Test für Song-Navigation schreiben
    - Testdatei: `__tests__/stage/song-navigation.test.ts`
    - Song-Wechsel und Rückkehr zur Setlist beim letzten Song testen
    - _Anforderungen: 5.2, 5.5_

- [x] 18. Web Bluetooth Enhancement (optional) implementieren
  - Feature-Detection: `if ("bluetooth" in navigator)` prüfen
  - Wenn verfügbar (Android): optionale direkte BLE-Verbindung als Enhancement anbieten
  - Wenn nicht verfügbar: ausschließlich auf HID-Keyboard-Events zurückfallen — ohne Fehlermeldung
  - _Anforderungen: 9.4, 9.5_

  - [x] 18.1 Unit-Test für Web Bluetooth Enhancement schreiben
    - Testdatei: `__tests__/stage/web-bluetooth.test.ts`
    - Feature-Detection und Fallback ohne Fehlermeldung testen
    - _Anforderungen: 9.4, 9.5_

- [x] 19. Abschluss-Checkpoint — Alle Tests bestehen, vollständige Integration prüfen
  - Sicherstellen, dass alle Tests grün sind und alle Komponenten korrekt verdrahtet sind. Bei Fragen den Nutzer ansprechen.

## Hinweise

- Aufgaben mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jede Aufgabe referenziert spezifische Anforderungen für Rückverfolgbarkeit
- Property-Tests validieren universelle Korrektheitseigenschaften aus dem Design-Dokument
- Unit-Tests validieren spezifische Beispiele und Edge-Cases
- Checkpoints stellen inkrementelle Validierung sicher
