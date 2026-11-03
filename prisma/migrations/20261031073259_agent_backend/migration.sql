/*
  Warnings:

  - You are about to drop the `ItemUpdateLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "ItemUpdateLog";

-- CreateTable
CREATE TABLE "AgentAccess" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AgentAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Command" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "actorUserId" TEXT,
    "accessId" TEXT,
    "channel" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "inputText" TEXT,
    "kind" TEXT NOT NULL,
    "undoState" TEXT NOT NULL DEFAULT 'none',
    "undoneAt" TIMESTAMP(3),
    "undoOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Command_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListEvent" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "commandId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "itemId" TEXT,
    "sectionId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clarification" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "accessId" TEXT,
    "commandId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "inputText" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clarification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AgentAccessMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AgentAccessMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentAccess_tokenId_key" ON "AgentAccess"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentAccess_tokenHash_key" ON "AgentAccess"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Command_seq_key" ON "Command"("seq");

-- CreateIndex
CREATE INDEX "Command_actorUserId_createdAt_idx" ON "Command"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Command_accessId_createdAt_idx" ON "Command"("accessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ListEvent_seq_key" ON "ListEvent"("seq");

-- CreateIndex
CREATE INDEX "ListEvent_listId_createdAt_idx" ON "ListEvent"("listId", "createdAt");

-- CreateIndex
CREATE INDEX "ListEvent_commandId_idx" ON "ListEvent"("commandId");

-- CreateIndex
CREATE INDEX "Clarification_actorUserId_createdAt_idx" ON "Clarification"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Clarification_accessId_createdAt_idx" ON "Clarification"("accessId", "createdAt");

-- CreateIndex
CREATE INDEX "_AgentAccessMembers_B_index" ON "_AgentAccessMembers"("B");

-- AddForeignKey
ALTER TABLE "AgentAccess" ADD CONSTRAINT "AgentAccess_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_accessId_fkey" FOREIGN KEY ("accessId") REFERENCES "AgentAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_undoOfId_fkey" FOREIGN KEY ("undoOfId") REFERENCES "Command"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListEvent" ADD CONSTRAINT "ListEvent_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "Command"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clarification" ADD CONSTRAINT "Clarification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clarification" ADD CONSTRAINT "Clarification_accessId_fkey" FOREIGN KEY ("accessId") REFERENCES "AgentAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clarification" ADD CONSTRAINT "Clarification_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "Command"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AgentAccessMembers" ADD CONSTRAINT "_AgentAccessMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "AgentAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AgentAccessMembers" ADD CONSTRAINT "_AgentAccessMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
