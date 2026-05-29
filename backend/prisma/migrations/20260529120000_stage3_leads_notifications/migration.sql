-- Stage 3: Lead management + in-app notifications
-- Apply with: npx prisma migrate deploy

-- Create enums
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'qualified', 'unqualified', 'converted');
CREATE TYPE "NotificationType" AS ENUM ('task_assigned', 'deal_assigned', 'lead_assigned', 'approval_requested', 'approval_approved', 'approval_rejected', 'invoice_overdue');

-- Lead table
CREATE TABLE "Lead" (
    "id"            TEXT         NOT NULL,
    "name"          TEXT         NOT NULL,
    "phone"         TEXT,
    "email"         TEXT,
    "mobile"        TEXT,
    "source"        TEXT,
    "status"        "LeadStatus" NOT NULL DEFAULT 'new',
    "notes"         TEXT,
    "ownerId"       TEXT,
    "createdById"   TEXT,
    "convertedAt"   TIMESTAMP(3),
    "convertedToId" TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    "deletedAt"     TIMESTAMP(3),
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- Notification table
CREATE TABLE "Notification" (
    "id"        TEXT                 NOT NULL,
    "userId"    TEXT                 NOT NULL,
    "type"      "NotificationType"   NOT NULL,
    "title"     TEXT                 NOT NULL,
    "body"      TEXT,
    "link"      TEXT,
    "read"      BOOLEAN              NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "Lead_convertedToId_key" ON "Lead"("convertedToId");

-- Indexes
CREATE INDEX "Lead_ownerId_idx"               ON "Lead"("ownerId");
CREATE INDEX "Lead_status_idx"                ON "Lead"("status");
CREATE INDEX "Lead_deletedAt_idx"             ON "Lead"("deletedAt");
CREATE INDEX "Notification_userId_read_idx"   ON "Notification"("userId", "read");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- Foreign keys
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedToId_fkey"
    FOREIGN KEY ("convertedToId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
