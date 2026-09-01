import { describe, it, expect } from 'vitest';
import { calculateCompensationBreakdown, getInsuranceCoverage, generateReferenceNumber, resolveOptionalBenefit } from './compute.js';

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

describe('getInsuranceCoverage', () => {
  it('returns the default tier just below the threshold', () => {
    const result = getInsuranceCoverage(9.99);
    expect(result).toEqual({ medical: 300000, personalAccident: 500000, term: 1000000 });
  });

  it('returns the enhanced tier exactly at the threshold', () => {
    const result = getInsuranceCoverage(10);
    expect(result).toEqual({ medical: 500000, personalAccident: 1000000, term: 2000000 });
  });

  it('returns the enhanced tier above the threshold', () => {
    const result = getInsuranceCoverage(10.01);
    expect(result).toEqual({ medical: 500000, personalAccident: 1000000, term: 2000000 });
  });
});

describe('generateReferenceNumber', () => {
  it('formats as GANIT/HR/APPT/{year}-{4-digit sequence}', () => {
    const ref = generateReferenceNumber();
    const year = new Date().getFullYear();
    expect(ref).toMatch(new RegExp(`^GANIT/HR/APPT/${year}-\\d{4}$`));
  });

  it('increments the sequence on each call within the same run', () => {
    const first = generateReferenceNumber();
    const second = generateReferenceNumber();
    const firstSeq = parseInt(first.split('-')[1], 10);
    const secondSeq = parseInt(second.split('-')[1], 10);
    expect(secondSeq).toBe(firstSeq + 1);
  });
});

describe('resolveOptionalBenefit', () => {
  it('returns null when mode is manual and amount is blank', () => {
    const result = resolveOptionalBenefit({ mode: 'manual', manualAmount: null, ctcLakhs: 12, formulaFn: () => 0 });
    expect(result).toBeNull();
  });

  it('returns null when mode is manual and amount is zero', () => {
    const result = resolveOptionalBenefit({ mode: 'manual', manualAmount: 0, ctcLakhs: 12, formulaFn: () => 0 });
    expect(result).toBeNull();
  });

  it('returns the manual amount when mode is manual and amount is positive', () => {
    const result = resolveOptionalBenefit({ mode: 'manual', manualAmount: 100000, ctcLakhs: 12, formulaFn: () => 0 });
    expect(result).toBe(100000);
  });

  it('calls formulaFn and returns its result when mode is auto', () => {
    const result = resolveOptionalBenefit({ mode: 'auto', manualAmount: null, ctcLakhs: 12, formulaFn: () => 42000 });
    expect(result).toBe(42000);
  });

  it('propagates the formula error when mode is auto and formulaFn throws', () => {
    const throwing = () => { throw new Error('formula not yet configured'); };
    expect(() => resolveOptionalBenefit({ mode: 'auto', manualAmount: null, ctcLakhs: 12, formulaFn: throwing })).toThrow(/formula not yet configured/i);
  });
});
