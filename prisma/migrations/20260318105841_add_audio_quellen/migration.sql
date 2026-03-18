-- CreateEnum
CREATE TYPE "AudioTyp" AS ENUM ('MP3', 'SPOTIFY', 'YOUTUBE');

-- CreateTable
CREATE TABLE "audio_quellen" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "typ" "AudioTyp" NOT NULL,
    "label" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_quellen_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "audio_quellen" ADD CONSTRAINT "audio_quellen_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
