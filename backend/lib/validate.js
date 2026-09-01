import { z } from 'zod';

const OptionalBenefitSchema = z.object({
  mode: z.enum(['manual', 'auto']),
  amount: z.number().min(0).optional()
});

export const OfferLetterInputSchema = z.object({
  candidateName: z.string().trim().min(2).max(100),
  candidateEmail: z.string().trim().email(),
  candidateContact: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number'),
  designation: z.string().trim().min(2).max(150),
  ctcLakhs: z.number().min(1).max(100),
  dateOfJoining: z.string().refine((value) => {
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !Number.isNaN(date.getTime()) && date >= today;
  }, 'Date of joining must be today or in the future'),
  postingLocation: z.enum(['client_office', 'ganit_office', 'hybrid']),
  retentionPay: OptionalBenefitSchema,
  relocationBonus: OptionalBenefitSchema
});
