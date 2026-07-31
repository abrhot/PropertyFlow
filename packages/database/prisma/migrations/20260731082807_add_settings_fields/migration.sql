-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "websiteUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyAnnouncements" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyByEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyMaintenance" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyMessages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyPayments" BOOLEAN NOT NULL DEFAULT true;
