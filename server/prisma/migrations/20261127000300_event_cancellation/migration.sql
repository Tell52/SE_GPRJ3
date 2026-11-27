-- F-08 (#54): organizers cancel a published event. Existing events keep their status.
-- Registrations reuse the F-05 columns: status CANCELLED, cancelledBy ORGANIZER, cancelledAt.
ALTER TYPE "EventStatus" ADD VALUE 'CANCELLED';
