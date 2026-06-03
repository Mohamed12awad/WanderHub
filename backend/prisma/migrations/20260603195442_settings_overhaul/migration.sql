-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notificationPreferences" JSONB;

-- AlterTable
ALTER TABLE "WorkspaceConfig" ADD COLUMN     "invoiceDefaults" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "passwordPolicy" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "pipelineStages" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "TaxRate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmtpConfig" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 587,
    "user" TEXT NOT NULL,
    "encPass" TEXT NOT NULL,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmtpConfig_pkey" PRIMARY KEY ("id")
);
