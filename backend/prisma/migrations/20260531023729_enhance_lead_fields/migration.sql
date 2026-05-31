-- CreateEnum
CREATE TYPE "LeadRating" AS ENUM ('cold', 'warm', 'hot');

-- AlterEnum
ALTER TYPE "LeadStatus" ADD VALUE 'nurturing';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "budget" DOUBLE PRECISION,
ADD COLUMN     "campaign" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "currency" TEXT DEFAULT 'EGP',
ADD COLUMN     "expectedCloseDate" TIMESTAMP(3),
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "lostReason" TEXT,
ADD COLUMN     "rating" "LeadRating",
ADD COLUMN     "website" TEXT;

-- CreateIndex
CREATE INDEX "Lead_rating_idx" ON "Lead"("rating");
