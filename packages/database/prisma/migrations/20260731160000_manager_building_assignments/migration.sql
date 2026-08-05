-- Many-to-many between property managers (User) and the buildings (Property)
-- they are assigned to run. Implicit Prisma relation table for "PropertyManagers".
CREATE TABLE "_PropertyManagers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PropertyManagers_AB_pkey" PRIMARY KEY ("A", "B")
);

CREATE INDEX "_PropertyManagers_B_index" ON "_PropertyManagers"("B");

ALTER TABLE "_PropertyManagers"
    ADD CONSTRAINT "_PropertyManagers_A_fkey" FOREIGN KEY ("A")
    REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_PropertyManagers"
    ADD CONSTRAINT "_PropertyManagers_B_fkey" FOREIGN KEY ("B")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
