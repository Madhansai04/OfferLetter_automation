import { describe, it, expect } from 'vitest';
import {
  CTC_FORMULA,
  INSURANCE_TIERS,
  calculateRetentionPay,
  calculateRelocationBonus
} from './compensation.js';

describe('compensation config', () => {
  it('exposes fixed pay, variable, PF, and gratuity percentages', () => {
    expect(CTC_FORMULA.fixedPayPoolPercent).toBe(0.60);
    expect(CTC_FORMULA.basicPercentOfFixed).toBe(0.50);
    expect(CTC_FORMULA.hraPercentOfFixed).toBe(0.25);
    expect(CTC_FORMULA.conveyancePercentOfFixed).toBe(0.25);
    expect(CTC_FORMULA.variablePercent).toBe(0.04);
    expect(CTC_FORMULA.pfPercent).toBe(0.12);
    expect(CTC_FORMULA.gratuityPercent).toBe(0.04);
  });

  it('exposes default and enhanced insurance tiers with a 10 LPA threshold', () => {
    expect(INSURANCE_TIERS.thresholdLakhs).toBe(10);
    expect(INSURANCE_TIERS.default).toEqual({
      medical: 300000,
      personalAccident: 500000,
      term: 1000000
    });
    expect(INSURANCE_TIERS.enhanced).toEqual({
      medical: 500000,
      personalAccident: 1000000,
      term: 2000000
    });
  });

  it('calculateRetentionPay throws until a formula is configured', () => {
    expect(() => calculateRetentionPay(12.5)).toThrow(/formula not yet configured/i);
  });

  it('calculateRelocationBonus throws until a formula is configured', () => {
    expect(() => calculateRelocationBonus(12.5)).toThrow(/formula not yet configured/i);
  });
});
