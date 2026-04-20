-- AlterTable
ALTER TABLE "beat_ergebnisse" ADD COLUMN     "taktNenner" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "taktZaehler" INTEGER NOT NULL DEFAULT 4;
