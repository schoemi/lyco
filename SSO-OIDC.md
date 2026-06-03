# SSO / OIDC Konfiguration

Lyco unterstützt Single Sign-On über OpenID Connect (OIDC). Als Provider ist [Authentik](https://goauthentik.io/) vorgesehen, jeder andere OIDC-kompatible Provider (Keycloak, Okta, Auth0, …) sollte aber ebenfalls funktionieren.

SSO ist **optional** — die Funktion wird nur aktiviert, wenn alle drei Umgebungsvariablen gesetzt sind. Fehlt eine davon, startet Lyco normal ohne SSO-Button.

---

## Umgebungsvariablen

| Variable          | Beschreibung                                                                 |
|-------------------|------------------------------------------------------------------------------|
| `SSO_CLIENT_ID`   | Client-ID der OIDC-Applikation beim Provider                                |
| `SSO_CLIENT_SECRET` | Client-Secret der OIDC-Applikation                                        |
| `SSO_ISSUER_URL`  | Issuer-URL des Providers (OIDC Discovery-Endpunkt ohne `/.well-known/…`)    |

**Beispiel für Authentik:**

```dotenv
SSO_CLIENT_ID=your-client-id
SSO_CLIENT_SECRET=your-client-secret
SSO_ISSUER_URL=https://auth.example.com/application/o/lyco
```

> Die Issuer-URL muss exakt mit dem `iss`-Claim in den ausgestellten ID-Tokens übereinstimmen.

---

## Authentik einrichten

### 1. Provider anlegen

1. Authentik Admin-Interface öffnen
2. **Applications → Providers → Create** → Typ: **OAuth2/OpenID Connect**
3. Einstellungen:
   - **Name:** z. B. `Lyco`
   - **Authorization flow:** wähle einen passenden Flow (z. B. `default-authorization-flow`)
   - **Client type:** `Confidential`
   - **Client ID:** wird automatisch generiert (in `.env` als `SSO_CLIENT_ID` eintragen)
   - **Client Secret:** wird automatisch generiert (in `.env` als `SSO_CLIENT_SECRET` eintragen)
   - **Redirect URIs:** `https://deine-domain.de/api/auth/callback/authentik`
     - Lokal: `http://localhost:3000/api/auth/callback/authentik`
   - **Scopes:** `openid`, `email`, `profile`

### 2. Application anlegen

1. **Applications → Applications → Create**
2. Den zuvor erstellten Provider zuweisen
3. Die **Slug-URL** des Providers ergibt die Issuer-URL:
   `https://auth.example.com/application/o/<slug>/`

### 3. Issuer-URL ermitteln

Die korrekte Issuer-URL steht im Discovery-Dokument des Providers:

```
https://auth.example.com/application/o/<slug>/.well-known/openid-configuration
```

Den Wert des `issuer`-Felds in `.env` als `SSO_ISSUER_URL` eintragen (ohne `/.well-known/…`).

---

## Andere OIDC-Provider

Das Prinzip ist dasselbe. Benötigt werden:

- Eine **Confidential OAuth2/OIDC App** mit `openid email profile` Scopes
- Redirect URI: `https://<lyco-domain>/api/auth/callback/authentik`
- Client ID, Client Secret und Issuer URL

> Der interne Provider-Name in NextAuth ist `authentik` — das hat keinen Einfluss auf andere OIDC-Provider, solange die drei Umgebungsvariablen korrekt gesetzt sind.

---

## Verhalten bei der Anmeldung

### Kontoabgleich

Beim SSO-Login gleicht Lyco die E-Mail-Adresse aus dem ID-Token mit bestehenden Konten ab:

| Situation | Verhalten |
|-----------|-----------|
| Konto existiert, Status `ACTIVE` | Login erfolgreich, SSO-Verknüpfung wird gespeichert |
| Konto existiert, Status `SUSPENDED` | Login abgelehnt, Fehlermeldung |
| Konto existiert, Status `PENDING` | Login abgelehnt, Fehlermeldung |
| Kein Konto vorhanden, Auto-Create **an** | Neues Konto wird automatisch angelegt |
| Kein Konto vorhanden, Auto-Create **aus** | Login abgelehnt, Fehlermeldung |

### Automatische Kontoerstellung

Die automatische Kontoerstellung kann im Admin-Panel unter **Einstellungen → SSO** aktiviert werden. Neu erstellte Konten erhalten die Rolle `USER` und den Status `ACTIVE`. Als Anzeigename wird (in dieser Reihenfolge) `name`, `preferred_username` oder der lokale Teil der E-Mail-Adresse verwendet.

SSO-Konten haben kein lokales Passwort und können sich nicht per Credentials anmelden.

### Kontoerknüpfung

Bestehende Lyco-Konten werden beim ersten SSO-Login automatisch mit dem SSO-Provider verknüpft (via `sub`-Claim). Der Verknüpfungsstatus ist im Benutzerprofil unter **Einstellungen → Single Sign-On** sichtbar.

---

## Sicherheitshinweise

- Lyco verwendet **PKCE + State** als OIDC Security Checks
- Der Token-Exchange hat ein Timeout von **10 Sekunden**
- Alle SSO-Anmeldeversuche (erfolgreich und fehlgeschlagen) werden im Audit-Log protokolliert
- Das `AUTH_SECRET` muss auch bei SSO gesetzt sein (JWT-Signierung der Session)

---

## Fehlersuche

| Fehlermeldung im Login | Ursache |
|------------------------|---------|
| `?error=sso-failed` | Allgemeiner OIDC-Fehler (z. B. falsche Issuer-URL oder Client-Secret) |
| `?error=sso-timeout` | Provider hat nicht innerhalb von 10 s geantwortet |
| `?error=no-account` | Kein Lyco-Konto mit dieser E-Mail, Auto-Create ist deaktiviert |
| `?error=suspended` | Konto ist gesperrt |
| `?error=pending` | Konto wartet noch auf Freischaltung |

Detaillierte Logs stehen im Lyco Audit-Log (Admin-Panel) und in den Server-Logs zur Verfügung.
