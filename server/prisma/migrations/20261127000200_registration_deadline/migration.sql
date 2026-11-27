ALTER TABLE "Event"
    ADD COLUMN "registrationDeadline" TIMESTAMPTZ(3),
    ADD CONSTRAINT "event_deadline_by_start" CHECK ("registrationDeadline" <= "startsAt");
