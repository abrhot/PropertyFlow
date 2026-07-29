-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "LeaseStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rentCents" INTEGER NOT NULL,
    "depositCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lease_organizationId_idx" ON "Lease"("organizationId");

-- CreateIndex
CREATE INDEX "Lease_unitId_idx" ON "Lease"("unitId");

-- CreateIndex
CREATE INDEX "Lease_tenantId_idx" ON "Lease"("tenantId");

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
