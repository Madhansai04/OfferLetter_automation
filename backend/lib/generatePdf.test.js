import { describe, it, expect } from 'vitest';
import { generatePdf } from './generatePdf.js';

describe('generatePdf', () => {
  it('produces a non-empty PDF buffer starting with the PDF magic bytes', async () => {
    const html = '<html><body><h1>Test Offer Letter</h1></body></html>';
    const buffer = await generatePdf(html);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString('ascii')).toBe('%PDF');
  }, 30000);
});
