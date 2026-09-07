ALTER TABLE "users"
ADD COLUMN "legalAcceptedAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" TEXT,
ADD COLUMN "privacyVersion" TEXT;
