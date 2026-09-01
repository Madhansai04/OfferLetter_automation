import { describe, it, expect } from 'vitest';
import { generateDocx } from './generateDocx.js';

const sampleValues = {
  REF_NUMBER: 'GANIT/HR/APPT/2027-0001',
  OFFER_DATE: '01/09/2026',
  NAME: 'Jane Doe',
  EMAIL: 'jane@example.com',
  CONTACT: '+919876543210',
  ROLE: 'Senior Data Scientist',
  CTC_NUM: '12,50,000',
  CTC_WORDS: 'Twelve lakh fifty thousand',
  DOJ: '01/01/2027',
  POSTING: 'Ganit Office',
  BASIC_PAY_M: '31,250',
  BASIC_PAY_Y: '3,75,000',
  HRA_M: '15,625',
  HRA_Y: '1,87,500',
  CONVEYANCE_M: '15,625',
  CONVEYANCE_Y: '1,87,500',
  TOTAL_FIXED_M: '62,500',
  TOTAL_FIXED_Y: '7,50,000',
  VARIABLE_PAY: '50,000',
  PF_M: '12,500',
  PF_Y: '1,50,000',
  GRATUITY_M: '4,167',
  GRATUITY_Y: '50,000',
  TOTAL_BENEFIT_M: '16,667',
  TOTAL_BENEFIT_Y: '2,00,000',
  MEDICAL_INSURANCE: '5,00,000',
  PERSONAL_ACCIDENT_INSURANCE: '10,00,000',
  TERM_INSURANCE: '20,00,000'
};

describe('generateDocx', () => {
  it('produces a non-empty docx buffer starting with the ZIP magic bytes', async () => {
    const buffer = await generateDocx(sampleValues, { RETENTION_PAY_LINE: false, RELOCATION_BONUS_LINE: false });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 2).toString('ascii')).toBe('PK');
  });

  it('produces a docx buffer when retention and relocation lines are included', async () => {
    const values = { ...sampleValues, RETENTION_PAY_AMOUNT: '1,00,000', RELOCATION_BONUS_AMOUNT: '50,000' };
    const buffer = await generateDocx(values, { RETENTION_PAY_LINE: true, RELOCATION_BONUS_LINE: true });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
