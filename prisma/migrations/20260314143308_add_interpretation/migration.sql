-- CreateTable
CREATE TABLE "interpretationen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stropheId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interpretationen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interpretationen_userId_stropheId_key" ON "interpretationen"("userId", "stropheId");

-- AddForeignKey
ALTER TABLE "interpretationen" ADD CONSTRAINT "interpretationen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interpretationen" ADD CONSTRAINT "interpretationen_stropheId_fkey" FOREIGN KEY ("stropheId") REFERENCES "strophen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
