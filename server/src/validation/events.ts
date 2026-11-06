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
