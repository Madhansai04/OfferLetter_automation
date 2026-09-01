import {
  calculateCompensationBreakdown,
  getInsuranceCoverage,
  generateReferenceNumber,
  resolveOptionalBenefit
} from './compute.js';
import { ctcToWords } from './ctcToWords.js';
import { calculateRetentionPay, calculateRelocationBonus } from '../config/compensation.js';

const POSTING_LABELS = {
  client_office: 'Client Office',
  ganit_office: 'Ganit Office',
  hybrid: 'Hybrid'
};

function formatCurrency(amount) {
  return Math.round(amount).toLocaleString('en-IN');
}

function formatDateDDMMYYYY(isoDateString) {
  const date = new Date(isoDateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Assembles the flat placeholder-value map and conditional-block flags
 * that lib/renderTemplate.js needs to fill templates/offer-letter.html.
 */
export function buildOfferData(input) {
  const ctcAmount = input.ctcLakhs * 100000;
  const breakdown = calculateCompensationBreakdown(input.ctcLakhs);
  const insurance = getInsuranceCoverage(input.ctcLakhs);

  const retentionAmount = resolveOptionalBenefit({
    mode: input.retentionPay.mode,
    manualAmount: input.retentionPay.amount,
    ctcLakhs: input.ctcLakhs,
    formulaFn: calculateRetentionPay
  });

  const relocationAmount = resolveOptionalBenefit({
    mode: input.relocationBonus.mode,
    manualAmount: input.relocationBonus.amount,
    ctcLakhs: input.ctcLakhs,
    formulaFn: calculateRelocationBonus
  });

  const values = {
    REF_NUMBER: generateReferenceNumber(),
    OFFER_DATE: formatDateDDMMYYYY(new Date().toISOString()),
    NAME: input.candidateName,
    EMAIL: input.candidateEmail,
    CONTACT: input.candidateContact,
    ROLE: input.designation,
    CTC_NUM: formatCurrency(ctcAmount),
    CTC_WORDS: ctcToWords(ctcAmount),
    DOJ: formatDateDDMMYYYY(input.dateOfJoining),
    POSTING: POSTING_LABELS[input.postingLocation],
    BASIC_PAY_M: formatCurrency(breakdown.basicPayMonthly),
    BASIC_PAY_Y: formatCurrency(breakdown.basicPayYearly),
    HRA_M: formatCurrency(breakdown.hraMonthly),
    HRA_Y: formatCurrency(breakdown.hraYearly),
    CONVEYANCE_M: formatCurrency(breakdown.conveyanceMonthly),
    CONVEYANCE_Y: formatCurrency(breakdown.conveyanceYearly),
    TOTAL_FIXED_M: formatCurrency(breakdown.totalFixedMonthly),
    TOTAL_FIXED_Y: formatCurrency(breakdown.totalFixedYearly),
    VARIABLE_PAY: formatCurrency(breakdown.variablePayYearly),
    PF_M: formatCurrency(breakdown.pfMonthly),
    PF_Y: formatCurrency(breakdown.pfYearly),
    GRATUITY_M: formatCurrency(breakdown.gratuityMonthly),
    GRATUITY_Y: formatCurrency(breakdown.gratuityYearly),
    TOTAL_BENEFIT_M: formatCurrency(breakdown.totalBenefitMonthly),
    TOTAL_BENEFIT_Y: formatCurrency(breakdown.totalBenefitYearly),
    MEDICAL_INSURANCE: formatCurrency(insurance.medical),
    PERSONAL_ACCIDENT_INSURANCE: formatCurrency(insurance.personalAccident),
    TERM_INSURANCE: formatCurrency(insurance.term)
  };

  if (retentionAmount !== null) {
    values.RETENTION_PAY_AMOUNT = formatCurrency(retentionAmount);
  }
  if (relocationAmount !== null) {
    values.RELOCATION_BONUS_AMOUNT = formatCurrency(relocationAmount);
  }

  const flags = {
    RETENTION_PAY_LINE: retentionAmount !== null,
    RELOCATION_BONUS_LINE: relocationAmount !== null
  };

  return { values, flags };
}
