# Bugfix Requirements Document

## Einleitung

Beim Erstellen eines neuen Tags über den TagCreateDialog in der Admin Tag-Verwaltung (`/admin/vocal-tags`) tritt ein HTTP 500 Serverfehler auf. Der POST-Request an `/api/tag-definitions` schlägt fehl und der generische Catch-Block im Route-Handler gibt "Interner Serverfehler" zurück.

Die Analyse zeigt, dass die Prisma-Operationen (create, update, delete) außerhalb von Next.js korrekt funktionieren, alle 264 Vocal-Tag-Tests bestehen und die Validierung im Route-Handler korrekt arbeitet. Der Fehler tritt im `createTagDefinition`-Service auf, wenn `prisma.tagDefinition.create()` über den PrismaPg-Adapter (Prisma 7.x) aufgerufen wird.

Mögliche Ursachen:
- Der PrismaPg-Adapter wirft Fehler in einem unerwarteten Format, das nicht als `Error`-Instanz erkannt wird
- Die Verbindung über den PrismaPg-Adapter schlägt bei `create`-Operationen im Next.js-Kontext fehl
- Das `icon`-Feld (FontAwesome-Klasse mit Leerzeichen, z.B. `"fa-solid fa-microphone"`) verursacht einen unerwarteten Prisma-Fehler
- Der `findUnique`-Check vor dem `create` verbraucht die Verbindung oder verursacht einen Zustandsfehler im Adapter

## Bug-Analyse

### Aktuelles Verhalten (Defekt)

1.1 WHEN ein Admin-User im TagCreateDialog alle Pflichtfelder (tag, label, icon, color, indexNr) korrekt ausfüllt und auf "Erstellen" klickt THEN gibt der POST-Handler `/api/tag-definitions` einen HTTP 500 mit `{ error: "Interner Serverfehler" }` zurück, anstatt den Tag zu erstellen

1.2 WHEN der `createTagDefinition`-Service `prisma.tagDefinition.create()` über den PrismaPg-Adapter aufruft THEN wirft die Operation einen unerwarteten Fehler, der nicht als bekannter Fehlertyp (z.B. Duplikat-Fehler) abgefangen wird und im generischen Catch-Block landet

1.3 WHEN der Fehler im generischen Catch-Block des POST-Handlers landet THEN wird nur "Interner Serverfehler" an den Client zurückgegeben, ohne dass die tatsächliche Fehlerursache aus dem `console.error`-Log für den User sichtbar ist

### Erwartetes Verhalten (Korrekt)

2.1 WHEN ein Admin-User im TagCreateDialog alle Pflichtfelder korrekt ausfüllt und auf "Erstellen" klickt THEN SHALL der POST-Handler `/api/tag-definitions` den Tag erfolgreich in der Datenbank erstellen und HTTP 201 mit dem erstellten Tag-Objekt zurückgeben

2.2 WHEN der `createTagDefinition`-Service `prisma.tagDefinition.create()` aufruft THEN SHALL die Operation den neuen Datensatz in der `tag_definitions`-Tabelle anlegen und das erstellte Objekt mit allen Feldern (id, tag, label, icon, color, indexNr) zurückgeben

2.3 WHEN ein unerwarteter Fehler beim Erstellen auftritt THEN SHALL der POST-Handler eine aussagekräftige Fehlermeldung loggen und dem Client einen verständlichen Fehler zurückgeben

### Unverändertes Verhalten (Regressionsprävention)

3.1 WHEN ein nicht-authentifizierter User den POST-Endpoint aufruft THEN SHALL das System WEITERHIN HTTP 401 mit `{ error: "Nicht authentifiziert" }` zurückgeben

3.2 WHEN ein User mit Rolle "USER" (nicht ADMIN) den POST-Endpoint aufruft THEN SHALL das System WEITERHIN HTTP 403 mit `{ error: "Keine Berechtigung" }` zurückgeben

3.3 WHEN ein Pflichtfeld (tag, label, icon, color, indexNr) fehlt oder leer ist THEN SHALL das System WEITERHIN HTTP 400 mit einer feldspezifischen Fehlermeldung zurückgeben

3.4 WHEN ein Tag mit dem gleichen Kürzel bereits existiert THEN SHALL das System WEITERHIN HTTP 409 mit `{ error: "Ein Tag mit diesem Kürzel existiert bereits" }` zurückgeben

3.5 WHEN der GET-Endpoint `/api/tag-definitions` aufgerufen wird THEN SHALL das System WEITERHIN alle Tag-Definitionen sortiert nach indexNr zurückgeben

3.6 WHEN ein Tag über PUT `/api/tag-definitions/[id]` aktualisiert wird THEN SHALL das System WEITERHIN die Aktualisierung korrekt durchführen

3.7 WHEN ein Tag über DELETE `/api/tag-definitions/[id]` gelöscht wird THEN SHALL das System WEITERHIN die Löschung korrekt durchführen und die Anzahl betroffener Songs zurückgeben
