-- AlterTable
ALTER TABLE "strophen" ADD COLUMN     "endTakt" INTEGER,
ADD COLUMN     "startTakt" INTEGER;

-- AlterTable
ALTER TABLE "zeilen" ADD COLUMN     "endTakt" INTEGER,
ADD COLUMN     "startTakt" INTEGER;
