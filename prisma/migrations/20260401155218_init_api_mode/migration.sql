-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "chatgptAccountId" TEXT NOT NULL,
    "oaiDeviceId" TEXT,
    "description" TEXT,
    "teamUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastLoginCheckAt" DATETIME,
    "loginError" TEXT,
    "tags" TEXT,
    "autoInvite" BOOLEAN NOT NULL DEFAULT false,
    "inviteIntervalMs" INTEGER NOT NULL DEFAULT 3000,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncAt" DATETIME,
    "lastInviteAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "teamId" TEXT NOT NULL,
    "invitedAt" DATETIME,
    "joinedAt" DATETIME,
    "failReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Member_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InviteJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "emails" TEXT NOT NULL,
    "logs" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InviteJob_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Team_status_idx" ON "Team"("status");

-- CreateIndex
CREATE INDEX "Team_createdAt_idx" ON "Team"("createdAt");

-- CreateIndex
CREATE INDEX "Member_teamId_idx" ON "Member"("teamId");

-- CreateIndex
CREATE INDEX "Member_status_idx" ON "Member"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Member_teamId_email_key" ON "Member"("teamId", "email");

-- CreateIndex
CREATE INDEX "InviteJob_teamId_idx" ON "InviteJob"("teamId");

-- CreateIndex
CREATE INDEX "InviteJob_status_idx" ON "InviteJob"("status");

-- CreateIndex
CREATE INDEX "InviteJob_createdAt_idx" ON "InviteJob"("createdAt");
