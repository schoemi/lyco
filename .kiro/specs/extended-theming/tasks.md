# Implementierungsplan: Erweitertes Theming

## Übersicht

Schrittweise Implementierung des erweiterten Theming-Systems: Datenbankschema, Service-Schicht, Serializer/Pretty-Printer, API-Routen, UI-Komponenten und Varianten-Toggle. Jeder Schritt baut auf dem vorherigen auf und endet mit der Integration aller Teile.

## Tasks

- [x] 1. Prisma-Schema erweitern und Datenbank migrieren
  - [x] 1.1 Neues `Theme`-Modell in `prisma/schema.prisma` anlegen
    - Felder: `id`, `name` (unique, max 100), `lightConfig` (JSON-String), `darkConfig` (JSON-String), `isDefault`, `createdAt`, `updatedAt`
    - Tabelle `themes` via `@@map("themes")`
    - _Anforderungen: 1.1, 1.3, 5.1_
  - [x] 1.2 `User`-Modell um `selectedThemeId` und `themeVariant` erweitern
    - `selectedThemeId String?` mit Relation zu `Theme` und `onDelete: SetNull`
    - `themeVariant String? @default("light")`
    - _Anforderungen: 6.3, 7.3_
  - [x] 1.3 Prisma-Migration erzeugen und anwenden
    - `npx prisma migrate dev --name add-themes`
    - Seed-Skript erweitern: Standard-Theme mit `isDefault: true` und sinnvollen Light/Dark-Defaults anlegen
    - _Anforderungen: 3.4, 5.5, 6.5_

- [x] 2. Theme-Service implementieren (`src/lib/services/theme-service.ts`)
  - [x] 2.1 CRUD-Funktionen: `getAllThemes`, `getThemeById`, `createTheme`, `updateTheme`, `deleteTheme`
    - `createTheme` erzeugt automatisch Light- und Dark-Variante mit Standardwerten
    - `deleteTheme` verhindert Löschen des Standard-Themes und setzt betroffene User zurück
    - Name-Validierung: eindeutig, 1–100 Zeichen
    - _Anforderungen: 1.1, 1.2, 1.3, 1.4, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1_
  - [ ]* 2.2 Property-Test: Theme-Name-Eindeutigkeit
    - **Property 1: Theme-Name-Eindeutigkeit**
    - **Validiert: Anforderungen 1.1, 1.4**
  - [ ]* 2.3 Property-Test: Theme-Name-Validierung
    - **Property 2: Theme-Name-Validierung**
    - **Validiert: Anforderungen 1.3**
  - [ ]* 2.4 Property-Test: Neues Theme hat zwei gültige Varianten
    - **Property 3: Neues Theme hat zwei gültige Varianten**
    - **Validiert: Anforderungen 1.2, 5.1, 5.5**
  - [x] 2.5 `setDefaultTheme`-Funktion implementieren
    - Entfernt `isDefault` vom bisherigen Standard-Theme, setzt es auf das neue
    - _Anforderungen: 4.3_
  - [x] 2.6 User-Präferenz-Funktionen: `getUserThemeConfig`, `setUserThemePreference`
    - `getUserThemeConfig` gibt die ThemeConfig der gewählten Variante zurück, Fallback auf Standard-Theme Light
    - `setUserThemePreference` speichert `selectedThemeId` und `themeVariant` auf dem User
    - _Anforderungen: 6.3, 6.4, 6.5, 7.3, 7.4, 7.5_
  - [ ]* 2.7 Property-Test: Varianten-Unabhängigkeit beim Speichern
    - **Property 4: Varianten-Unabhängigkeit beim Speichern**
    - **Validiert: Anforderungen 5.3, 5.4**
  - [ ]* 2.8 Property-Test: Löschen setzt betroffene User auf Standard-Theme zurück
    - **Property 5: Löschen setzt betroffene User auf Standard-Theme zurück**
    - **Validiert: Anforderungen 3.3**
  - [ ]* 2.9 Property-Test: User-Präferenz-Persistenz
    - **Property 6: User-Präferenz-Persistenz**
    - **Validiert: Anforderungen 6.3, 7.3, 7.4**
  - [ ]* 2.10 Property-Test: Standard-Fallback für User ohne Auswahl
    - **Property 7: Standard-Fallback für User ohne Auswahl**
    - **Validiert: Anforderungen 6.5, 7.5**

- [x] 3. Checkpoint – Basis-Service verifizieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

- [x] 4. Theme-Serializer und Pretty-Printer implementieren
  - [x] 4.1 `deserializeThemeJson` und `validateThemeJson` in `src/lib/theme/serializer.ts` ergänzen
    - Deserialisierung ignoriert `description`-Felder
    - Validierung prüft Pflichtfelder, Hex-Farben, Versionsnummer
    - _Anforderungen: 9.2, 9.3, 9.5, 10.4, 11.2_
  - [x] 4.2 Pretty-Printer-Modul erstellen (`src/lib/theme/pretty-printer.ts`)
    - `prettyPrintTheme(theme)` erzeugt formatiertes Theme_JSON mit semantischen Beschreibungen
    - `getDescriptions()` gibt die Beschreibungs-Map zurück
    - Jeder Konfigurationswert erhält ein `description`-Feld
    - Ausgabe mit Einrückung und Zeilenumbrüchen
    - _Anforderungen: 8.2, 8.3, 8.4, 10.1, 10.2, 10.3_
  - [ ]* 4.3 Property-Test: Export-Struktur enthält alle Pflichtfelder
    - **Property 8: Export-Struktur enthält alle Pflichtfelder**
    - **Validiert: Anforderungen 8.2, 8.3, 8.4**
  - [ ]* 4.4 Property-Test: Pretty-Printer fügt Beschreibungen hinzu
    - **Property 9: Pretty-Printer fügt Beschreibungen hinzu**
    - **Validiert: Anforderungen 10.1, 10.3**
  - [ ]* 4.5 Property-Test: Round-Trip Pretty-Print → Deserialize
    - **Property 10: Round-Trip Pretty-Print → Deserialize**
    - **Validiert: Anforderungen 11.1, 10.4, 11.2**
  - [ ]* 4.6 Property-Test: Round-Trip Deserialize → Serialize
    - **Property 11: Round-Trip Deserialize → Serialize**
    - **Validiert: Anforderungen 11.3**
  - [ ]* 4.7 Property-Test: Ungültige JSON-Eingaben werden abgelehnt
    - **Property 12: Ungültige JSON-Eingaben werden abgelehnt**
    - **Validiert: Anforderungen 9.3, 9.5**

- [x] 5. Checkpoint – Serializer und Pretty-Printer verifizieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

- [x] 6. Admin-API-Routen implementieren
  - [x] 6.1 CRUD-Routen für Themes erstellen
    - `GET /api/settings/themes` – Liste aller Themes mit Vorschau
    - `POST /api/settings/themes` – Neues Theme erstellen
    - `GET /api/settings/themes/[id]` – Einzelnes Theme laden
    - `PUT /api/settings/themes/[id]` – Theme aktualisieren
    - `DELETE /api/settings/themes/[id]` – Theme löschen
    - Authentifizierung und Admin-Rollenprüfung für alle Routen
    - Fehlerbehandlung gemäß Design (409, 400, 403, 404)
    - _Anforderungen: 1.1, 1.4, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3_
  - [x] 6.2 Export- und Import-Routen erstellen
    - `GET /api/settings/themes/[id]/export` – Theme als JSON exportieren (nutzt Pretty-Printer)
    - `POST /api/settings/themes/import` – Theme aus JSON importieren (nutzt Serializer)
    - Validierung und Fehlerbehandlung für ungültige JSON-Eingaben
    - _Anforderungen: 8.1, 8.2, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_
  - [ ]* 6.3 Unit-Tests für Admin-API-Routen
    - CRUD-Operationen mit konkreten Beispielen testen
    - Standard-Theme-Löschschutz testen
    - Namenskollision beim Import testen
    - _Anforderungen: 1.4, 3.4, 9.4_

- [x] 7. Öffentliche/User-API-Routen erweitern
  - [x] 7.1 `GET /api/theme` erweitern für benutzerspezifische Theme-Auflösung
    - Wenn User eingeloggt: Theme und Variante aus User-Präferenz laden
    - Wenn nicht eingeloggt oder keine Präferenz: Standard-Theme Light-Variante
    - _Anforderungen: 6.4, 6.5, 7.4, 7.5_
  - [x] 7.2 `PUT /api/profile` erweitern um `selectedThemeId` und `themeVariant`
    - Validierung: Theme muss existieren, Variante muss "light" oder "dark" sein
    - _Anforderungen: 6.3, 7.3_

- [x] 8. Checkpoint – API-Routen verifizieren
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

- [x] 9. Admin-UI: Theme-Verwaltung
  - [x] 9.1 `ThemeListPage` erstellen (`/admin/theming`)
    - Listenansicht aller Themes mit Name, Erstellungsdatum und Farbpaletten-Vorschau
    - Standard-Theme kennzeichnen
    - Aktionen: Bearbeiten, Löschen, Exportieren, Neues Theme erstellen
    - Lösch-Bestätigungsdialog
    - _Anforderungen: 4.1, 4.2, 4.3, 3.1, 3.2, 8.1_
  - [x] 9.2 `ThemeEditPage` erstellen (`/admin/theming/[id]`)
    - Bearbeitungsansicht mit Light/Dark-Umschalter
    - Live-Vorschau der aktuellen Variante (bestehende ThemePreview-Komponente wiederverwenden)
    - Speichern-Button für beide Varianten
    - Bestätigungsmeldung bei Verlassen ohne Speichern
    - _Anforderungen: 2.1, 2.2, 2.3, 2.4, 5.2, 5.3, 5.4_
  - [x] 9.3 `ThemeImportDialog` erstellen
    - Datei-Upload für Theme_JSON
    - Namenskollisions-Handling: Überschreiben oder neuen Namen vergeben
    - Fehlermeldungen bei ungültiger JSON-Datei
    - _Anforderungen: 9.1, 9.3, 9.4, 9.5_

- [x] 10. User-UI: Theme-Auswahl und Varianten-Toggle
  - [x] 10.1 `ThemeSelector` in Profil-Seite integrieren
    - Liste aller verfügbaren Themes mit Farbpaletten-Vorschau
    - Auswahl speichert Präferenz sofort via `PUT /api/profile`
    - _Anforderungen: 6.1, 6.2, 6.3, 6.4_
  - [x] 10.2 `VariantToggle` im User-Menü implementieren
    - Schalter mit Optionen „Light" und „Dark"
    - Umschalten wechselt sofort die Variante und persistiert die Auswahl
    - _Anforderungen: 7.1, 7.2, 7.3_
  - [x] 10.3 `ThemeHydrator` erweitern für benutzerspezifische Theme-Auflösung
    - Fetch von `/api/theme` mit User-Kontext
    - Variante aus User-Präferenz anwenden
    - Fallback auf Standard-Theme Light bei fehlender Präferenz
    - _Anforderungen: 6.4, 6.5, 7.4, 7.5_

- [x] 11. Integration und Abschluss
  - [x] 11.1 Export-Download-Funktion verdrahten
    - Export-Button in ThemeListPage löst Download der Theme_JSON-Datei aus
    - _Anforderungen: 8.5_
  - [x] 11.2 Bestehende `getThemeConfig()`-Funktion für Abwärtskompatibilität anpassen
    - Gibt Standard-Theme Light-Variante zurück, wenn kein User-Kontext vorhanden
    - _Anforderungen: 6.5, 7.5_

- [x] 12. Abschluss-Checkpoint – Alle Tests bestehen
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints sichern inkrementelle Validierung
- Property-Tests validieren universelle Korrektheitseigenschaften
- Unit-Tests validieren spezifische Beispiele und Grenzfälle
