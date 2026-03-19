-- CreateTable
CREATE TABLE "song_freigaben" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "eigentuemerId" TEXT NOT NULL,
    "empfaengerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_freigaben_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "set_freigaben" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "eigentuemerId" TEXT NOT NULL,
    "empfaengerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "set_freigaben_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "song_freigaben_songId_empfaengerId_key" ON "song_freigaben"("songId", "empfaengerId");

-- CreateIndex
CREATE UNIQUE INDEX "set_freigaben_setId_empfaengerId_key" ON "set_freigaben"("setId", "empfaengerId");

-- AddForeignKey
ALTER TABLE "song_freigaben" ADD CONSTRAINT "song_freigaben_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_freigaben" ADD CONSTRAINT "song_freigaben_eigentuemerId_fkey" FOREIGN KEY ("eigentuemerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_freigaben" ADD CONSTRAINT "song_freigaben_empfaengerId_fkey" FOREIGN KEY ("empfaengerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_freigaben" ADD CONSTRAINT "set_freigaben_setId_fkey" FOREIGN KEY ("setId") REFERENCES "sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_freigaben" ADD CONSTRAINT "set_freigaben_eigentuemerId_fkey" FOREIGN KEY ("eigentuemerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_freigaben" ADD CONSTRAINT "set_freigaben_empfaengerId_fkey" FOREIGN KEY ("empfaengerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
