import { describe, it, expect } from 'vitest';
import {
  numberToWords,
  numberToWordsTitleCase,
  formatDateLong,
  formatDateLongHyphen,
  formatDateSlashes
} from './formatters.js';

describe('numberToWordsTitleCase', () => {
  // The offer sentence reads "(Rupees Five Lakh Only)." — title case, not
  // the lower case numberToWords produces.
  it('title cases each word', () => {
    expect(numberToWordsTitleCase(500000)).toBe('Five Lakh');
    expect(numberToWordsTitleCase(1250000)).toBe('Twelve Lakh Fifty Thousand');
  });

  it('leaves the underlying lower-case helper alone', () => {
    expect(numberToWords(500000)).toBe('five lakh');
  });
});

describe('date formats', () => {
  const doj = '2026-09-02';

  it('uses spaces on page 1', () => {
    expect(formatDateLong(doj)).toBe('02 September 2026');
  });

  it('uses hyphens in Annexure 2', () => {
    expect(formatDateLongHyphen(doj)).toBe('02-September-2026');
  });

  it('uses slashes for the letter date in the header', () => {
    expect(formatDateSlashes('2026-09-04')).toBe('04/09/2026');
  });

  it('pads single-digit days', () => {
    expect(formatDateLong('2027-01-05')).toBe('05 January 2027');
    expect(formatDateLongHyphen('2027-01-05')).toBe('05-January-2027');
  });
});
