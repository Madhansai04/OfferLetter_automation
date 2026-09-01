// PLACEHOLDER VALUES — pending real numbers from Ganit HR.
// Swap these without touching any other file; lib/compute.js only
// ever reads from this module.

export const CTC_FORMULA = {
  fixedPayPoolPercent: 0.60,
  basicPercentOfFixed: 0.50,
  hraPercentOfFixed: 0.25,
  conveyancePercentOfFixed: 0.25,
  variablePercent: 0.04,
  pfPercent: 0.12,
  gratuityPercent: 0.04
};

export const INSURANCE_TIERS = {
  thresholdLakhs: 10,
  default: {
    medical: 300000,
    personalAccident: 500000,
    term: 1000000
  },
  enhanced: {
    medical: 500000,
    personalAccident: 1000000,
    term: 2000000
  }
};

// Auto-mode formulas for optional benefits — not yet provided by Ganit HR.
// Manual entry mode does not call these; only selecting "Auto" in the UI does.
export function calculateRetentionPay(_ctcLakhs) {
  throw new Error('Retention Pay formula not yet configured. Use manual entry instead.');
}

export function calculateRelocationBonus(_ctcLakhs) {
  throw new Error('Relocation Bonus formula not yet configured. Use manual entry instead.');
}
