import { describe, it, expect } from 'vitest';
import { calculateCompensationBreakdown } from './compute.js';

describe('calculateCompensationBreakdown', () => {
  it('splits a 12.5 LPA CTC into fixed/variable/statutory components', () => {
    const result = calculateCompensationBreakdown(12.5);
    const ctcAmount = 1250000;
    const fixedPool = ctcAmount * 0.60;

    expect(result.basicPayYearly).toBeCloseTo(fixedPool * 0.50, 2);
    expect(result.basicPayMonthly).toBeCloseTo((fixedPool * 0.50) / 12, 2);
    expect(result.hraYearly).toBeCloseTo(fixedPool * 0.25, 2);
    expect(result.conveyanceYearly).toBeCloseTo(fixedPool * 0.25, 2);
    expect(result.totalFixedYearly).toBeCloseTo(fixedPool, 2);
    expect(result.variablePayYearly).toBeCloseTo(ctcAmount * 0.04, 2);
    expect(result.pfYearly).toBeCloseTo(ctcAmount * 0.12, 2);
    expect(result.gratuityYearly).toBeCloseTo(ctcAmount * 0.04, 2);
    expect(result.totalBenefitYearly).toBeCloseTo(result.pfYearly + result.gratuityYearly, 2);
  });

  it('produces monthly figures as yearly / 12 for every fixed-pay line', () => {
    const result = calculateCompensationBreakdown(24);
    expect(result.basicPayMonthly).toBeCloseTo(result.basicPayYearly / 12, 2);
    expect(result.hraMonthly).toBeCloseTo(result.hraYearly / 12, 2);
    expect(result.conveyanceMonthly).toBeCloseTo(result.conveyanceYearly / 12, 2);
    expect(result.totalFixedMonthly).toBeCloseTo(result.totalFixedYearly / 12, 2);
    expect(result.pfMonthly).toBeCloseTo(result.pfYearly / 12, 2);
    expect(result.gratuityMonthly).toBeCloseTo(result.gratuityYearly / 12, 2);
  });

  it('scales linearly with CTC', () => {
    const low = calculateCompensationBreakdown(10);
    const high = calculateCompensationBreakdown(20);
    expect(high.totalFixedYearly).toBeCloseTo(low.totalFixedYearly * 2, 2);
  });

  it('rejects a CTC below the 1 LPA minimum', () => {
    expect(() => calculateCompensationBreakdown(0.5)).toThrow(/ctc/i);
  });
});
