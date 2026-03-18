-- AlterTable
ALTER TABLE "users" ADD COLUMN     "selectedThemeId" TEXT,
ADD COLUMN     "themeVariant" TEXT DEFAULT 'light';

-- CreateTable
CREATE TABLE "themes" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "lightConfig" TEXT NOT NULL,
    "darkConfig" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "themes_name_key" ON "themes"("name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_selectedThemeId_fkey" FOREIGN KEY ("selectedThemeId") REFERENCES "themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
