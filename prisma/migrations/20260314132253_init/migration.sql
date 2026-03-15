-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "Lernmethode" AS ENUM ('EMOTIONAL', 'LUECKENTEXT', 'ZEILE_FUER_ZEILE', 'RUECKWAERTS', 'SPACED_REPETITION', 'QUIZ');

-- CreateEnum
CREATE TYPE "MarkupTyp" AS ENUM ('PAUSE', 'WIEDERHOLUNG', 'ATMUNG', 'KOPFSTIMME', 'BRUSTSTIMME', 'BELT', 'FALSETT', 'TIMECODE');

-- CreateEnum
CREATE TYPE "MarkupZiel" AS ENUM ('STROPHE', 'ZEILE', 'WORT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "set_songs" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "set_songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "songs" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "kuenstler" TEXT,
    "sprache" TEXT,
    "emotionsTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strophen" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "songId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strophen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zeilen" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "uebersetzung" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "stropheId" TEXT NOT NULL,

    CONSTRAINT "zeilen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markups" (
    "id" TEXT NOT NULL,
    "typ" "MarkupTyp" NOT NULL,
    "ziel" "MarkupZiel" NOT NULL,
    "wert" TEXT,
    "timecodeMs" INTEGER,
    "wortIndex" INTEGER,
    "stropheId" TEXT,
    "zeileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "markups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "lernmethode" "Lernmethode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fortschritte" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stropheId" TEXT NOT NULL,
    "prozent" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fortschritte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notizen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stropheId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notizen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "login_attempts_email_createdAt_idx" ON "login_attempts"("email", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "set_songs_setId_songId_key" ON "set_songs"("setId", "songId");

-- CreateIndex
CREATE UNIQUE INDEX "fortschritte_userId_stropheId_key" ON "fortschritte"("userId", "stropheId");

-- CreateIndex
CREATE UNIQUE INDEX "notizen_userId_stropheId_key" ON "notizen"("userId", "stropheId");

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sets" ADD CONSTRAINT "sets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_songs" ADD CONSTRAINT "set_songs_setId_fkey" FOREIGN KEY ("setId") REFERENCES "sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_songs" ADD CONSTRAINT "set_songs_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "songs" ADD CONSTRAINT "songs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strophen" ADD CONSTRAINT "strophen_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zeilen" ADD CONSTRAINT "zeilen_stropheId_fkey" FOREIGN KEY ("stropheId") REFERENCES "strophen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markups" ADD CONSTRAINT "markups_stropheId_fkey" FOREIGN KEY ("stropheId") REFERENCES "strophen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markups" ADD CONSTRAINT "markups_zeileId_fkey" FOREIGN KEY ("zeileId") REFERENCES "zeilen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fortschritte" ADD CONSTRAINT "fortschritte_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fortschritte" ADD CONSTRAINT "fortschritte_stropheId_fkey" FOREIGN KEY ("stropheId") REFERENCES "strophen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notizen" ADD CONSTRAINT "notizen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notizen" ADD CONSTRAINT "notizen_stropheId_fkey" FOREIGN KEY ("stropheId") REFERENCES "strophen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
