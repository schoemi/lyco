-- AlterTable
ALTER TABLE "tag_definitions" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "tag_kategorien" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tag_kategorien_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tag_kategorien_slug_key" ON "tag_kategorien"("slug");

-- AddForeignKey
ALTER TABLE "tag_definitions" ADD CONSTRAINT "tag_definitions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "tag_kategorien"("id") ON DELETE SET NULL ON UPDATE CASCADE;
