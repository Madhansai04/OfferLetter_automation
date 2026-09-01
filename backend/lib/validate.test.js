import { describe, it, expect } from 'vitest';
import { OfferLetterInputSchema } from './validate.js';

const validInput = {
  candidateName: 'Jane Doe',
  candidateEmail: 'jane@example.com',
  candidateContact: '+919876543210',
  designation: 'Senior Data Scientist',
  ctcLakhs: 12.5,
  dateOfJoining: '2027-01-01',
  postingLocation: 'ganit_office',
  retentionPay: { mode: 'manual', amount: 0 },
  relocationBonus: { mode: 'manual', amount: 0 }
};

describe('OfferLetterInputSchema', () => {
  it('accepts a fully valid payload', () => {
    const result = OfferLetterInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects a missing candidate name', () => {
    const result = OfferLetterInputSchema.safeParse({ ...validInput, candidateName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = OfferLetterInputSchema.safeParse({ ...validInput, candidateEmail: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid phone number', () => {
    const result = OfferLetterInputSchema.safeParse({ ...validInput, candidateContact: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects a CTC below 1 lakh', () => {
    const result = OfferLetterInputSchema.safeParse({ ...validInput, ctcLakhs: 0.5 });
    expect(result.success).toBe(false);
  });

  it('rejects a CTC above 100 lakh', () => {
    const result = OfferLetterInputSchema.safeParse({ ...validInput, ctcLakhs: 150 });
    expect(result.success).toBe(false);
  });

  it('rejects a date of joining in the past', () => {
    const result = OfferLetterInputSchema.safeParse({ ...validInput, dateOfJoining: '2020-01-01' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid posting location', () => {
    const result = OfferLetterInputSchema.safeParse({ ...validInput, postingLocation: 'moon_base' });
    expect(result.success).toBe(false);
  });

  it('accepts retentionPay/relocationBonus in auto mode without an amount', () => {
    const result = OfferLetterInputSchema.safeParse({
      ...validInput,
      retentionPay: { mode: 'auto' },
      relocationBonus: { mode: 'auto' }
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown mode for retentionPay', () => {
    const result = OfferLetterInputSchema.safeParse({
      ...validInput,
      retentionPay: { mode: 'magic', amount: 100 }
    });
    expect(result.success).toBe(false);
  });
});
