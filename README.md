# Lyco – Song Text Trainer

Lyco ist eine Webanwendung zum Auswendiglernen von Songtexten. Sie kombiniert kognitive Lernmethoden mit emotionalem Lernen und Gamification, um Texte nachhaltig im Langzeitgedächtnis zu verankern.

## Features

- **Lückentext (Cloze)** – Wörter werden ausgeblendet und müssen ergänzt werden, mit einstellbarem Schwierigkeitsgrad
- **Emotionales Lernen** – Übersetzungen und persönliche Interpretationen je Strophe, unterstützt durch LLM
- **Karaoke / Lesemodus** – Vollbild-Anzeige mit Auto-Scroll und konfigurierbarer Geschwindigkeit
- **Spaced Repetition** – Intelligente Wiederholungsplanung basierend auf dem Lernfortschritt
- **Vocal Tags** – ChordPro-basiertes Markup für Gesangstechnik (Atmung, Kopfstimme, Bruststimme, Belt, Falsett)
- **Audio-Integration** – MP3-Upload, Spotify, YouTube und Apple Music mit Timecodes je Strophe
- **Song-Import** – Import aus PDF, Genius oder Tabulatur-Format
- **Sets & Sharing** – Songs in Sets organisieren und mit anderen Nutzern teilen (Lesezugriff)
- **Gamification** – Streak-Tracking, Fortschrittsbalken, Session-Zähler, Statusanzeige je Song
- **Theming** – Light/Dark Mode mit anpassbaren Themes
- **Admin-Panel** – Benutzerverwaltung, Kontostatus, Systemeinstellungen

## Tech Stack

| Bereich       | Technologie                                    |
|---------------|------------------------------------------------|
| Frontend      | Next.js 16, React 19, Tailwind CSS 4, TipTap  |
| Backend       | Next.js API Routes, Prisma 7                   |
| Datenbank     | PostgreSQL 17                                  |
| Auth          | NextAuth.js v5 (JWT, Credentials)              |
| LLM           | OpenAI API (PDF-Import, Übersetzungen, Coach)  |
| Testing       | Vitest, fast-check (Property-based Testing)    |
| Deployment    | Docker, GitHub Container Registry, Watchtower  |

## Voraussetzungen

- Node.js ≥ 25 (oder `node:current-alpine` via Docker)
- PostgreSQL 17
- npm ≥ 11

## Schnellstart (Entwicklung)

```bash
# Repository klonen
git clone https://github.com/schoemi/lyco.git
cd lyco

# Umgebungsvariablen einrichten
cp .env.example .env
# → .env anpassen (mindestens DATABASE_URL und AUTH_SECRET)

# PostgreSQL starten (z.B. via Docker)
docker compose up db -d

# Dependencies installieren
npm install

# Prisma Client generieren & Migrationen ausführen
npx prisma generate
npx prisma migrate dev

# Datenbank seeden (erstellt Admin-User)
npx prisma db seed

# Entwicklungsserver starten
npm run dev
```

Die App ist dann unter `http://localhost:3000` erreichbar.

## Deployment (Docker)

```bash
# Alles starten (App + PostgreSQL + Watchtower)
docker compose up -d
```

Die `docker-compose.yml` enthält drei Services:

- **db** – PostgreSQL 17 mit persistentem Volume
- **app** – Lyco als Next.js Standalone Build
- **watchtower** – Automatische Image-Updates aus GHCR

Prisma-Migrationen werden beim Container-Start automatisch ausgeführt.

### Eigenes Image bauen

```bash
docker build -t lyco .
APP_IMAGE=lyco docker compose up -d
```

## Umgebungsvariablen

| Variable              | Pflicht | Beschreibung                                          |
|-----------------------|---------|-------------------------------------------------------|
| `DATABASE_URL`        | ✅      | PostgreSQL Connection String                          |
| `AUTH_SECRET`         | ✅      | Secret für JWT-Signierung                             |
| `AUTH_URL`            | ✅      | Basis-URL der App (z.B. `http://localhost:3000`)      |
| `AUTH_COOKIE_SECURE`  |         | `false` für HTTP-only Umgebungen (Default: `true`)    |
| `OPENAI_API_KEY`      |         | Für PDF-Import und LLM-Features                       |
| `LLM_API_KEY`         |         | API-Key für den LLM-Provider                          |
| `LLM_API_URL`         |         | Base-URL für LLM API (Default: OpenAI)                |
| `LLM_MODEL`           |         | Modellname (Default: `gpt-4o-mini`)                   |
| `GENIUS_ENCRYPTION_KEY`|        | 32-Byte Hex-Key für Genius-Import                     |
| `SMTP_HOST`           |         | SMTP-Server für E-Mail-Versand                        |
| `SMTP_PORT`           |         | SMTP-Port (z.B. `587`)                                |
| `SMTP_USER`           |         | SMTP-Benutzername                                     |
| `SMTP_PASS`           |         | SMTP-Passwort                                         |
| `EMAIL_FROM`          |         | Absender-Adresse                                      |

Vollständiges Beispiel: [`.env.example`](.env.example)

## Scripts

```bash
npm run dev          # Entwicklungsserver
npm run build        # Production Build
npm run start        # Production Server
npm run lint         # ESLint
npm run test         # Vitest (einmalig)
npm run storybook    # Storybook auf Port 6006
```

## Projektstruktur

```
src/
├── app/
│   ├── (admin)/        # Admin-Panel (Benutzerverwaltung)
│   ├── (auth)/         # Login, Registrierung, Passwort-Reset
│   ├── (main)/         # Dashboard, Songs, Sets, Spaced Repetition
│   └── api/            # REST API Endpoints
├── components/         # React-Komponenten nach Feature gruppiert
├── lib/
│   ├── services/       # Business-Logik (Auth, E-Mail, Streak, etc.)
│   └── utils/          # Hilfsfunktionen
└── generated/          # Prisma Client (generiert)

prisma/
├── schema.prisma       # Datenmodell
├── migrations/         # SQL-Migrationen
└── seed.ts             # Datenbank-Seed

__tests__/              # Tests nach Feature gruppiert
```

## Lizenz

Privates Projekt.
