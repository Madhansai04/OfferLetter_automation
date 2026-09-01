import { describe, it, expect } from 'vitest';
import { buildOfferData } from './buildOfferData.js';

const baseInput = {
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

describe('buildOfferData', () => {
  it('formats posting location into readable text', () => {
    const { values } = buildOfferData(baseInput);
    expect(values.POSTING).toBe('Ganit Office');
  });

  it('includes a reference number matching the GANIT/HR/APPT pattern', () => {
    const { values } = buildOfferData(baseInput);
    expect(values.REF_NUMBER).toMatch(/^GANIT\/HR\/APPT\/\d{4}-\d{4}$/);
  });

  it('sets both retention and relocation flags false when both are blank', () => {
    const { flags } = buildOfferData(baseInput);
    expect(flags.RETENTION_PAY_LINE).toBe(false);
    expect(flags.RELOCATION_BONUS_LINE).toBe(false);
  });

  it('sets only the retention flag true when only retention is filled', () => {
    const input = { ...baseInput, retentionPay: { mode: 'manual', amount: 100000 } };
    const { flags, values } = buildOfferData(input);
    expect(flags.RETENTION_PAY_LINE).toBe(true);
    expect(flags.RELOCATION_BONUS_LINE).toBe(false);
    expect(values.RETENTION_PAY_AMOUNT).toBe('1,00,000');
  });

  it('sets only the relocation flag true when only relocation is filled', () => {
    const input = { ...baseInput, relocationBonus: { mode: 'manual', amount: 50000 } };
    const { flags, values } = buildOfferData(input);
    expect(flags.RETENTION_PAY_LINE).toBe(false);
    expect(flags.RELOCATION_BONUS_LINE).toBe(true);
    expect(values.RELOCATION_BONUS_AMOUNT).toBe('50,000');
  });

  it('formats CTC as Indian-grouped currency', () => {
    const { values } = buildOfferData(baseInput);
    expect(values.CTC_NUM).toBe('12,50,000');
  });

  it('formats CTC in words', () => {
    const { values } = buildOfferData(baseInput);
    expect(values.CTC_WORDS).toBe('Twelve lakh fifty thousand');
  });

  it('formats date of joining as DD/MM/YYYY', () => {
    const { values } = buildOfferData(baseInput);
    expect(values.DOJ).toBe('01/01/2027');
  });

  it('includes insurance amounts for the correct tier', () => {
    const { values } = buildOfferData(baseInput);
    expect(values.MEDICAL_INSURANCE).toBe('5,00,000');
  });
});
