-- CreateTable
CREATE TABLE "wiederholungen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stropheId" TEXT NOT NULL,
    "korrektZaehler" INTEGER NOT NULL DEFAULT 0,
    "faelligAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wiederholungen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wiederholungen_userId_faelligAm_idx" ON "wiederholungen"("userId", "faelligAm");

-- CreateIndex
CREATE UNIQUE INDEX "wiederholungen_userId_stropheId_key" ON "wiederholungen"("userId", "stropheId");

-- AddForeignKey
ALTER TABLE "wiederholungen" ADD CONSTRAINT "wiederholungen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiederholungen" ADD CONSTRAINT "wiederholungen_stropheId_fkey" FOREIGN KEY ("stropheId") REFERENCES "strophen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
