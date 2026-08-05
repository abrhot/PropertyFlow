-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MAINTENANCE_SUBMITTED', 'MAINTENANCE_APPROVED', 'MAINTENANCE_REJECTED', 'MAINTENANCE_ASSIGNED', 'MAINTENANCE_COMPLETED', 'MAINTENANCE_VERIFIED', 'PAYMENT_DUE', 'PAYMENT_RECEIVED', 'GENERAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MaintenanceRequestStatus" ADD VALUE 'APPROVED';
ALTER TYPE "MaintenanceRequestStatus" ADD VALUE 'REJECTED';
ALTER TYPE "MaintenanceRequestStatus" ADD VALUE 'AWAITING_VERIFICATION';
ALTER TYPE "MaintenanceRequestStatus" ADD VALUE 'VERIFIED';

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "completionNotes" TEXT,
ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkPath" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
