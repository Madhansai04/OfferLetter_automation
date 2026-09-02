/**
 * COMPLETE CTC BREAKDOWN WITH:
 * - Fixed/Variable/Statutory split
 * - Conditional insurance based on CTC
 * - Optional benefits (Retention/Relocation)
 *
 * PLACEHOLDER VALUES — pending real numbers from Ganit HR:
 * - CTC breakdown percentages (fixed/basic/hra/conveyance/variable/pf/gratuity)
 * - Insurance amounts for CTC < 10 LPA vs >= 10 LPA
 * Update the constants below once the real formula is provided.
 */

const CTC_FORMULA = {
  fixedPercent: 0.60,
  basicPercentOfFixed: 0.50,
  hraPercentOfFixed: 0.25,
  conveyancePercentOfFixed: 0.25,
  variablePercent: 0.04,
  pfPercent: 0.12,
  gratuityPercent: 0.04
};

const INSURANCE_TIERS = {
  thresholdLakhs: 10,
  belowThreshold: { medical: 500000, personalAccident: 1000000, term: 2000000 },
  atOrAboveThreshold: { medical: 500000, personalAccident: 1000000, term: 2000000 }
};

export function calculateCTCBreakdown(
  ctcLakhs,
  retentionLakhs = 0,
  relocationLakhs = 0
) {
  const ctc = ctcLakhs * 100000;

  // FIXED PAY
  const fixedYearly = ctc * CTC_FORMULA.fixedPercent;
  const basicYearly = fixedYearly * CTC_FORMULA.basicPercentOfFixed;
  const hraYearly = fixedYearly * CTC_FORMULA.hraPercentOfFixed;
  const conveyanceYearly = fixedYearly * CTC_FORMULA.conveyancePercentOfFixed;

  // VARIABLE
  const variableYearly = ctc * CTC_FORMULA.variablePercent;

  // STATUTORY
  const pfYearly = ctc * CTC_FORMULA.pfPercent;
  const gratuityYearly = ctc * CTC_FORMULA.gratuityPercent;

  // OPTIONAL (only if entered)
  const retentionYearly = retentionLakhs * 100000;
  const relocationYearly = relocationLakhs * 100000;

  // INSURANCE (conditional on CTC threshold)
  const insurance = ctcLakhs >= INSURANCE_TIERS.thresholdLakhs
    ? INSURANCE_TIERS.atOrAboveThreshold
    : INSURANCE_TIERS.belowThreshold;

  return {
    fixed: {
      basic: { monthly: basicYearly / 12, yearly: basicYearly },
      hra: { monthly: hraYearly / 12, yearly: hraYearly },
      conveyance: { monthly: conveyanceYearly / 12, yearly: conveyanceYearly },
      total: { monthly: fixedYearly / 12, yearly: fixedYearly }
    },
    variable: {
      monthly: variableYearly / 12,
      yearly: variableYearly
    },
    statutory: {
      pf: { monthly: pfYearly / 12, yearly: pfYearly },
      gratuity: { monthly: gratuityYearly / 12, yearly: gratuityYearly }
    },
    optional: {
      retention: {
        monthly: retentionYearly / 12,
        yearly: retentionYearly,
        show: retentionYearly > 0
      },
      relocation: {
        monthly: relocationYearly / 12,
        yearly: relocationYearly,
        show: relocationYearly > 0
      }
    },
    insurance,
    totalCTC: ctc + retentionYearly + relocationYearly,
    totalMonthly: (ctc + retentionYearly + relocationYearly) / 12
  };
}
