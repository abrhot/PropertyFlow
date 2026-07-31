-- Trim the UserRole enum from 8 roles down to 4 (ORG_ADMIN, PROPERTY_MANAGER,
-- OWNER, TENANT) and add an optional cover photo to Property.
--
-- Data preservation: rows that still reference a removed role are reassigned to
-- a kept role BEFORE the enum is narrowed, so no data is lost. AbilityRule rows
-- are cleared because the API rebuilds them from code on every boot.

-- 1) Reassign existing rows off the roles that are about to be removed.
DELETE FROM "AbilityRule";

UPDATE "User" SET "role" = 'ORG_ADMIN' WHERE "role" = 'SUPER_ADMIN';
UPDATE "User" SET "role" = 'PROPERTY_MANAGER'
  WHERE "role" IN ('LEASING_AGENT', 'ACCOUNTANT', 'MAINTENANCE');

UPDATE "OrganizationInvitation" SET "role" = 'ORG_ADMIN' WHERE "role" = 'SUPER_ADMIN';
UPDATE "OrganizationInvitation" SET "role" = 'PROPERTY_MANAGER'
  WHERE "role" IN ('LEASING_AGENT', 'ACCOUNTANT', 'MAINTENANCE');

-- 2) Narrow the enum.
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ORG_ADMIN', 'PROPERTY_MANAGER', 'OWNER', 'TENANT');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TABLE "OrganizationInvitation" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TABLE "AbilityRule" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'TENANT';
COMMIT;

-- 3) Add the optional property cover photo.
ALTER TABLE "Property" ADD COLUMN "imageUrl" TEXT;
