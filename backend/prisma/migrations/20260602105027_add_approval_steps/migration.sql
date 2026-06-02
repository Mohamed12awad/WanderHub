-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "approverRoles" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "actedById" TEXT,
    "actedAt" TIMESTAMP(3),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovalStep_entityType_entityId_idx" ON "ApprovalStep"("entityType", "entityId");
