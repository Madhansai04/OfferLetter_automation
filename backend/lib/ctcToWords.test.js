import { describe, it, expect } from 'vitest';
import { ctcToWords } from './ctcToWords.js';

describe('ctcToWords', () => {
  it('converts zero', () => {
    expect(ctcToWords(0)).toBe('Zero');
  });

  it('converts an amount under 1 lakh', () => {
    expect(ctcToWords(50000)).toBe('Fifty thousand');
  });

  it('converts an exact lakh amount', () => {
    expect(ctcToWords(1200000)).toBe('Twelve lakh');
  });

  it('converts lakhs plus a remainder', () => {
    expect(ctcToWords(1250000)).toBe('Twelve lakh fifty thousand');
  });

  it('converts a value with hundreds in the remainder', () => {
    expect(ctcToWords(1250350)).toBe('Twelve lakh fifty thousand three hundred fifty');
  });

  it('converts a single-digit remainder correctly', () => {
    expect(ctcToWords(1000007)).toBe('Ten lakh seven');
  });
});
