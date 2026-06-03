# Requirements Document

## Introduction

Ein eingeloggter Lyco-User soll im Profil seinen Account manuell mit einem SSO-Provider (Authentik OIDC) verknüpfen können — auch wenn die E-Mail-Adresse im SSO-Account von der Lyco-E-Mail abweicht. Der Verknüpfungsflow startet per Button im Profil, führt über einen OIDC-Redirect und kehrt nach dem Callback zurück ins Profil. Der eingeloggte User wird dabei über die Session identifiziert, nicht über die E-Mail im ID-Token, um Account-Hijacking zu verhindern. Pro Lyco-Konto ist genau eine aktive SSO-Verknüpfung möglich (Upsert). Eine bestehende Verknüpfung kann der User auch wieder aufheben.

Das Datenmodell (`SsoAccount`) und der `link-status`-Endpunkt existieren bereits. Diese Anforderungen beschreiben den fehlenden manuellen Link/Unlink-Flow.

## Glossary

- **LinkingSession**: Temporäres, serverseitig gespeichertes Objekt, das den eingeloggten User (`userId`) mit einem PKCE-`state`-Parameter und dem `code_verifier` verbindet. Wird nach Gebrauch oder Ablauf gelöscht.
- **LinkInitiator**: Die Serverkomponente, die den OIDC-Redirect für den Linking-Flow auslöst (`/api/auth/sso/link/initiate`).
- **LinkCallbackHandler**: Der API-Endpunkt, der den OIDC-Callback für den Linking-Flow verarbeitet (`/api/auth/sso/link/callback`).
- **UnlinkHandler**: Der API-Endpunkt, der eine bestehende SSO-Verknüpfung aufhebt (`DELETE /api/auth/sso/unlink`).
- **SsoLinkingPanel**: Die React-Komponente im Profil, die den Verknüpfungsstatus anzeigt und die Link/Unlink-Aktionen bereitstellt.
- **SsoAccount**: Das bestehende Prisma-Modell, das eine Verknüpfung zwischen einem Lyco-User und einem SSO-Provider hält (Felder: `userId`, `provider`, `providerAccountId`).
- **State-Token**: Ein kryptographisch zufälliger Wert (≥128 Bit Entropie), der als OIDC-`state`-Parameter verwendet wird und dem `LinkingSession`-Objekt zugeordnet ist.
- **providerAccountId**: Der `sub`-Claim aus dem OIDC-ID-Token, der den User beim Provider eindeutig identifiziert.

---

## Requirements

### Requirement 1: Linking-Flow initiieren

**User Story:** Als eingeloggter Lyco-User möchte ich im Profil auf einen Button klicken können, um meinen Account mit dem SSO-Provider zu verknüpfen, damit ich mich künftig auch per SSO einloggen kann.

#### Acceptance Criteria

1. WHEN ein authentifizierter User `GET /api/auth/sso/link/initiate` aufruft, THE LinkInitiator SHALL eine neue `LinkingSession` anlegen, die einen kryptographisch zufälligen `state`-Token (≥128 Bit Entropie), den zugehörigen PKCE-`code_verifier` und die `userId` aus der aktiven Session enthält.
2. WHEN der LinkInitiator eine `LinkingSession` anlegt, THE LinkInitiator SHALL die Session serverseitig in der Datenbank mit einer Ablaufzeit von maximal 15 Minuten speichern. Falls bereits eine aktive `LinkingSession` für den User existiert, SHALL sie überschrieben werden.
3. WHEN der LinkInitiator die `LinkingSession` gespeichert hat, THE LinkInitiator SHALL den Browser per HTTP-Redirect (`302`) zur OIDC-Authorization-URL des konfigurierten Providers weiterleiten — einschließlich `state`-Parameter, PKCE-`code_challenge` (S256), `code_challenge_method=S256` und `redirect_uri` auf den `LinkCallbackHandler`.
4. IF SSO nicht konfiguriert ist (fehlende Umgebungsvariablen), THEN THE LinkInitiator SHALL mit HTTP-Status `503` und einer Fehlermeldung antworten.
5. IF der User nicht authentifiziert ist, THEN THE LinkInitiator SHALL mit HTTP-Status `401` antworten.
6. IF das Speichern der `LinkingSession` in der Datenbank fehlschlägt, THEN THE LinkInitiator SHALL mit HTTP-Status `500` antworten und keinen OIDC-Redirect auslösen.

---

### Requirement 2: Linking-Callback verarbeiten

**User Story:** Als Lyco-System möchte ich nach erfolgreichem OIDC-Redirect den eingeloggten User korrekt identifizieren und die SSO-Verknüpfung sicher speichern, ohne dass ein Angreifer einen fremden Account übernehmen kann.

#### Acceptance Criteria

1. WHEN der Provider den Browser an `GET /api/auth/sso/link/callback` zurückleitet, THE LinkCallbackHandler SHALL den empfangenen `state`-Parameter gegen eine aktive, nicht abgelaufene `LinkingSession` in der Datenbank validieren.
2. IF der `state`-Parameter in keiner aktiven `LinkingSession` vorhanden ist oder die `LinkingSession` abgelaufen ist (TTL 15 Minuten), THEN THE LinkCallbackHandler SHALL den User ins Profil (`/profile?error=sso-link-invalid-state`) weiterleiten und keine Datenbankänderung vornehmen.
3. IF der Provider einen Fehlerparameter (`error`) im Callback-Request zurückliefert, THEN THE LinkCallbackHandler SHALL die `LinkingSession` löschen und den User ins Profil (`/profile?error=sso-link-denied`) weiterleiten.
4. WHEN der `state` erfolgreich validiert wurde, THE LinkCallbackHandler SHALL den OIDC-Authorization-Code unter Verwendung des in der `LinkingSession` gespeicherten `code_verifier` gegen ein ID-Token tauschen — die `userId` stammt dabei aus der `LinkingSession`, NICHT aus dem ID-Token.
5. WHEN das ID-Token erhalten wurde, THE LinkCallbackHandler SHALL den `sub`-Claim aus dem ID-Token extrahieren. IF der `sub`-Claim fehlt oder leer ist, THEN SHALL die `LinkingSession` gelöscht und der User ins Profil (`/profile?error=sso-link-failed`) weitergeleitet werden.
6. WHEN der `sub`-Claim extrahiert wurde, THE LinkCallbackHandler SHALL in der Datenbank per Upsert einen `SsoAccount`-Eintrag anlegen oder aktualisieren: `provider = "authentik"`, `providerAccountId = sub`, `userId = userId aus LinkingSession`.
7. WHEN der Upsert erfolgreich war, THE LinkCallbackHandler SHALL die verwendete `LinkingSession` aus der Datenbank löschen und den User ins Profil (`/profile?success=sso-linked`) weiterleiten.
8. IF der `sub`-Claim bereits einem anderen Lyco-User zugeordnet ist, THEN THE LinkCallbackHandler SHALL den Upsert ablehnen, die `LinkingSession` löschen und den User ins Profil (`/profile?error=sso-already-linked`) weiterleiten.
9. IF der Token-Exchange mit dem Provider fehlschlägt oder das Timeout von 10 Sekunden überschreitet, THEN THE LinkCallbackHandler SHALL die `LinkingSession` löschen und den User ins Profil (`/profile?error=sso-link-failed`) weiterleiten.
10. WHEN ein Linking-Vorgang abgeschlossen ist (Erfolg oder jeder Fehlerpfad), THE LinkCallbackHandler SHALL den Vorgang im Audit-Log protokollieren (Aktion, userId, provider, Ergebnis/Fehlergrund).

---

### Requirement 3: SSO-Verknüpfung aufheben

**User Story:** Als eingeloggter Lyco-User möchte ich eine bestehende SSO-Verknüpfung wieder entfernen können, damit ich die Kontrolle über die Anmeldemethoden meines Kontos behalte.

#### Acceptance Criteria

1. WHEN ein authentifizierter User `DELETE /api/auth/sso/unlink` aufruft, THE UnlinkHandler SHALL alle `SsoAccount`-Einträge des Users löschen.
2. WHEN der Unlink erfolgreich war, THE UnlinkHandler SHALL mit HTTP-Status `200` und `{ unlinked: true }` antworten.
3. WHEN der Unlink erfolgreich war, THE UnlinkHandler SHALL den Vorgang im Audit-Log protokollieren (userId, Liste der entfernten Provider).
4. IF der User keinen verknüpften `SsoAccount` hat, THEN THE UnlinkHandler SHALL mit HTTP-Status `404` und einer Fehlermeldung antworten.
5. IF der User nicht authentifiziert ist, THEN THE UnlinkHandler SHALL mit HTTP-Status `401` antworten.
6. IF ein interner Datenbankfehler beim Löschen auftritt, THEN THE UnlinkHandler SHALL mit HTTP-Status `500` und einer Fehlermeldung antworten.

---

### Requirement 4: SSO-Verknüpfungsstatus im Profil anzeigen

**User Story:** Als eingeloggter Lyco-User möchte ich im Profil sehen, ob mein Account mit dem SSO-Provider verknüpft ist, und von dort aus die Verknüpfung starten oder aufheben können.

#### Acceptance Criteria

1. WHEN das SsoLinkingPanel geladen wird, THE SsoLinkingPanel SHALL den aktuellen Verknüpfungsstatus von `GET /api/auth/sso/link-status` abrufen und den Ergebniszustand (verknüpft / nicht verknüpft / Ladefehler) anzeigen.
2. WHEN der User nicht verknüpft ist und SSO konfiguriert ist, THE SsoLinkingPanel SHALL einen „Mit SSO verknüpfen"-Button anzeigen, der den Linking-Flow über `GET /api/auth/sso/link/initiate` startet.
3. WHEN der User bereits verknüpft ist, THE SsoLinkingPanel SHALL den Provider-Namen und einen „Verknüpfung aufheben"-Button anzeigen.
4. WHEN der User auf „Verknüpfung aufheben" klickt, THE SsoLinkingPanel SHALL eine Bestätigungsabfrage anzeigen, bevor `DELETE /api/auth/sso/unlink` aufgerufen wird.
5. WHEN der User die Bestätigungsabfrage abbricht, THE SsoLinkingPanel SHALL keine Änderung vornehmen und den unveränderten Zustand anzeigen.
6. WHEN der Unlink-Vorgang abgeschlossen ist, THE SsoLinkingPanel SHALL den Verknüpfungsstatus neu laden und den aktualisierten Zustand anzeigen.
7. WHEN die URL-Parameter `?success=sso-linked` oder `?error=sso-link-failed`, `?error=sso-link-timeout`, `?error=sso-link-denied`, `?error=sso-link-invalid-state` oder `?error=sso-already-linked` vorhanden sind, THE SsoLinkingPanel SHALL die entsprechende Meldung anzeigen, den Status neu laden und die URL-Parameter anschließend aus der Adresszeile entfernen.
8. WHERE SSO nicht konfiguriert ist, THE SsoLinkingPanel SHALL keinen Link-Button anzeigen, aber einen Hinweis, dass SSO vom Administrator nicht aktiviert wurde.
9. IF ein Netzwerk- oder Serverfehler beim Laden des Status oder beim Unlink auftritt, THEN THE SsoLinkingPanel SHALL eine Fehlermeldung anzeigen, die den fehlgeschlagenen Vorgang benennt, und eine Möglichkeit zum erneuten Versuch bereitstellen.

---

### Requirement 5: Sicherheit des Linking-Flows

**User Story:** Als Lyco-System möchte ich sicherstellen, dass der Linking-Flow nicht für Account-Hijacking missbraucht werden kann, auch wenn ein Angreifer den OIDC-Callback manipuliert.

#### Acceptance Criteria

1. THE LinkCallbackHandler SHALL die `userId` ausschließlich aus der serverseitig gespeicherten `LinkingSession` beziehen — niemals aus dem ID-Token, URL-Parametern oder Request-Body.
2. THE LinkInitiator SHALL für jeden Linking-Vorgang einen neuen, einmaligen `state`-Token mit mindestens 128 Bit kryptographischer Zufälligkeit generieren — bereits verwendete oder abgelaufene Tokens SHALL nicht erneut akzeptiert werden.
3. WHEN eine `LinkingSession` verwendet oder abgelaufen ist, THE LinkCallbackHandler SHALL die `LinkingSession` aus der Datenbank entfernen (Einmal-Verwendung).
4. THE LinkInitiator SHALL PKCE mit `code_challenge_method=S256` für alle Linking-Requests verwenden, und den `code_verifier` in der `LinkingSession` serverseitig speichern.
5. WHEN der `code_verifier` aus der `LinkingSession` beim Token-Exchange an den Provider gesendet wird, THE LinkCallbackHandler SHALL ausschließlich den gespeicherten `code_verifier` verwenden — niemals einen aus dem Request stammenden Wert.
6. IF das ID-Token vom Provider nicht erfolgreich gegen das JWKS des Providers verifiziert werden kann, THEN THE LinkCallbackHandler SHALL den Vorgang abbrechen, die `LinkingSession` löschen, den User ins Profil (`/profile?error=sso-link-failed`) weiterleiten und den Fehler im Audit-Log protokollieren.
7. IF ein `state`-Token mehr als einmal eingelöst wird, THEN THE LinkCallbackHandler SHALL den zweiten Versuch ablehnen und den Vorgang im Audit-Log protokollieren.
