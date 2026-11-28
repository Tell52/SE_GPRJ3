-- F-09 (Sprint 3): on-site check-in. Existing registrations read null (not checked in).
ALTER TABLE "Registration" ADD COLUMN "checkedInAt" TIMESTAMPTZ(3);
