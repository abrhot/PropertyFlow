-- CreateTable
CREATE TABLE "AbilityRule" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "action" JSONB NOT NULL,
    "subject" JSONB,
    "fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conditions" JSONB,
    "inverted" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AbilityRule_role_idx" ON "AbilityRule"("role");
