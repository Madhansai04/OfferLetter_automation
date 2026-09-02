import { fillOriginalPdf } from './lib/fillOriginalPdf.js';
import { writeFile } from 'node:fs/promises';

const values = {
  REF_NUMBER: 'GANIT/HR/APPT/2026-0001',
  OFFER_DATE: '02/09/2026',
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
  TERM_INSURANCE: '20,00,000',
  RETENTION_PAY_AMOUNT: '1,00,000'
};

const flags = { RETENTION_PAY_LINE: true, RELOCATION_BONUS_LINE: false };

const outPath = 'C:\\Users\\MADHAN~1\\AppData\\Local\\Temp\\claude\\c--Users-MadhanSaiV-OneDrive---GANIT-BUSINESS-SOLUTIONS-PRIVATE-LIMITED-Documents-GitHub-OfferLetter-automation\\fe9589ac-2afb-463c-a9d1-e3b2f9c85ad9\\scratchpad\\filled-test.pdf';
const buffer = await fillOriginalPdf(values, flags);
await writeFile(outPath, buffer);
console.log('Written', buffer.length, 'bytes to', outPath);
