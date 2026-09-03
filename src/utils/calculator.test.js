import { describe, it, expect } from 'vitest';
import { calculateCTCBreakdown } from './calculator.js';

/**
 * These expected values are read directly out of "CTC Calculator Final 2.xlsm"
 * (docs/), from its stored cell values for the case:
 *   H5 Fixed Salary 4,50,000 | H6 Variable 50,000 | H7 Retention 0
 *   => H4 CTC 5,00,000
 *
 * If these ever fail, the calculator has drifted from the official workbook.
 */
describe('calculateCTCBreakdown — parity with CTC Calculator Final 2.xlsm', () => {
  const r = calculateCTCBreakdown(5, 50000, 0, 0);

  it('solves monthly Basic to the workbook value (Excel D8)', () => {
    expect(r.fixed.basic.monthly).toBeCloseTo(17334.859154929574, 6);
  });

  it('derives HRA as 50% of Basic (Excel D9)', () => {
    expect(r.fixed.hra.monthly).toBeCloseTo(8667.429577464787, 6);
  });

  it('derives Conveyance as 50% of Basic (Excel D10)', () => {
    expect(r.fixed.conveyance.monthly).toBeCloseTo(8667.429577464787, 6);
  });

  it('applies the capped PF formula (Excel D11)', () => {
    expect(r.statutory.pf.monthly).toBeCloseTo(1950, 6);
  });

  it('applies the gratuity formula including PF in its base (Excel D12)', () => {
    expect(r.statutory.gratuity.monthly).toBeCloseTo(880.2816901408449, 6);
  });

  it('reconciles all components back to the fixed salary pool (Excel E13)', () => {
    const annualAllComponents =
      r.fixed.total.yearly + r.statutory.total.yearly;
    expect(annualAllComponents).toBeCloseTo(450000, 4);
  });

  it('reconciles fixed pool + variable back to CTC (Excel E19)', () => {
    expect(r.verification.reconciles).toBe(true);
    expect(r.fixed.total.yearly + r.statutory.total.yearly + r.variable.yearly)
      .toBeCloseTo(500000, 4);
  });
});

describe('PF formula boundaries', () => {
  it('caps the 12% component at 1800 for high Basic', () => {
    const r = calculateCTCBreakdown(50, 200000, 0, 0);
    // Basic will be well above 15000/month here
    expect(r.statutory.pf.monthly).toBeCloseTo(1800 + 150, 6);
  });

  it('uses 1% (not flat 150) when Basic is below 15000/month', () => {
    // Small CTC keeps monthly Basic under 15,000
    const r = calculateCTCBreakdown(3, 0, 0, 0);
    expect(r.fixed.basic.monthly).toBeLessThan(15000);
    const expectedPf =
      Math.min(r.fixed.basic.monthly * 0.12, 1800) + r.fixed.basic.monthly * 0.01;
    expect(r.statutory.pf.monthly).toBeCloseTo(expectedPf, 6);
  });
});

describe('pool deductions', () => {
  it('subtracts variable, retention and relocation from the split pool', () => {
    const r = calculateCTCBreakdown(6, 50000, 100000, 0);
    // CTC 6,00,000 - 50,000 variable - 1,00,000 retention = 4,50,000 pool
    expect(r.verification.fixedPoolRequired).toBe(450000);
    expect(r.fixed.total.yearly + r.statutory.total.yearly).toBeCloseTo(450000, 4);
  });

  it('flags retention and relocation only when non-zero', () => {
    const none = calculateCTCBreakdown(12.5, 50000, 0, 0);
    expect(none.optional.retention.show).toBe(false);
    expect(none.optional.relocation.show).toBe(false);

    const both = calculateCTCBreakdown(12.5, 50000, 100000, 50000);
    expect(both.optional.retention.show).toBe(true);
    expect(both.optional.relocation.show).toBe(true);
  });
});

describe('insurance tiers', () => {
  const below = { medical: 300000, personalAccident: 1000000, term: 1000000 };
  const atOrAbove = { medical: 500000, personalAccident: 1000000, term: 2000000 };

  it('uses the lower tier below 10 LPA', () => {
    expect(calculateCTCBreakdown(9, 50000, 0, 0).insurance).toEqual(below);
  });

  it('uses the lower tier just under the threshold', () => {
    expect(calculateCTCBreakdown(9.99, 50000, 0, 0).insurance).toEqual(below);
  });

  it('uses the higher tier exactly at 10 LPA', () => {
    expect(calculateCTCBreakdown(10, 50000, 0, 0).insurance).toEqual(atOrAbove);
  });

  it('uses the higher tier above 10 LPA', () => {
    expect(calculateCTCBreakdown(12.5, 50000, 0, 0).insurance).toEqual(atOrAbove);
  });

  it('keeps personal accident cover identical across both tiers', () => {
    expect(calculateCTCBreakdown(5, 50000, 0, 0).insurance.personalAccident)
      .toBe(calculateCTCBreakdown(20, 50000, 0, 0).insurance.personalAccident);
  });
});

describe('Annexure 2 grouping', () => {
  it('keeps PF and gratuity out of Total Fixed Pay Component', () => {
    const r = calculateCTCBreakdown(5, 50000, 0, 0);
    const fixedOnly =
      r.fixed.basic.monthly + r.fixed.hra.monthly + r.fixed.conveyance.monthly;
    expect(r.fixed.total.monthly).toBeCloseTo(fixedOnly, 6);
    expect(r.statutory.total.monthly).toBeCloseTo(
      r.statutory.pf.monthly + r.statutory.gratuity.monthly,
      6
    );
  });
});
