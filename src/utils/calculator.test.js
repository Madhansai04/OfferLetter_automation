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
  const r = calculateCTCBreakdown(450000, 50000, 0, 0);

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
    const r = calculateCTCBreakdown(4800000, 200000, 0, 0);
    // Basic will be well above 15000/month here
    expect(r.statutory.pf.monthly).toBeCloseTo(1800 + 150, 6);
  });

  it('uses 1% (not flat 150) when Basic is below 15000/month', () => {
    // Small fixed pay keeps monthly Basic under 15,000
    const r = calculateCTCBreakdown(300000, 0, 0, 0);
    expect(r.fixed.basic.monthly).toBeLessThan(15000);
    const expectedPf =
      Math.min(r.fixed.basic.monthly * 0.12, 1800) + r.fixed.basic.monthly * 0.01;
    expect(r.statutory.pf.monthly).toBeCloseTo(expectedPf, 6);
  });
});

describe('CTC derived from fixed pay', () => {
  it('adds variable and retention to the entered fixed pay', () => {
    const r = calculateCTCBreakdown(450000, 50000, 100000, 0);
    // 4,50,000 fixed + 50,000 variable + 1,00,000 retention = 6,00,000 CTC
    expect(r.verification.fixedPoolRequired).toBe(450000);
    expect(r.totalCTC).toBe(600000);
    expect(r.fixed.total.yearly + r.statutory.total.yearly).toBeCloseTo(450000, 4);
  });

  it('reports the fixed pay it was given', () => {
    const r = calculateCTCBreakdown(450000, 50000, 0, 0);
    expect(r.fixedPay.yearly).toBe(450000);
    expect(r.fixedPay.monthly).toBeCloseTo(37500, 6);
  });

  it('does NOT subtract relocation — it is paid over and above the CTC', () => {
    const withoutRelocation = calculateCTCBreakdown(450000, 50000, 100000, 0);
    const withRelocation = calculateCTCBreakdown(450000, 50000, 100000, 200000);

    // Adding a relocation bonus must not shrink the pool or change any
    // salary component.
    expect(withRelocation.verification.fixedPoolRequired).toBe(450000);
    expect(withRelocation.fixed.basic.monthly).toBeCloseTo(withoutRelocation.fixed.basic.monthly, 6);
    expect(withRelocation.fixed.total.yearly).toBeCloseTo(withoutRelocation.fixed.total.yearly, 6);
    expect(withRelocation.statutory.total.yearly).toBeCloseTo(withoutRelocation.statutory.total.yearly, 6);

    // It is still reported for the letter, just outside the CTC.
    expect(withRelocation.optional.relocation.yearly).toBe(200000);
    expect(withRelocation.optional.relocation.show).toBe(true);
  });

  it('relocation changes nothing except its own line, at any amount', () => {
    const none = calculateCTCBreakdown(1100000, 50000, 50000, 0);
    const large = calculateCTCBreakdown(1100000, 50000, 50000, 500000);

    // Every number the letter prints, other than the relocation line itself,
    // must be identical whether or not a relocation bonus is offered.
    const unaffected = (r) => ({
      basicMonthly: r.fixed.basic.monthly,
      basicYearly: r.fixed.basic.yearly,
      hraMonthly: r.fixed.hra.monthly,
      hraYearly: r.fixed.hra.yearly,
      conveyanceMonthly: r.fixed.conveyance.monthly,
      conveyanceYearly: r.fixed.conveyance.yearly,
      totalFixedMonthly: r.fixed.total.monthly,
      totalFixedYearly: r.fixed.total.yearly,
      pfMonthly: r.statutory.pf.monthly,
      pfYearly: r.statutory.pf.yearly,
      gratuityMonthly: r.statutory.gratuity.monthly,
      gratuityYearly: r.statutory.gratuity.yearly,
      totalBenefitMonthly: r.statutory.total.monthly,
      totalBenefitYearly: r.statutory.total.yearly,
      variableYearly: r.variable.yearly,
      retentionYearly: r.optional.retention.yearly,
      totalCTC: r.totalCTC,
      totalMonthly: r.totalMonthly,
      pool: r.verification.fixedPoolRequired
    });

    expect(unaffected(large)).toEqual(unaffected(none));
    expect(large.optional.relocation.yearly).toBe(500000);
  });

  it('never folds relocation into the CTC total', () => {
    const r = calculateCTCBreakdown(1100000, 50000, 50000, 500000);
    // The CTC is fixed + variable + retention, with relocation excluded.
    expect(r.totalCTC).toBe(1200000);
    expect(r.totalMonthly).toBeCloseTo(100000, 6);
  });

  it('reconciles components + variable + retention to CTC, relocation aside', () => {
    const r = calculateCTCBreakdown(450000, 50000, 100000, 200000);
    expect(r.verification.reconciles).toBe(true);
    expect(r.fixed.total.yearly + r.statutory.total.yearly + r.variable.yearly + r.optional.retention.yearly)
      .toBeCloseTo(600000, 4);
  });

  it('flags retention and relocation only when non-zero', () => {
    const none = calculateCTCBreakdown(1200000, 50000, 0, 0);
    expect(none.optional.retention.show).toBe(false);
    expect(none.optional.relocation.show).toBe(false);

    const both = calculateCTCBreakdown(1100000, 50000, 100000, 50000);
    expect(both.optional.retention.show).toBe(true);
    expect(both.optional.relocation.show).toBe(true);
  });

  it('never folds the joining bonus into the CTC total', () => {
    const r = calculateCTCBreakdown(1100000, 50000, 50000, 0, 300000);
    // The CTC is fixed + variable + retention; the joining bonus is excluded.
    expect(r.totalCTC).toBe(1200000);
    expect(r.totalMonthly).toBeCloseTo(100000, 6);
    expect(r.optional.joiningBonus.yearly).toBe(300000);
  });

  it('joining bonus changes nothing except its own line, at any amount', () => {
    const without = calculateCTCBreakdown(450000, 50000, 100000, 0, 0);
    const with_ = calculateCTCBreakdown(450000, 50000, 100000, 0, 250000);

    // Every number the letter prints, other than the joining bonus line
    // itself, must be identical whether or not a joining bonus is offered.
    expect(with_.totalCTC).toBe(without.totalCTC);
    expect(with_.verification.fixedPoolRequired).toBe(450000);
    expect(with_.fixed.basic.monthly).toBeCloseTo(without.fixed.basic.monthly, 6);
    expect(with_.fixed.total.yearly).toBeCloseTo(without.fixed.total.yearly, 6);
    expect(with_.statutory.total.yearly).toBeCloseTo(without.statutory.total.yearly, 6);
    expect(with_.insurance).toEqual(without.insurance);
    expect(with_.verification.reconciles).toBe(true);
  });

  it('flags the joining bonus only when non-zero', () => {
    expect(calculateCTCBreakdown(1200000, 50000, 0, 0, 0).optional.joiningBonus.show)
      .toBe(false);
    expect(calculateCTCBreakdown(1200000, 50000, 0, 0, 75000).optional.joiningBonus.show)
      .toBe(true);
  });

  it('keeps relocation and joining bonus independent of each other', () => {
    const r = calculateCTCBreakdown(900000, 50000, 75000, 40000, 60000);
    expect(r.totalCTC).toBe(1025000);
    expect(r.optional.relocation.yearly).toBe(40000);
    expect(r.optional.joiningBonus.yearly).toBe(60000);
  });

  it('defaults the joining bonus to zero when the argument is omitted', () => {
    const r = calculateCTCBreakdown(450000, 50000);
    expect(r.optional.joiningBonus.yearly).toBe(0);
    expect(r.optional.joiningBonus.show).toBe(false);
  });
});

describe('insurance tiers', () => {
  const below = { medical: 300000, personalAccident: 1000000, term: 1000000 };
  const atOrAbove = { medical: 500000, personalAccident: 1000000, term: 2000000 };

  it('uses the lower tier below 10 LPA', () => {
    expect(calculateCTCBreakdown(850000, 50000, 0, 0).insurance).toEqual(below);
  });

  it('uses the lower tier just under the threshold', () => {
    expect(calculateCTCBreakdown(949000, 50000, 0, 0).insurance).toEqual(below);
  });

  it('uses the higher tier exactly at 10 LPA', () => {
    expect(calculateCTCBreakdown(950000, 50000, 0, 0).insurance).toEqual(atOrAbove);
  });

  it('uses the higher tier above 10 LPA', () => {
    expect(calculateCTCBreakdown(1200000, 50000, 0, 0).insurance).toEqual(atOrAbove);
  });

  it('keeps personal accident cover identical across both tiers', () => {
    expect(calculateCTCBreakdown(450000, 50000, 0, 0).insurance.personalAccident)
      .toBe(calculateCTCBreakdown(1950000, 50000, 0, 0).insurance.personalAccident);
  });
});

describe('Annexure 2 grouping', () => {
  it('keeps PF and gratuity out of Total Fixed Pay Component', () => {
    const r = calculateCTCBreakdown(450000, 50000, 0, 0);
    const fixedOnly =
      r.fixed.basic.monthly + r.fixed.hra.monthly + r.fixed.conveyance.monthly;
    expect(r.fixed.total.monthly).toBeCloseTo(fixedOnly, 6);
    expect(r.statutory.total.monthly).toBeCloseTo(
      r.statutory.pf.monthly + r.statutory.gratuity.monthly,
      6
    );
  });
});
