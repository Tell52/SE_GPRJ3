ALTER TYPE "RegistrationStatus" ADD VALUE 'CANCELLED';

ALTER TABLE "Registration"
    ADD COLUMN "cancelledAt" TIMESTAMPTZ(3),
    ADD COLUMN "cancelledBy" "Role";
