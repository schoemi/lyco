# Implementierungsplan: Genius Song-Import

## Übersicht

Schrittweise Implementierung des Genius Song-Imports: Datenbankschema, Verschlüsselungsmodul, Genius-Client, API-Routen, Profil-Erweiterung, UI-Komponenten und Tests. Jeder Schritt baut auf dem vorherigen auf und endet mit der vollständigen Integration.

## Tasks

- [x] 1. Datenbank-Schema und Typen vorbereiten
  - [x] 1.1 Prisma-Schema um `geniusApiKeyEncrypted` erweitern
    - Neues optionales Feld `geniusApiKeyEncrypted String?` im `User`-Modell in `prisma/schema.prisma` hinzufügen
    - Prisma-Migration ausführen (`npx prisma migrate dev --name add-genius-api-key`)
    - Prisma-Client neu generieren
    - _Anforderungen: 8.2, 8.3_

  - [x] 1.2 TypeScript-Typen für Genius-Feature erstellen
    - Datei `src/types/genius.ts` anlegen mit `GeniusSearchResult`, `GeniusSearchRequest`, `GeniusImportRequest`
    - `ImportMode` in `src/types/import.ts` um `"genius"` erweitern
    - `ProfileData` in `src/types/profile.ts` um `geniusApiKeyMasked` und `UpdateProfileInput` um `geniusApiKey` erweitern
    - _Anforderungen: 1.3, 7.1, 7.2, 8.1, 8.5_

- [x] 2. API-Key-Store-Modul implementieren
  - [x] 2.1 Verschlüsselungs- und Entschlüsselungsmodul erstellen
    - Datei `src/lib/genius/api-key-store.ts` anlegen
    - `encryptApiKey(plaintext: string): string` implementieren (AES-256-GCM, zufällige IV, Base64-Ausgabe)
    - `decryptApiKey(encrypted: string): string` implementieren
    - `getUserApiKey(userId: string): Promise<string>` implementieren (liest und entschlüsselt aus DB)
    - Verschlüsselungsschlüssel aus `process.env.GENIUS_ENCRYPTION_KEY` lesen (32 Bytes, hex-kodiert)
    - _Anforderungen: 8.2, 8.3, 8.4_

  - [x] 2.2 Property-Test: API-Schlüssel-Verschlüsselung Round-Trip
    - **Property 1: API-Schlüssel-Verschlüsselung Round-Trip**
    - Datei `__tests__/genius/api-key-roundtrip.property.test.ts`
    - Für jeden gültigen API-Schlüssel-String: `decryptApiKey(encryptApiKey(key)) === key`
    - **Validiert: Anforderungen 8.2, 8.3, 8.7**

  - [x] 2.3 Property-Test: API-Schlüssel-Maskierung verbirgt Klartext
    - **Property 2: API-Schlüssel-Maskierung verbirgt Klartext**
    - Datei `__tests__/genius/api-key-masking.property.test.ts`
    - Für jeden Schlüssel mit Länge ≥ 4: maskierte Darstellung enthält nicht den vollständigen Schlüssel, zeigt nur letzte 4 Zeichen
    - **Validiert: Anforderungen 8.5**

- [x] 3. Genius-Client-Modul implementieren
  - [x] 3.1 Genius-Client erstellen
    - Datei `src/lib/genius/client.ts` anlegen
    - `searchSongs(query: string, apiKey: string): Promise<GeniusSearchResult[]>` implementieren
    - `fetchLyrics(geniusUrl: string, apiKey: string): Promise<string>` implementieren
    - npm-Paket `genius-lyrics-api` verwenden
    - Suchergebnisse auf maximal 10 begrenzen
    - _Anforderungen: 7.1, 7.2, 7.3, 7.4_

  - [x] 3.2 Property-Test: Suchergebnis-Begrenzung auf maximal 10
    - **Property 4: Suchergebnis-Begrenzung auf maximal 10**
    - Datei `__tests__/genius/search-limit.property.test.ts`
    - Für jede Suchanfrage: Ergebnisliste enthält maximal 10 Einträge
    - **Validiert: Anforderungen 7.4**

  - [x] 3.3 Unit-Tests für Genius-Client
    - Datei `__tests__/genius/genius-client.test.ts`
    - Tests mit gemocktem `genius-lyrics-api`-Paket
    - Testen: erfolgreiche Suche, leere Ergebnisse, API-Fehler, erfolgreicher Lyrics-Abruf
    - _Anforderungen: 7.1, 7.2, 7.3_

- [x] 4. Checkpoint – Basis-Module prüfen
  - Sicherstellen, dass alle Tests bestehen, den Nutzer bei Fragen ansprechen.

- [x] 5. Such-API-Route implementieren
  - [x] 5.1 Such-Endpunkt erstellen
    - Datei `src/app/api/songs/genius/search/route.ts` anlegen
    - `POST`-Handler: Auth-Check → API-Schlüssel aus DB entschlüsseln → `searchSongs()` aufrufen → Ergebnisse zurückgeben
    - HTTP 401 bei fehlender Authentifizierung
    - HTTP 400 bei fehlendem API-Schlüssel mit Meldung "Kein Genius-API-Schlüssel hinterlegt. Bitte in den Profileinstellungen konfigurieren."
    - HTTP 502 bei Genius-API-Fehler mit Meldung "Genius-Suche fehlgeschlagen"
    - _Anforderungen: 2.2, 4.1, 4.2, 4.4, 5.1_

  - [x] 5.2 Property-Test: Authentifizierungspflicht für Genius-Endpunkte
    - **Property 3: Authentifizierungspflicht für Genius-Endpunkte**
    - Datei `__tests__/genius/auth-required.property.test.ts`
    - Für jede nicht-authentifizierte Anfrage an Search und Import: HTTP 401
    - **Validiert: Anforderungen 4.2, 4.3**

  - [x] 5.3 Unit-Tests für Such-API-Route
    - Datei `__tests__/genius/genius-search-api.test.ts`
    - Testen: Auth-Fehler, fehlender API-Key, erfolgreiche Suche, Genius-API-Fehler
    - _Anforderungen: 2.2, 4.2, 4.4, 5.1_

- [x] 6. Import-API-Route implementieren
  - [x] 6.1 Import-Endpunkt erstellen
    - Datei `src/app/api/songs/genius/import/route.ts` anlegen
    - `POST`-Handler: Auth-Check → API-Schlüssel entschlüsseln → `fetchLyrics()` → Noise-Filter → Songtext-Parser → `importSong()` → Song-Daten zurückgeben
    - HTTP 401 bei fehlender Authentifizierung
    - HTTP 400 bei fehlendem API-Schlüssel
    - HTTP 422 bei leeren/ungültigen Lyrics mit Meldung "Keine gültigen Lyrics gefunden"
    - HTTP 502 bei Lyrics-Abruf-Fehler mit Meldung "Lyrics konnten nicht abgerufen werden"
    - Bestehende Module `isNoiseLine()` und `parseSongtext()` wiederverwenden
    - _Anforderungen: 3.2, 3.3, 3.4, 4.1, 4.3, 4.4, 5.2, 5.3, 6.1, 6.2, 6.3_

  - [x] 6.2 Property-Test: Leere Lyrics ergeben HTTP 422
    - **Property 8: Leere Lyrics ergeben HTTP 422**
    - Datei `__tests__/genius/empty-lyrics.property.test.ts`
    - Für jeden Lyrics-Text ohne gültige Strophen: HTTP 422 mit Meldung "Keine gültigen Lyrics gefunden"
    - **Validiert: Anforderungen 5.3**

  - [x] 6.3 Property-Test: Import-Pipeline verarbeitet Lyrics korrekt
    - **Property 7: Import-Pipeline verarbeitet Lyrics korrekt**
    - Datei `__tests__/genius/import-pipeline.property.test.ts`
    - Für jeden gültigen Lyrics-Rohtext mit mindestens einer Strophe: Song wird mit korrektem Titel, Künstler und geparsten Strophen gespeichert
    - **Validiert: Anforderungen 3.3, 3.4**

  - [x] 6.4 Unit-Tests für Import-API-Route
    - Datei `__tests__/genius/genius-import-api.test.ts`
    - Testen: Auth-Fehler, fehlender API-Key, erfolgreicher Import, leere Lyrics, Lyrics-Abruf-Fehler
    - _Anforderungen: 3.2, 3.3, 3.4, 4.3, 5.2, 5.3_

- [x] 7. Checkpoint – API-Routen prüfen
  - Sicherstellen, dass alle Tests bestehen, den Nutzer bei Fragen ansprechen.

- [x] 8. Profil-API um Genius-API-Schlüssel erweitern
  - [x] 8.1 Profil-Endpunkt für API-Schlüssel-Verwaltung erweitern
    - `PUT /api/profile` in `src/app/api/profile/route.ts` erweitern: optionales Feld `geniusApiKey` akzeptieren
    - Nicht-leerer Wert → `encryptApiKey()` → in `User.geniusApiKeyEncrypted` speichern
    - Leerer Wert → `geniusApiKeyEncrypted` auf `null` setzen (Schlüssel entfernen)
    - GET-Response: maskierten Schlüssel zurückgeben (z.B. "••••••abcd"), `null` wenn kein Schlüssel
    - Profil-Service in `src/lib/services/` entsprechend anpassen
    - _Anforderungen: 8.1, 8.2, 8.5, 8.6_

  - [x] 8.2 Unit-Tests für Profil-API-Erweiterung
    - Bestehende Tests in `__tests__/profile/` erweitern oder neue Tests hinzufügen
    - Testen: API-Key speichern, API-Key entfernen, maskierte Rückgabe
    - _Anforderungen: 8.1, 8.5, 8.6_

- [x] 9. UI-Komponenten implementieren
  - [x] 9.1 ImportTabs um Genius-Tab erweitern
    - `src/components/import/import-tabs.tsx` anpassen: neuen Tab `{ mode: "genius", label: "Genius" }` hinzufügen
    - _Anforderungen: 1.1, 1.2, 1.3_

  - [x] 9.2 GeniusSearchPanel-Komponente erstellen
    - Datei `src/components/import/genius-search-panel.tsx` anlegen
    - Suchfeld mit Mindestlänge 2 Zeichen (keine Suche bei kürzeren Eingaben)
    - Ladeanzeige während Suche und Import
    - Ergebnisliste mit Album-Art, Titel, Künstler
    - Klick auf Ergebnis löst Import aus → bei Erfolg Redirect zur Song-Detailseite
    - Fehlermeldungen im Alert-Bereich (`role="alert"`) anzeigen
    - Netzwerkfehler als "Verbindung zu Genius fehlgeschlagen. Bitte versuche es erneut." anzeigen
    - "Keine Ergebnisse gefunden"-Meldung bei leerer Ergebnisliste
    - _Anforderungen: 1.2, 2.1, 2.3, 2.4, 2.5, 3.1, 3.5, 5.4, 5.5_

  - [x] 9.3 Import-Seite um Genius-Panel erweitern
    - Import-Seite (`src/app/(main)/songs/import/page.tsx`) anpassen: GeniusSearchPanel bedingt rendern wenn `mode === "genius"`
    - _Anforderungen: 1.1, 1.2_

  - [x] 9.4 Property-Test: Kurze Suchbegriffe lösen keine Suche aus
    - **Property 5: Kurze Suchbegriffe lösen keine Suche aus**
    - Datei `__tests__/genius/short-query.property.test.ts`
    - Für jeden Suchbegriff mit weniger als 2 Zeichen: keine API-Anfrage
    - **Validiert: Anforderungen 2.5**

  - [x] 9.5 Property-Test: Suchergebnisse enthalten alle Pflichtfelder
    - **Property 6: Suchergebnisse enthalten alle Pflichtfelder**
    - Datei `__tests__/genius/search-result-fields.property.test.ts`
    - Für jedes GeniusSearchResult: gerenderte Darstellung enthält Titel, Künstler und Album-Cover
    - **Validiert: Anforderungen 2.3**

  - [x] 9.6 Property-Test: Fehlermeldungen werden im Alert-Bereich angezeigt
    - **Property 9: Fehlermeldungen werden im Alert-Bereich angezeigt**
    - Datei `__tests__/genius/error-alert.property.test.ts`
    - Für jede Fehlermeldung: Anzeige in einem Element mit `role="alert"`
    - **Validiert: Anforderungen 5.5**

  - [x] 9.7 Unit-Tests für GeniusSearchPanel
    - Datei `__tests__/genius/genius-search-panel.test.ts`
    - Testen: Tab-Anzeige, Suchergebnis-Rendering, Ladeanzeigen, Fehlermeldungen, Import-Auslösung
    - _Anforderungen: 1.1, 2.1, 2.3, 2.4, 5.5_

- [x] 10. Lyrics-Parsing-Integration und Round-Trip-Test
  - [x] 10.1 Property-Test: Lyrics-Parsing Round-Trip für Genius-Lyrics
    - **Property 10: Lyrics-Parsing Round-Trip**
    - Bestehenden Test `songtext-roundtrip.property.test.ts` prüfen oder Genius-spezifische Variante in `__tests__/genius/` erstellen
    - Für jeden gültigen geparsten Song: `parseSongtext(printSongtext(song))` ergibt gleiche Strophen-Namen und Zeilen-Arrays
    - **Validiert: Anforderungen 6.4**

- [x] 11. Integration und Verdrahtung
  - [x] 11.1 Umgebungsvariable und Konfiguration
    - `GENIUS_ENCRYPTION_KEY` in `.env.example` dokumentieren
    - Sicherstellen, dass alle Module korrekt importiert und verdrahtet sind
    - _Anforderungen: 8.4_

  - [x] 11.2 npm-Paket `genius-lyrics-api` installieren
    - `npm install genius-lyrics-api` ausführen
    - TypeScript-Typen prüfen (ggf. `@types/genius-lyrics-api` oder eigene Deklaration)
    - _Anforderungen: 7.3_

- [x] 12. Abschluss-Checkpoint – Alle Tests bestehen
  - Sicherstellen, dass alle Tests bestehen, den Nutzer bei Fragen ansprechen.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften
- Unit-Tests validieren spezifische Beispiele und Edge-Cases
