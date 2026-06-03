-- CreateTable
CREATE TABLE "sso_linking_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sso_linking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sso_linking_sessions_userId_key" ON "sso_linking_sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sso_linking_sessions_state_key" ON "sso_linking_sessions"("state");

-- CreateIndex
CREATE INDEX "sso_linking_sessions_state_idx" ON "sso_linking_sessions"("state");

-- CreateIndex
CREATE INDEX "sso_linking_sessions_expiresAt_idx" ON "sso_linking_sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "sso_linking_sessions" ADD CONSTRAINT "sso_linking_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
