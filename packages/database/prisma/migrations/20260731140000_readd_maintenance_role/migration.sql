-- Re-introduce the MAINTENANCE role (the field maintenance division). This is a
-- purely additive enum change, so it is safe on existing data.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MAINTENANCE';
