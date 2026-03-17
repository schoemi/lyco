# Implementierungsplan: Theming & Customization

## Übersicht

Schrittweise Implementierung des Theming-Systems: Zuerst die Kern-Infrastruktur (Typen, Paletten-Generator, Serializer), dann der Server-Service und die API-Route, anschließend die Root-Layout-Integration und zuletzt der Admin-Editor mit Vorschau. Jeder Schritt baut auf dem vorherigen auf und endet mit lauffähigem, integriertem Code.

## Aufgaben

- [x] 1. Theme-Typen und Farbpaletten-Generator erstellen
  - [x] 1.1 Theme-Konfigurationstypen definieren (`src/lib/theme/types.ts`)
    - `ThemeConfig`, `ThemeColors`, `ThemeTypography`, `KaraokeTheme` Interfaces erstellen
    - `PaletteStep`-Typ und Validierungskonstanten (max. Zeichenlänge, Schriftgrößen-Bereich) definieren
    - _Anforderungen: 1.4, 2.2, 3.2, 4.2, 5.2, 5.3, 6.2, 7.2, 8.2, 9.2, 10.2, 11.2, 12.2, 12.3_

  - [x] 1.2 Farbpaletten-Generator implementieren (`src/lib/theme/palette-generator.ts`)
    - `hexToHsl`, `hslToHex` Konvertierungsfunktionen implementieren
    - `generatePalette(baseHex)` implementieren: Stufe 500 = Basisfarbe, Stufen 50–400 heller, Stufen 600–950 dunkler
    - Hex-Validierungsfunktion (`isValidHex`) bereitstellen
    - _Anforderungen: 2.2, 2.3, 3.2_

  - [x] 1.3 Property-Test: Paletten-Generierung erzeugt 11 Stufen (`__tests__/theming/palette-generation.property.test.ts`)
    - **Eigenschaft 3: Paletten-Generierung erzeugt 11 Stufen**
    - **Validiert: Anforderungen 2.2, 3.2**

  - [x] 1.4 Property-Test: Paletten-Helligkeitsordnung (`__tests__/theming/palette-lightness.property.test.ts`)
    - **Eigenschaft 4: Paletten-Helligkeitsordnung**
    - **Validiert: Anforderung 2.3**

- [x] 2. Theme-Serializer und Validierung implementieren
  - [x] 2.1 Theme-Serializer erstellen (`src/lib/theme/serializer.ts`)
    - `getDefaultTheme()` implementieren (aktuelles Purple/Gray-Schema als Standard)
    - `serializeTheme(config)` → JSON-String
    - `deserializeTheme(json)` → ThemeConfig mit Validierung
    - `themeToCssVars(config)` → CSS-Custom-Properties-String inkl. generierter Paletten für Primary und Accent
    - `cssVarsToStyleObject(cssVars)` → React-kompatibles Style-Objekt
    - Validierungsfunktionen: Hex-Farben, App-Name-Länge (1–50), Karaoke-Schriftgrößen (14–48px), Font-Weight (100–900)
    - _Anforderungen: 1.3, 1.4, 3.4, 5.4, 6.3, 8.3, 9.4, 12.3, 15.4, 15.5, 15.6, 16.1, 16.4_

  - [x] 2.2 Property-Test: Serialisierungs-Round-Trip (`__tests__/theming/serializer-roundtrip.property.test.ts`)
    - **Eigenschaft 1: Serialisierungs-Round-Trip**
    - **Validiert: Anforderungen 15.4, 15.5, 15.6**

  - [x] 2.3 Property-Test: CSS-Variablen-Vollständigkeit (`__tests__/theming/css-vars-completeness.property.test.ts`)
    - **Eigenschaft 2: CSS-Variablen-Vollständigkeit**
    - **Validiert: Anforderungen 1.2, 3.3, 4.2, 5.2, 5.3, 6.2, 7.2, 7.3, 7.4, 8.2, 9.2, 9.3, 10.2, 10.3, 10.4, 11.2, 11.3, 12.2, 15.2, 16.1, 16.4**

  - [x] 2.4 Property-Test: Anwendungsname-Längenbegrenzung (`__tests__/theming/app-name-validation.property.test.ts`)
    - **Eigenschaft 5: Anwendungsname-Längenbegrenzung**
    - **Validiert: Anforderung 1.4**

  - [x] 2.5 Property-Test: Karaoke-Schriftgrößen-Begrenzung (`__tests__/theming/karaoke-size-validation.property.test.ts`)
    - **Eigenschaft 6: Karaoke-Schriftgrößen-Begrenzung**
    - **Validiert: Anforderung 12.3**

  - [x] 2.6 Property-Test: Kontrast Seiten-/Card-Hintergrund (`__tests__/theming/contrast-check.property.test.ts`)
    - **Eigenschaft 7: Kontrast zwischen Seiten- und Card-Hintergrund**
    - **Validiert: Anforderung 5.4**

  - [x] 2.7 Property-Test: Tab-Zustand unterscheidbar (`__tests__/theming/tab-distinction.property.test.ts`)
    - **Eigenschaft 8: Aktiver vs. inaktiver Tab-Zustand unterscheidbar**
    - **Validiert: Anforderung 6.3**

  - [x] 2.8 Property-Test: Karaoke-Zeilenfarben verschieden (`__tests__/theming/karaoke-colors-distinct.property.test.ts`)
    - **Eigenschaft 9: Karaoke-Zeilenfarben paarweise verschieden**
    - **Validiert: Anforderung 8.3**

  - [x] 2.9 Property-Test: Button-Hover/Focus-Ableitung (`__tests__/theming/button-hover-derivation.property.test.ts`)
    - **Eigenschaft 10: Button-Hover/Focus-Ableitung**
    - **Validiert: Anforderung 9.4**

- [x] 3. Checkpoint – Kern-Infrastruktur prüfen
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer konsultieren.

- [x] 4. Theme-Service und API-Route implementieren
  - [x] 4.1 Theme-Service erstellen (`src/lib/services/theme-service.ts`)
    - `getThemeConfig()` implementieren: Theme aus `SystemSetting`-Tabelle laden (Key: `theme-config`), bei Fehler/fehlendem Eintrag Standard-Theme zurückgeben
    - `saveThemeConfig(config)` implementieren: Validierung, Serialisierung, Speichern in `SystemSetting`
    - Bestehenden `system-setting-service.ts` nutzen
    - _Anforderungen: 15.1, 15.2, 15.3_

  - [x] 4.2 Theme-API-Route erstellen (`src/app/api/settings/theme/route.ts`)
    - GET-Handler: Aktuelle ThemeConfig als JSON zurückgeben
    - POST-Handler: ThemeConfig validieren und speichern (nur ADMIN-Rolle)
    - Fehlerbehandlung: 400 bei ungültigen Daten, 403 bei fehlender Berechtigung, 500 bei DB-Fehler
    - _Anforderungen: 14.4, 15.1_

  - [x] 4.3 Unit-Tests für Theme-Service und API (`__tests__/theming/theme-service.test.ts`, `__tests__/theming/theme-api.test.ts`)
    - Theme-Service: Laden/Speichern, Fallback auf Standard-Theme
    - API-Route: Berechtigungsprüfung (403), Validierungsfehler (400), Erfolgsfall
    - _Anforderungen: 15.1, 15.2, 15.3_

- [x] 5. Root-Layout-Integration für serverseitiges Theme-Rendering
  - [x] 5.1 Root-Layout anpassen (`src/app/layout.tsx`)
    - Theme-Service im Root-Layout aufrufen, CSS-Variablen als Inline-Style auf `<html>` setzen
    - Sicherstellen, dass FOUC vermieden wird (serverseitiges Rendering der CSS-Variablen)
    - _Anforderungen: 15.2, 16.1, 16.3_

- [x] 6. Checkpoint – Server-Integration prüfen
  - Sicherstellen, dass alle Tests bestehen und das Theme serverseitig korrekt geladen wird. Bei Fragen den Benutzer konsultieren.

- [x] 7. Theme-Vorschau-Komponente und Editor-Seite erstellen
  - [x] 7.1 Theme-Vorschau-Komponente erstellen (`src/components/admin/theme-preview.tsx`)
    - Isolierter Container mit CSS-Scope (style-Attribut) für Vorschau-Änderungen
    - Referenz-Komponenten rendern: Buttons (primär, sekundär, „+ Neuer Song"), Cards mit Rahmen, Tabs (aktiv/inaktiv), Progressbar, Status-Punkte, Song-Zeilen-Paar, Karaoke-Zeilen, Toggle, Eingabefelder, Score-Pill
    - Props: `themeConfig: ThemeConfig` für Live-Vorschau
    - _Anforderungen: 13.1, 13.2, 13.3, 13.4, 14.1_

  - [x] 7.2 Theming-Editor-Seite erstellen (`src/app/(admin)/admin/theming/page.tsx`)
    - Farbwähler-Sektionen: Primärfarbe, Akzentfarbe, Rahmenfarbe, Seiten-/Card-Hintergrund, Tab-Hintergründe, Control-Hintergrund, Signalfarben (Erfolg/Warnung/Fehler), Button-Farben (primär/sekundär/Neuer Song), Übersetzungs-Toggle, Karaoke-Farben
    - Typografie-Sektionen: Headline, Copy, Label (Schriftart + Gewichtung), Song-Zeilen, Übersetzungs-Zeilen (Schriftart + Gewichtung + Größe), Karaoke-Schriftgrößen
    - Anwendungsname-Textfeld (max. 50 Zeichen)
    - Vorschau-Bereich mit `ThemePreview`-Komponente, Live-Update bei Änderungen
    - Speichern-Button (POST an API), Zurücksetzen-Button (Standard-Theme laden)
    - Unsaved-Changes-Warnung beim Verlassen
    - _Anforderungen: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 9.5, 10.1, 11.1, 12.1, 13.1, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [x] 7.3 Edge-Case-Tests für Theme-System (`__tests__/theming/theme-edge-cases.test.ts`)
    - Leerer Anwendungsname → Fallback auf „Song Text Trainer"
    - Null-Akzentfarbe → Fallback auf Primärfarbe
    - Keine Theme-Konfiguration in DB → Standard-Theme
    - Ungültiges JSON in DB → Standard-Theme
    - Standard-Theme erzeugt erwartete CSS-Variablen
    - _Anforderungen: 1.3, 3.4, 15.3_

- [x] 8. Abschluss-Checkpoint – Gesamtsystem prüfen
  - Sicherstellen, dass alle Tests bestehen und der Theming-Editor korrekt funktioniert. Bei Fragen den Benutzer konsultieren.

## Hinweise

- Aufgaben mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jede Aufgabe referenziert spezifische Anforderungen zur Nachverfolgbarkeit
- Checkpoints dienen der inkrementellen Validierung
- Property-Tests validieren universelle Korrektheitseigenschaften mit `fast-check`
- Unit-Tests validieren spezifische Beispiele und Edge-Cases
