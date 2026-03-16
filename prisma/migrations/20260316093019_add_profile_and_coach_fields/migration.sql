-- CreateEnum
CREATE TYPE "Geschlecht" AS ENUM ('MAENNLICH', 'WEIBLICH', 'DIVERS');

-- CreateEnum
CREATE TYPE "Erfahrungslevel" AS ENUM ('ANFAENGER', 'FORTGESCHRITTEN', 'ERFAHREN', 'PROFI');

-- AlterTable
ALTER TABLE "songs" ADD COLUMN     "coachTipp" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "alter" INTEGER,
ADD COLUMN     "erfahrungslevel" "Erfahrungslevel",
ADD COLUMN     "genre" TEXT,
ADD COLUMN     "geschlecht" "Geschlecht",
ADD COLUMN     "stimmlage" TEXT;
