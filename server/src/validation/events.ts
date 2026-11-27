import { z } from 'zod';

export const eventInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().max(2000).optional(),
  location: z.string().trim().min(1).max(200),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  capacity: z.number().int().min(1).max(1000),
}).superRefine((input, ctx) => {
  if (Date.parse(input.startsAt) <= Date.now()) ctx.addIssue({ code: 'custom', path: ['startsAt'], message: 'Start must be in the future.' });
  if (Date.parse(input.endsAt) <= Date.parse(input.startsAt)) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'End must be after start.' });
});

export type EventInput = z.infer<typeof eventInputSchema>;

/**
 * PATCH /api/events/:id (F-07, #52): a nonempty subset of the editable fields. Unknown fields are rejected.
 * Field limits are the BR-01 limits used for creation; the merged schedule is checked in the service.
 */
export const eventPatchSchema = z.strictObject({
  registrationDeadline: z.iso.datetime({ offset: true }).nullable(),
  title: z.string().trim().min(3).max(120),
  description: z.string().max(2000),
  location: z.string().trim().min(1).max(200),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  capacity: z.number().int().min(1).max(1000),
}).partial().refine((input) => Object.keys(input).length > 0, { message: 'Send at least one field to change.' });

export type EventPatch = z.infer<typeof eventPatchSchema>;
