import { CTC_FORMULA, INSURANCE_TIERS } from '../config/compensation.js';

/**
 * Splits a CTC (in lakhs) into the compensation components shown in
 * Annexure 2 of the offer letter: Basic Pay, HRA, Conveyance (fixed pay),
 * Variable Pay, PF Employer Contribution, and Gratuity.
 */
export function calculateCompensationBreakdown(ctcLakhs) {
  if (typeof ctcLakhs !== 'number' || ctcLakhs < 1) {
    throw new Error('CTC must be a number of at least 1 lakh');
  }

  const ctcAmount = ctcLakhs * 100000;
  const fixedPool = ctcAmount * CTC_FORMULA.fixedPayPoolPercent;

  const basicPayYearly = fixedPool * CTC_FORMULA.basicPercentOfFixed;
  const hraYearly = fixedPool * CTC_FORMULA.hraPercentOfFixed;
  const conveyanceYearly = fixedPool * CTC_FORMULA.conveyancePercentOfFixed;
  const totalFixedYearly = basicPayYearly + hraYearly + conveyanceYearly;

  const variablePayYearly = ctcAmount * CTC_FORMULA.variablePercent;
  const pfYearly = ctcAmount * CTC_FORMULA.pfPercent;
  const gratuityYearly = ctcAmount * CTC_FORMULA.gratuityPercent;
  const totalBenefitYearly = pfYearly + gratuityYearly;

  return {
    basicPayMonthly: basicPayYearly / 12,
    basicPayYearly,
    hraMonthly: hraYearly / 12,
    hraYearly,
    conveyanceMonthly: conveyanceYearly / 12,
    conveyanceYearly,
    totalFixedMonthly: totalFixedYearly / 12,
    totalFixedYearly,
    variablePayYearly,
    pfMonthly: pfYearly / 12,
    pfYearly,
    gratuityMonthly: gratuityYearly / 12,
    gratuityYearly,
    totalBenefitMonthly: totalBenefitYearly / 12,
    totalBenefitYearly
  };
}

/**
 * Returns Medical / Personal Accident / Term insurance coverage
 * based on the CTC tier threshold.
 */
export function getInsuranceCoverage(ctcLakhs) {
  return ctcLakhs >= INSURANCE_TIERS.thresholdLakhs
    ? INSURANCE_TIERS.enhanced
    : INSURANCE_TIERS.default;
}
