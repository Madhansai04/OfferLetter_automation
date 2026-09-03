/**
 * CTC BREAKDOWN — ported from "CTC Calculator Final 2.xlsm"
 *
 * Verified against the workbook's own stored values (CTC 5,00,000 /
 * Variable 50,000 / Retention 0) to full floating-point precision:
 *
 *   Basic monthly     17,334.859154929574
 *   HRA monthly        8,667.429577464787   = Basic * 50%
 *   Conveyance monthly 8,667.429577464787   = Basic * 50%
 *   PF monthly         1,950
 *   Gratuity monthly     880.2816901408449
 *   Total fixed annual 4,50,000
 *
 * Excel cell references are noted against each formula.
 */

// The pool that gets split into salary components.
// Workbook: H4 = SUM(H5:H7) => CTC = FixedSalary + Variable + Retention,
// i.e. the split pool is CTC minus the "other components".
//
// Relocation bonus is deliberately excluded: it is paid over and above the
// CTC rather than out of it, so it does not reduce what is available to
// split across Basic/HRA/Conveyance/PF/Gratuity.
function fixedSalaryPool(ctc, variable, retention) {
  return ctc - variable - retention;
}

// Excel D11: IF(($D$8*12%)>=1800,1800,$D$8*12%) + IF($D$8>=15000,150,($D$8*1%))
function pfMonthlyFromBasic(basicMonthly) {
  const capped = Math.min(basicMonthly * 0.12, 1800);
  const additional = basicMonthly >= 15000 ? 150 : basicMonthly * 0.01;
  return capped + additional;
}

// Excel D12: (SUM(D8:D10)+D11)*0.5*15/26/12
// i.e. (Basic + HRA + Conveyance + PF) * 0.5 * 15 / 26 / 12
function gratuityMonthlyFrom(basicMonthly, hraMonthly, conveyanceMonthly, pfMonthly) {
  return (basicMonthly + hraMonthly + conveyanceMonthly + pfMonthly) * 0.5 * 15 / 26 / 12;
}

// Builds every component from a candidate monthly Basic.
function componentsFromBasic(basicMonthly) {
  const hraMonthly = basicMonthly * 0.5;          // Excel D9  = D8*50%
  const conveyanceMonthly = basicMonthly * 0.5;   // Excel D10 = D8*50%
  const pfMonthly = pfMonthlyFromBasic(basicMonthly);
  const gratuityMonthly = gratuityMonthlyFrom(basicMonthly, hraMonthly, conveyanceMonthly, pfMonthly);

  // Excel E13 = SUM(E8:E10)+SUM(E11:E12), where each E = its D * 12
  const totalAnnual = (basicMonthly + hraMonthly + conveyanceMonthly + pfMonthly + gratuityMonthly) * 12;

  return { basicMonthly, hraMonthly, conveyanceMonthly, pfMonthly, gratuityMonthly, totalAnnual };
}

/**
 * Excel's Goal Seek: solve for monthly Basic (D8) such that the annual
 * total of all fixed components (E13) equals the fixed salary pool.
 *
 * Bisection is used rather than the workbook's nudge-and-retry loop
 * because the total is monotonically increasing in Basic, so bisection
 * converges reliably to full double precision.
 */
function solveBasicMonthly(fixedPool) {
  if (fixedPool <= 0) return 0;

  let low = 0;
  let high = fixedPool; // a monthly Basic this large always overshoots

  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    if (componentsFromBasic(mid).totalAnnual < fixedPool) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

// Insurance tiers, confirmed by Ganit HR.
// Only medical and term differ between tiers; personal accident is the
// same 10,00,000 either side of the threshold.
const INSURANCE_TIERS = {
  thresholdLakhs: 10,
  belowThreshold: { medical: 300000, personalAccident: 1000000, term: 1000000 },
  atOrAboveThreshold: { medical: 500000, personalAccident: 1000000, term: 2000000 }
};

/**
 * @param {number} ctcLakhs      CTC in lakhs (e.g. 12.5)
 * @param {number} variableRupees   Variable pay, plain rupees (e.g. 50000)
 * @param {number} retentionRupees  Retention pay, plain rupees
 * @param {number} relocationRupees Relocation bonus, plain rupees
 */
export function calculateCTCBreakdown(
  ctcLakhs,
  variableRupees = 0,
  retentionRupees = 0,
  relocationRupees = 0
) {
  const ctc = ctcLakhs * 100000;
  const fixedPool = fixedSalaryPool(ctc, variableRupees, retentionRupees);

  const basicMonthly = solveBasicMonthly(fixedPool);
  const c = componentsFromBasic(basicMonthly);

  // The offer letter's Annexure 2 groups these differently from the
  // workbook: Basic + HRA + Conveyance make up "Total Fixed Pay
  // Component", while PF + Gratuity make up "Total Benefit Component".
  const totalFixedMonthly = c.basicMonthly + c.hraMonthly + c.conveyanceMonthly;
  const totalBenefitMonthly = c.pfMonthly + c.gratuityMonthly;

  const insurance = ctcLakhs >= INSURANCE_TIERS.thresholdLakhs
    ? INSURANCE_TIERS.atOrAboveThreshold
    : INSURANCE_TIERS.belowThreshold;

  return {
    fixed: {
      basic: { monthly: c.basicMonthly, yearly: c.basicMonthly * 12 },
      hra: { monthly: c.hraMonthly, yearly: c.hraMonthly * 12 },
      conveyance: { monthly: c.conveyanceMonthly, yearly: c.conveyanceMonthly * 12 },
      total: { monthly: totalFixedMonthly, yearly: totalFixedMonthly * 12 }
    },
    statutory: {
      pf: { monthly: c.pfMonthly, yearly: c.pfMonthly * 12 },
      gratuity: { monthly: c.gratuityMonthly, yearly: c.gratuityMonthly * 12 },
      total: { monthly: totalBenefitMonthly, yearly: totalBenefitMonthly * 12 }
    },
    variable: {
      monthly: variableRupees / 12,
      yearly: variableRupees
    },
    optional: {
      retention: {
        monthly: retentionRupees / 12,
        yearly: retentionRupees,
        show: retentionRupees > 0
      },
      relocation: {
        monthly: relocationRupees / 12,
        yearly: relocationRupees,
        show: relocationRupees > 0
      }
    },
    insurance,
    totalCTC: ctc,
    totalMonthly: ctc / 12,

    // Sanity check: the split components plus variable and retention must
    // reconcile to the CTC. Relocation is excluded because it is paid over
    // and above the CTC, not out of it.
    verification: {
      fixedPoolRequired: fixedPool,
      fixedPoolCalculated: c.totalAnnual,
      reconciles: Math.abs((c.totalAnnual + variableRupees + retentionRupees) - ctc) < 1
    }
  };
}
