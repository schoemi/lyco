-- CreateEnum
CREATE TYPE "BeatMethode" AS ENUM ('AUTOMATISCH', 'MANUELL');

-- CreateTable
CREATE TABLE "beat_ergebnisse" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "bpm" INTEGER NOT NULL,
    "methode" "BeatMethode" NOT NULL,
    "konfidenz" INTEGER,
    "beatPositionenMs" INTEGER[],
    "frequenzUntergrenze" INTEGER,
    "frequenzObergrenze" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beat_ergebnisse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beat_ergebnisse_songId_key" ON "beat_ergebnisse"("songId");

-- AddForeignKey
ALTER TABLE "beat_ergebnisse" ADD CONSTRAINT "beat_ergebnisse_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
