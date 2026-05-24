-- CreateEnum
CREATE TYPE "WashStatus" AS ENUM ('washed', 'not_washed');

-- CreateEnum
CREATE TYPE "IdentityProvider" AS ENUM ('wechat_mini', 'wechat_app', 'device', 'phone');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'merged', 'disabled');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "nickname" VARCHAR(64) NOT NULL,
    "avatarUrl" TEXT NOT NULL DEFAULT '',
    "gender" INTEGER NOT NULL DEFAULT 0,
    "hairLength" VARCHAR(16) NOT NULL DEFAULT '',
    "hairType" VARCHAR(16) NOT NULL DEFAULT '',
    "region" VARCHAR(128) NOT NULL DEFAULT '',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "mergedToUserId" UUID,
    "lastActiveAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserIdentity" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "IdentityProvider" NOT NULL,
    "providerUserId" VARCHAR(128) NOT NULL,
    "unionId" VARCHAR(128),
    "sessionKeyEncrypted" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WashRecord" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "recordDate" DATE NOT NULL,
    "status" "WashStatus" NOT NULL,
    "source" VARCHAR(32) NOT NULL DEFAULT 'app',
    "note" VARCHAR(255) NOT NULL DEFAULT '',
    "clientUpdatedAt" TIMESTAMPTZ,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WashRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStatistics" (
    "userId" UUID NOT NULL,
    "totalCheckIn" INTEGER NOT NULL DEFAULT 0,
    "monthWashed" INTEGER NOT NULL DEFAULT 0,
    "maxStreak" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "lastCalcDate" VARCHAR(10) NOT NULL DEFAULT '',
    "calculatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "UserStatistics_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AdviceLog" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "decision" VARCHAR(16) NOT NULL,
    "confidence" INTEGER NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "outputSnapshot" JSONB NOT NULL,
    "provider" VARCHAR(32) NOT NULL DEFAULT 'rule',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdviceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncBatch" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "clientId" VARCHAR(128) NOT NULL,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "recordsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "UserIdentity_userId_idx" ON "UserIdentity"("userId");

-- CreateIndex
CREATE INDEX "UserIdentity_unionId_idx" ON "UserIdentity"("unionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentity_provider_providerUserId_key" ON "UserIdentity"("provider", "providerUserId");

-- CreateIndex
CREATE INDEX "WashRecord_userId_recordDate_idx" ON "WashRecord"("userId", "recordDate" DESC);

-- CreateIndex
CREATE INDEX "WashRecord_recordDate_idx" ON "WashRecord"("recordDate");

-- CreateIndex
CREATE UNIQUE INDEX "WashRecord_userId_recordDate_key" ON "WashRecord"("userId", "recordDate");

-- CreateIndex
CREATE INDEX "AdviceLog_userId_createdAt_idx" ON "AdviceLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SyncBatch_userId_clientId_idempotencyKey_key" ON "SyncBatch"("userId", "clientId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "UserIdentity" ADD CONSTRAINT "UserIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WashRecord" ADD CONSTRAINT "WashRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStatistics" ADD CONSTRAINT "UserStatistics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdviceLog" ADD CONSTRAINT "AdviceLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncBatch" ADD CONSTRAINT "SyncBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
