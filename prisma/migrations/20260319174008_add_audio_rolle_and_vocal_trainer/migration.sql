-- CreateEnum
CREATE TYPE "AudioRolle" AS ENUM ('STANDARD', 'INSTRUMENTAL', 'REFERENZ_VOKAL');

-- AlterEnum
ALTER TYPE "Lernmethode" ADD VALUE 'VOCAL_TRAINER';

-- AlterTable
ALTER TABLE "audio_quellen" ADD COLUMN     "rolle" "AudioRolle" NOT NULL DEFAULT 'STANDARD';
