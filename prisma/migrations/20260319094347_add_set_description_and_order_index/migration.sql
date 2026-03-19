/*
  Warnings:

  - You are about to alter the column `name` on the `sets` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.

*/
-- AlterTable
ALTER TABLE "set_songs" ADD COLUMN     "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sets" ADD COLUMN     "description" VARCHAR(500),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(100);
