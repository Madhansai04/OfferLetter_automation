# Ganit Offer Letter Generator MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web app where HR fills a one-page form and downloads a PDF + Word offer letter matching Ganit's real template exactly, with server-computed CTC breakdown, insurance tier, and optional Retention Pay / Relocation Bonus lines.

**Architecture:** Node/Express backend exposes `POST /api/preview` (compute only) and `POST /api/generate` (compute + render PDF via Puppeteer + DOCX via the `docx` library). A Vite/React frontend posts the 9-field form to those endpoints and triggers downloads. No database, no auth — everything is stateless per-request except an in-memory reference-number counter.

**Tech Stack:** Node.js 24, Express 4, zod, Puppeteer, `docx` npm package, Vitest (backend unit tests) + Jest-free — using `vitest` for both frontend and backend for consistency, supertest for API integration tests, React 18 + Vite, vanilla fetch (no axios needed for 2 endpoints).

---

## Reference Material

The full field/content mapping for the real template lives in `docs/superpowers/specs/2026-09-01-offer-letter-generator-mvp-design.md`. Read it before starting if anything below is unclear — it documents exactly which parts of the 4-page PDF are static vs. dynamic.

**All placeholder tokens used across the template:**
`{{REF_NUMBER}}`, `{{OFFER_DATE}}`, `{{NAME}}`, `{{EMAIL}}`, `{{CONTACT}}`, `{{ROLE}}`, `{{CTC_NUM}}`, `{{CTC_WORDS}}`, `{{DOJ}}`, `{{POSTING}}`, `{{BASIC_PAY_M}}`, `{{BASIC_PAY_Y}}`, `{{HRA_M}}`, `{{HRA_Y}}`, `{{CONVEYANCE_M}}`, `{{CONVEYANCE_Y}}`, `{{TOTAL_FIXED_M}}`, `{{TOTAL_FIXED_Y}}`, `{{VARIABLE_PAY}}`, `{{PF_M}}`, `{{PF_Y}}`, `{{GRATUITY_M}}`, `{{GRATUITY_Y}}`, `{{TOTAL_BENEFIT_M}}`, `{{TOTAL_BENEFIT_Y}}`, `{{MEDICAL_INSURANCE}}`, `{{PERSONAL_ACCIDENT_INSURANCE}}`, `{{TERM_INSURANCE}}`, plus conditional blocks for Retention Pay and Relocation Bonus lines (each with its own amount + footnote, shown only when provided).

---

## Task 1: Backend project scaffold

**Files:**
- Create: `backend/package.json`
- Create: `backend/.gitignore`

- [ ] **Step 1: Create the backend directory and initialize npm**

Run:
```bash
mkdir -p backend
cd backend
npm init -y
```

- [ ] **Step 2: Install dependencies**

Run (from `backend/`):
```bash
npm install express zod docx puppeteer
npm install -D vitest supertest
```

- [ ] **Step 3: Set package.json scripts and type**

Edit `backend/package.json` so it contains at least:

```json
{
  "name": "offer-letter-backend",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "dev": "node server.js",
    "test": "vitest run"
  }
}
```

Keep the `dependencies`/`devDependencies` that `npm install` already added; just add/adjust the fields above.

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
*.log
```

Write this to `backend/.gitignore`.

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/.gitignore
git commit -m "chore: scaffold backend Node project"
```

---

## Task 2: Compensation config (CTC formula, insurance tiers, benefit stubs)

**Files:**
- Create: `backend/config/compensation.js`
- Test: `backend/config/compensation.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/config/compensation.test.js`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `backend/`): `npx vitest run config/compensation.test.js`
Expected: FAIL — `Cannot find module './compensation.js'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `backend/config/compensation.js`:

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run config/compensation.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/config/compensation.js backend/config/compensation.test.js
git commit -m "feat: add compensation config with placeholder CTC formula and insurance tiers"
```

---

## Task 3: `ctcToWords` — Indian numbering word conversion

**Files:**
- Create: `backend/lib/ctcToWords.js`
- Test: `backend/lib/ctcToWords.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/lib/ctcToWords.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { ctcToWords } from './ctcToWords.js';

describe('ctcToWords', () => {
  it('converts zero', () => {
    expect(ctcToWords(0)).toBe('Zero');
  });

  it('converts an amount under 1 lakh', () => {
    expect(ctcToWords(50000)).toBe('Fifty thousand');
  });

  it('converts an exact lakh amount', () => {
    expect(ctcToWords(1200000)).toBe('Twelve lakh');
  });

  it('converts lakhs plus a remainder', () => {
    expect(ctcToWords(1250000)).toBe('Twelve lakh fifty thousand');
  });

  it('converts a value with hundreds in the remainder', () => {
    expect(ctcToWords(1250350)).toBe('Twelve lakh fifty thousand three hundred fifty');
  });

  it('converts a single-digit remainder correctly', () => {
    expect(ctcToWords(1000007)).toBe('Ten lakh seven');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/ctcToWords.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `backend/lib/ctcToWords.js`:

```javascript
const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen'
];

const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
];

function convertBelowThousand(num) {
  if (num === 0) return '';
  if (num < 20) return ONES[num];
  if (num < 100) {
    const tens = TENS[Math.floor(num / 10)];
    const rest = num % 10;
    return rest === 0 ? tens : `${tens} ${ONES[rest]}`;
  }
  const hundreds = ONES[Math.floor(num / 100)];
  const rest = num % 100;
  return rest === 0
    ? `${hundreds} hundred`
    : `${hundreds} hundred ${convertBelowThousand(rest)}`;
}

/**
 * Converts a rupee amount into Indian-numbering words (lakh-based).
 * Only handles values up to 99 lakh (sufficient for CTC amounts in this app).
 */
export function ctcToWords(amount) {
  if (amount === 0) return 'Zero';

  const lakhs = Math.floor(amount / 100000);
  const remainder = amount % 100000;
  const thousands = Math.floor(remainder / 1000);
  const belowThousand = remainder % 1000;

  const parts = [];
  if (lakhs > 0) parts.push(`${convertBelowThousand(lakhs)} lakh`);
  if (thousands > 0) parts.push(`${convertBelowThousand(thousands)} thousand`);
  if (belowThousand > 0) parts.push(convertBelowThousand(belowThousand));

  const result = parts.join(' ');
  return result.charAt(0).toUpperCase() + result.slice(1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/ctcToWords.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/lib/ctcToWords.js backend/lib/ctcToWords.test.js
git commit -m "feat: add ctcToWords Indian-numbering converter"
```

---

## Task 4: `calculateCompensationBreakdown`

**Files:**
- Create: `backend/lib/compute.js`
- Test: `backend/lib/compute.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/lib/compute.test.js`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/compute.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `backend/lib/compute.js`:

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/compute.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/lib/compute.js backend/lib/compute.test.js
git commit -m "feat: add calculateCompensationBreakdown and getInsuranceCoverage"
```

---

## Task 5: `getInsuranceCoverage` boundary tests + `generateReferenceNumber`

**Files:**
- Modify: `backend/lib/compute.js`
- Modify: `backend/lib/compute.test.js`

- [ ] **Step 1: Add failing tests for insurance boundary and reference number**

Append to `backend/lib/compute.test.js` (add the import and new `describe` blocks):

```javascript
import { calculateCompensationBreakdown, getInsuranceCoverage, generateReferenceNumber } from './compute.js';

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
```

Replace the top-of-file import in `backend/lib/compute.test.js` (it currently only imports `calculateCompensationBreakdown`) with the combined import shown above.

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run lib/compute.test.js`
Expected: FAIL — `getInsuranceCoverage` boundary cases pass already (implemented in Task 4), but `generateReferenceNumber` fails as not exported.

- [ ] **Step 3: Add `generateReferenceNumber` to the implementation**

Append to `backend/lib/compute.js`:

```javascript
let sequenceCounter = 0;
let sequenceYear = null;

/**
 * Generates GANIT/HR/APPT/{year}-{4-digit sequence}.
 * The counter is in-memory only and resets to 1 on process restart or
 * year rollover — acceptable for the MVP, which has no database.
 */
export function generateReferenceNumber() {
  const year = new Date().getFullYear();
  if (year !== sequenceYear) {
    sequenceYear = year;
    sequenceCounter = 0;
  }
  sequenceCounter += 1;
  return `GANIT/HR/APPT/${year}-${String(sequenceCounter).padStart(4, '0')}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/compute.test.js`
Expected: PASS (9 tests total)

- [ ] **Step 5: Commit**

```bash
git add backend/lib/compute.js backend/lib/compute.test.js
git commit -m "feat: add generateReferenceNumber and insurance boundary tests"
```

---

## Task 6: `resolveOptionalBenefit` (Retention Pay / Relocation Bonus resolution)

**Files:**
- Modify: `backend/lib/compute.js`
- Modify: `backend/lib/compute.test.js`

- [ ] **Step 1: Write the failing test**

Append to `backend/lib/compute.test.js` (add `resolveOptionalBenefit` to the import, then add):

```javascript
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
```

Update the top import line to include `resolveOptionalBenefit`:

```javascript
import { calculateCompensationBreakdown, getInsuranceCoverage, generateReferenceNumber, resolveOptionalBenefit } from './compute.js';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/compute.test.js`
Expected: FAIL — `resolveOptionalBenefit` not exported.

- [ ] **Step 3: Write the implementation**

Append to `backend/lib/compute.js`:

```javascript
/**
 * Resolves the yearly amount for an optional benefit (Retention Pay or
 * Relocation Bonus). Returns null when the line should be omitted from
 * the offer letter entirely (manual mode with no/zero amount).
 */
export function resolveOptionalBenefit({ mode, manualAmount, ctcLakhs, formulaFn }) {
  if (mode === 'auto') {
    return formulaFn(ctcLakhs);
  }
  if (!manualAmount) {
    return null;
  }
  return manualAmount;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/compute.test.js`
Expected: PASS (14 tests total)

- [ ] **Step 5: Commit**

```bash
git add backend/lib/compute.js backend/lib/compute.test.js
git commit -m "feat: add resolveOptionalBenefit for retention/relocation lines"
```

---

## Task 7: Input validation schema

**Files:**
- Create: `backend/lib/validate.js`
- Test: `backend/lib/validate.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/lib/validate.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { OfferLetterInputSchema } from './validate.js';

const validInput = {
  candidateName: 'Jane Doe',
  candidateEmail: 'jane@example.com',
  candidateContact: '+919876543210',
  designation: 'Senior Data Scientist',
  ctcLakhs: 12.5,
  dateOfJoining: '2027-01-01',
  postingLocation: 'ganit_office',
  retentionPay: { mode: 'manual', amount: 0 },
  relocationBonus: { mode: 'manual', amount: 0 }
};

describe('OfferLetterInputSchema', () => {
  it('accepts a fully valid payload', () => {
    const result = OfferLetterInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects a missing candidate name', () => {
    const result = OfferLetterInputSchema.safeParse({ ...validInput, candidateName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = OfferLetterInputSchema.safeParse({ ...validInput, candidateEmail: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid phone number', () => {
    const result = OfferLetterInputSchema.safeParse({ ...validInput, candidateContact: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects a CTC below 1 lakh', () => {
    const result = OfferLetterInputSchema.safeParse({ ...validInput, ctcLakhs: 0.5 });
    expect(result.success).toBe(false);
  });

  it('rejects a CTC above 100 lakh', () => {
    const result = OfferLetterInputSchema.safeParse({ ...validInput, ctcLakhs: 150 });
    expect(result.success).toBe(false);
  });

  it('rejects a date of joining in the past', () => {
    const result = OfferLetterInputSchema.safeParse({ ...validInput, dateOfJoining: '2020-01-01' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid posting location', () => {
    const result = OfferLetterInputSchema.safeParse({ ...validInput, postingLocation: 'moon_base' });
    expect(result.success).toBe(false);
  });

  it('accepts retentionPay/relocationBonus in auto mode without an amount', () => {
    const result = OfferLetterInputSchema.safeParse({
      ...validInput,
      retentionPay: { mode: 'auto' },
      relocationBonus: { mode: 'auto' }
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown mode for retentionPay', () => {
    const result = OfferLetterInputSchema.safeParse({
      ...validInput,
      retentionPay: { mode: 'magic', amount: 100 }
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/validate.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `backend/lib/validate.js`:

```javascript
import { z } from 'zod';

const OptionalBenefitSchema = z.object({
  mode: z.enum(['manual', 'auto']),
  amount: z.number().min(0).optional()
});

export const OfferLetterInputSchema = z.object({
  candidateName: z.string().trim().min(2).max(100),
  candidateEmail: z.string().trim().email(),
  candidateContact: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number'),
  designation: z.string().trim().min(2).max(150),
  ctcLakhs: z.number().min(1).max(100),
  dateOfJoining: z.string().refine((value) => {
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !Number.isNaN(date.getTime()) && date >= today;
  }, 'Date of joining must be today or in the future'),
  postingLocation: z.enum(['client_office', 'ganit_office', 'hybrid']),
  retentionPay: OptionalBenefitSchema,
  relocationBonus: OptionalBenefitSchema
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/validate.test.js`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
npm install zod --prefix backend
git add backend/lib/validate.js backend/lib/validate.test.js backend/package.json backend/package-lock.json
git commit -m "feat: add offer letter input validation schema"
```

Note: `zod` was already installed in Task 1; this install is a no-op confirmation. If `backend/package.json`/lockfile show no diff, skip staging them.

---

## Task 8: HTML offer letter template

**Files:**
- Create: `backend/templates/offer-letter.html`

This template must render all 4 pages of the real Ganit offer letter, matching `Ganit_Offer_Letter_Placeholder_Template.pdf` structurally: letterhead, offer paragraph, static mission/culture content, signature block, Annexure 1 (static T&Cs), and Annexure 2 (compensation table with conditional Retention Pay / Relocation Bonus lines).

- [ ] **Step 1: Create the template file**

Create `backend/templates/offer-letter.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Offer Letter</title>
<style>
  @page { size: A4; margin: 20mm 15mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #111; margin: 0; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .header .logo { font-size: 22pt; font-weight: bold; color: #1a00d9; }
  .header .logo .tagline { font-size: 8pt; color: #666; display: block; font-weight: normal; }
  .header .address { text-align: right; font-size: 9pt; color: #333; }
  h1 { color: #1a00d9; text-align: center; font-size: 20pt; margin: 20px 0; }
  .ref-row { display: flex; justify-content: space-between; font-size: 10pt; color: #666; margin-bottom: 10px; }
  .candidate-box { display: flex; justify-content: space-between; background: #f5f5f5; padding: 10px; margin-bottom: 20px; }
  .candidate-box div { flex: 1; }
  .candidate-box .label { font-size: 9pt; color: #666; }
  h3 { color: #1a00d9; margin-top: 18px; margin-bottom: 6px; }
  .mission { font-style: italic; color: #fe6e06; }
  ul { margin: 6px 0; padding-left: 20px; }
  .signature-block { margin-top: 40px; }
  .footer { position: fixed; bottom: 10mm; left: 15mm; right: 15mm; display: flex; justify-content: space-between; font-size: 8pt; color: #666; border-top: 1px solid #ddd; padding-top: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  table th, table td { border: 1px solid #ccc; padding: 6px 8px; font-size: 10pt; text-align: left; }
  table th { background: #dbeaff; }
  .amount-cell { text-align: right; }
  .total-row { font-weight: bold; background: #f5f5f5; }
  .footnote { font-size: 8.5pt; color: #444; margin-top: 4px; }
  .confidential { font-weight: bold; margin-top: 20px; }
  .annexure-title { text-align: center; font-weight: bold; margin-bottom: 16px; }
</style>
</head>
<body>

<!-- PAGE 1 -->
<div class="page">
  <div class="header">
    <div class="logo">Ganit<span class="tagline">data speaks</span></div>
    <div class="address">
      Geeyam Tech Square,<br>
      57, Estate Main Rd, Industrial Estate,<br>
      Perungudi, Chennai 600096
    </div>
  </div>

  <h1>OFFER LETTER</h1>
  <div class="ref-row">
    <span>Ref: {{REF_NUMBER}}</span>
    <span>Date: {{OFFER_DATE}}</span>
  </div>

  <div class="candidate-box">
    <div><span class="label">Name</span><br>{{NAME}}</div>
    <div><span class="label">Email</span><br>{{EMAIL}}</div>
    <div><span class="label">Contact</span><br>{{CONTACT}}</div>
  </div>

  <p>Dear {{NAME}},</p>
  <p><strong>Congratulations.</strong> Welcome to the exciting world of Data and AI!</p>
  <p>
    We are pleased to offer you a full-time role as {{ROLE}} at Ganit Business Solutions Pvt. Ltd.
    Your potential annual Compensation of INR {{CTC_NUM}} ({{CTC_WORDS}}). You will join Ganit on {{DOJ}}
    and your position is work from {{POSTING}} and not remote.
  </p>
  <p>
    At Ganit you are expected to operate with the highest degree of Integrity, efficiency and responsibility.
    We are fully confident that you will add tremendous value through your role and strengthen Ganit's growth.
  </p>

  <h3>Our Mission</h3>
  <p class="mission">Maximize decision velocity and minimize decision risk.</p>
  <p>
    We partner with business leaders to give their data, a voice. We partner with them to discover, frame
    and solve problems across four key quadrants: descriptive, diagnostic, predictive and prescriptive.
  </p>

  <h3>Our Culture</h3>
  <p>Our culture is about behaviors and not buzzwords.</p>
  <ul>
    <li><em>We are yellow color blind</em>: To us there is no yellow light, its either red or green.</li>
    <li><em>We punch above our weight</em>: We take challenges beyond our comfort zone.</li>
    <li><em>To us, Attitude&gt;Aptitude</em>: Our team grows on attitude and drive rather than skills.</li>
    <li><em>Maximize Vocalness, minimize hierarchy</em>: We follow flat structure to reduce bureaucracy.</li>
    <li><em>We keep our small promises</em>: We build trust by delivering consistently on our small promises.</li>
  </ul>

  <h3>What's exciting at Ganit</h3>
  <ul>
    <li>You aren't just filling a position; you are its architect.</li>
    <li>Artificial Intelligence is our first language and the foundation of every solution we build.</li>
    <li>We champion a flat hierarchy to foster talent to have a fast-track career progression.</li>
    <li>You will collaborate directly with enterprise leaders to influence high-stakes decision-making.</li>
  </ul>

  <div class="footer"><span>Private and Confidential | Page 1 of 4</span><span>www.ganitinc.com | contact@ganitinc.com</span></div>
</div>

<!-- PAGE 2 -->
<div class="page">
  <div class="header">
    <div class="logo">Ganit<span class="tagline">data speaks</span></div>
    <div class="address">
      Geeyam Tech Square,<br>
      57, Estate Main Rd, Industrial Estate,<br>
      Perungudi, Chennai 600096
    </div>
  </div>

  <p>
    Terms and Conditions applicable to this offer are stated in Annexure 1 and break up of your potential
    compensation in Annexure 2. Both Annexures are integral part of this offer letter. Please sign this letter
    within five calendar days to confirm your acceptance. Reach out to our Talent Partner for revalidating this
    letter, if you could not accept in time.
  </p>
  <p>We welcome you to Ganit and wish you a bright &amp; prosperous career with us.</p>

  <div class="signature-block">
    <p>Yours Sincerely,</p>
    <p style="margin-top: 40px;"><strong>Ashok Harwani</strong><br>Co-Founder &amp; Chief Growth Officer</p>
  </div>

  <h3 style="text-align:center; margin-top: 60px;">Acceptance</h3>
  <p>
    I hereby accept employment with Ganit. I have read the offer completely and accept all the terms and
    conditions mentioned. I have understood and accepted the compensation details as explained in
    Annexure-1 and will keep it confidential. I accept that I have provided correct and updated personal
    information till now and will provide any additional information as and when required by the organization.
  </p>
  <p style="margin-top: 40px;">Name:</p>
  <p style="margin-top: 30px;">Signature:</p>
  <p style="margin-top: 30px;">Date:</p>

  <div class="footer"><span>Private and Confidential | Page 2 of 4</span><span>www.ganitinc.com | contact@ganitinc.com</span></div>
</div>

<!-- PAGE 3 -->
<div class="page">
  <div class="header">
    <div class="logo">Ganit<span class="tagline">data speaks</span></div>
    <div class="address">
      Geeyam Tech Square,<br>
      57, Estate Main Rd, Industrial Estate,<br>
      Perungudi, Chennai 600096
    </div>
  </div>

  <div class="annexure-title">Annexure 1 - Terms &amp; Conditions</div>
  <ol>
    <li><strong>Probation Period</strong>: You will be under 6 months' probation period and will be confirmed in writing based on your performance and contributions.</li>
    <li><strong>Leave</strong>: You shall be entitled to 32 days of leave, comprising 22 paid leave days and 10 company's declared holidays.</li>
    <li><strong>Annual Appraisal</strong>: Ganit follows calendar year appraisal process (January to December).</li>
    <li><strong>Background Check:</strong> Candidates' employment with Ganit is conditional and subject to satisfactory background and reference checks in line with Company policy.</li>
    <li><strong>Notice for Separation</strong>: You will typically have to serve 30 days' notice during probation period and 90 days after confirmation. However, notice period requirement is subject to extant policy and business requirements. To ensure business continuity, a six-month commitment is required. If you decide to separate before expiry of this period, an amount of 10% of your Annual Fixed Pay will be payable by you as damages to cover business impact.</li>
    <li>From the day of joining, you will be governed and adhered to the <strong>Code of conduct</strong> Policies, and <strong>Confidentiality provisions</strong>.</li>
    <li><strong>Minimum tenure commitment clause:</strong> To ensure business continuity, a six-month commitment is required. If you decide to separate before expiry of this period, 10% of your Annual Fixed Pay will be payable by you as damages to cover business impact.</li>
    <li>
      <strong>Retention</strong>
      <p>As part of your appointment with Ganit, you agree to commit to a minimum period of one year (12 months) of employment from the date of joining.</p>
      <ul>
        <li>If you voluntarily resign before completing 12 months, you will be required to reimburse the company INR 1,00,000, to compensate for training and onboarding costs.</li>
        <li>However, if you leave due to medical reasons, or higher education, this clause may be waived at the company's discretion upon providing valid documentation.</li>
        <li>If the company terminates your employment due to performance issues, code of conduct violations, or policy breaches, this clause will remain inapplicable, and no compensation will be owed by the company.</li>
        <li>If the company terminates employment for reasons other than misconduct or performance issues, the company will provide compensation in accordance with the statutory notice period.</li>
      </ul>
    </li>
  </ol>

  <div class="footer"><span>Private and Confidential | Page 3 of 4</span><span>www.ganitinc.com | contact@ganitinc.com</span></div>
</div>

<!-- PAGE 4 -->
<div class="page">
  <div class="header">
    <div class="logo">Ganit<span class="tagline">data speaks</span></div>
    <div class="address">
      Geeyam Tech Square,<br>
      57, Estate Main Rd, Industrial Estate,<br>
      Perungudi, Chennai 600096
    </div>
  </div>

  <div class="annexure-title">Annexure 2 - Compensation Structure</div>

  <table>
    <tr><td><strong>Name</strong></td><td>{{NAME}}</td></tr>
    <tr><td><strong>Date of Joining</strong></td><td>{{DOJ}}</td></tr>
    <tr><td><strong>Designation</strong></td><td>{{ROLE}}</td></tr>
    <tr><td><strong>CTC (Per Annum) ₹</strong></td><td>{{CTC_NUM}}</td></tr>
  </table>

  <table>
    <tr><th colspan="3">FIXED PAY</th></tr>
    <tr><th></th><th>Monthly</th><th>Yearly</th></tr>
    <tr><td>1. Basic Pay</td><td class="amount-cell">₹ {{BASIC_PAY_M}}</td><td class="amount-cell">₹ {{BASIC_PAY_Y}}</td></tr>
    <tr><td>2. House Rent Allowance</td><td class="amount-cell">₹ {{HRA_M}}</td><td class="amount-cell">₹ {{HRA_Y}}</td></tr>
    <tr><td>3. Conveyance Allowance</td><td class="amount-cell">₹ {{CONVEYANCE_M}}</td><td class="amount-cell">₹ {{CONVEYANCE_Y}}</td></tr>
    <tr class="total-row"><td>Total Fixed Pay Component</td><td class="amount-cell">₹ {{TOTAL_FIXED_M}}</td><td class="amount-cell">₹ {{TOTAL_FIXED_Y}}</td></tr>
    <tr><th colspan="3">VARIABLE</th></tr>
    <tr><td>4. Variable Pay #</td><td class="amount-cell" colspan="2">₹ {{VARIABLE_PAY}}</td></tr>
    <tr><th colspan="3">STATUTORY BENEFITS</th></tr>
    <tr><td>5. PF Employer Contribution</td><td class="amount-cell">₹ {{PF_M}}</td><td class="amount-cell">₹ {{PF_Y}}</td></tr>
    <tr><td>6. Gratuity Benefits</td><td class="amount-cell">₹ {{GRATUITY_M}}</td><td class="amount-cell">₹ {{GRATUITY_Y}}</td></tr>
    <tr class="total-row"><td>Total Benefit Component</td><td class="amount-cell">₹ {{TOTAL_BENEFIT_M}}</td><td class="amount-cell">₹ {{TOTAL_BENEFIT_Y}}</td></tr>
  </table>
  <p style="font-size:8.5pt;">Salary heads are subject to government policies &amp; tax will be apportioned accordingly.</p>
  <p style="font-size:8.5pt;">
    # Variable Pay will be paid yearly based on employee &amp; company performance during Q1 of next calendar year.
  </p>

  {{#RETENTION_PAY_LINE}}
  <table>
    <tr><td>Retention Pay* (Yearly)</td><td class="amount-cell">₹ {{RETENTION_PAY_AMOUNT}}</td></tr>
  </table>
  {{/RETENTION_PAY_LINE}}

  {{#RELOCATION_BONUS_LINE}}
  <table>
    <tr><td>Relocation Bonus** (Yearly)</td><td class="amount-cell">₹ {{RELOCATION_BONUS_AMOUNT}}</td></tr>
  </table>
  {{/RELOCATION_BONUS_LINE}}

  <p>Employees will be covered under the company sponsored Insurance coverage as mentioned below:</p>
  <table>
    <tr><th>Benefit</th><th>Coverage</th></tr>
    <tr><td>Medical Insurance</td><td class="amount-cell">₹ {{MEDICAL_INSURANCE}}</td></tr>
    <tr><td>Personal Accident Insurance</td><td class="amount-cell">₹ {{PERSONAL_ACCIDENT_INSURANCE}}</td></tr>
    <tr><td>Term Insurance</td><td class="amount-cell">₹ {{TERM_INSURANCE}}</td></tr>
  </table>

  {{#RETENTION_PAY_LINE}}
  <p class="footnote">* Retention pay will be prorated &amp; paid during June &amp; December payroll. Any payout must be reimbursed if you resign within 12 months from the date of joining.</p>
  {{/RETENTION_PAY_LINE}}
  {{#RELOCATION_BONUS_LINE}}
  <p class="footnote">** Relocation bonus will be paid during the subsequent payroll after employees complete 1 month from date of joining and will be recovered if you resign within 12 months from the date of joining.</p>
  {{/RELOCATION_BONUS_LINE}}

  <p class="confidential">This offer &amp; compensation is strictly confidential, you are advised not to discuss it with anyone.</p>

  <div class="footer"><span>Private and Confidential | Page 4 of 4</span><span>www.ganitinc.com | contact@ganitinc.com</span></div>
</div>

</body>
</html>
```

Note: `{{#RETENTION_PAY_LINE}}...{{/RETENTION_PAY_LINE}}` and `{{#RELOCATION_BONUS_LINE}}...{{/RELOCATION_BONUS_LINE}}` are simple conditional-block markers this project defines and parses itself in Task 9 (`render.js`) — they are not a templating library's syntax. Keep the opening/closing tags exactly as written; the parser in Task 9 matches them literally.

- [ ] **Step 2: Commit**

```bash
git add backend/templates/offer-letter.html
git commit -m "feat: add HTML offer letter template matching the real 4-page PDF"
```

(No test for this step — it's static markup, verified functionally in Task 9's render tests and the manual smoke test in Task 14.)

---

## Task 9: Template rendering — placeholder substitution + conditional blocks

**Files:**
- Create: `backend/lib/renderTemplate.js`
- Test: `backend/lib/renderTemplate.test.js`

This is the piece that takes the HTML template string and a data object, and produces final HTML: substituting `{{TOKEN}}` placeholders and including/excluding `{{#BLOCK}}...{{/BLOCK}}` sections based on boolean flags.

- [ ] **Step 1: Write the failing test**

Create `backend/lib/renderTemplate.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { renderTemplate } from './renderTemplate.js';

describe('renderTemplate', () => {
  it('substitutes simple placeholders', () => {
    const template = 'Hello {{NAME}}, your role is {{ROLE}}.';
    const result = renderTemplate(template, { NAME: 'Jane', ROLE: 'Engineer' }, {});
    expect(result).toBe('Hello Jane, your role is Engineer.');
  });

  it('leaves an unmatched placeholder blank rather than throwing', () => {
    const template = 'Value: {{MISSING}}';
    const result = renderTemplate(template, {}, {});
    expect(result).toBe('Value: ');
  });

  it('includes a conditional block when its flag is true', () => {
    const template = 'Before {{#SHOW}}Middle{{/SHOW}} After';
    const result = renderTemplate(template, {}, { SHOW: true });
    expect(result).toBe('Before Middle After');
  });

  it('excludes a conditional block when its flag is false', () => {
    const template = 'Before {{#SHOW}}Middle{{/SHOW}} After';
    const result = renderTemplate(template, {}, { SHOW: false });
    expect(result).toBe('Before  After');
  });

  it('substitutes placeholders inside an included conditional block', () => {
    const template = '{{#SHOW}}Amount: {{AMOUNT}}{{/SHOW}}';
    const result = renderTemplate(template, { AMOUNT: '100' }, { SHOW: true });
    expect(result).toBe('Amount: 100');
  });

  it('handles multiple independent conditional blocks', () => {
    const template = '{{#A}}A-shown{{/A}}{{#B}}B-shown{{/B}}';
    const result = renderTemplate(template, {}, { A: true, B: false });
    expect(result).toBe('A-shown');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/renderTemplate.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `backend/lib/renderTemplate.js`:

```javascript
/**
 * Fills a template string containing {{TOKEN}} placeholders and
 * {{#BLOCK}}...{{/BLOCK}} conditional sections.
 *
 * @param {string} template - raw template text
 * @param {Record<string, string>} values - placeholder token -> replacement text
 * @param {Record<string, boolean>} flags - block name -> whether to include it
 * @returns {string} rendered output
 */
export function renderTemplate(template, values, flags) {
  let output = template;

  for (const [blockName, shouldShow] of Object.entries(flags)) {
    const blockRegex = new RegExp(`{{#${blockName}}}([\\s\\S]*?){{/${blockName}}}`, 'g');
    output = output.replace(blockRegex, shouldShow ? '$1' : '');
  }

  output = output.replace(/{{(\w+)}}/g, (_match, token) => {
    return Object.prototype.hasOwnProperty.call(values, token) ? String(values[token]) : '';
  });

  return output;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/renderTemplate.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/lib/renderTemplate.js backend/lib/renderTemplate.test.js
git commit -m "feat: add renderTemplate for placeholder and conditional-block substitution"
```

---

## Task 10: `buildOfferData` — assemble all computed + formatted values for one offer

**Files:**
- Create: `backend/lib/buildOfferData.js`
- Test: `backend/lib/buildOfferData.test.js`

This ties together `compute.js`, `ctcToWords.js`, and the config into one function that produces exactly the flat key/value map the template needs, plus the conditional-block flags.

- [ ] **Step 1: Write the failing test**

Create `backend/lib/buildOfferData.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { buildOfferData } from './buildOfferData.js';

const baseInput = {
  candidateName: 'Jane Doe',
  candidateEmail: 'jane@example.com',
  candidateContact: '+919876543210',
  designation: 'Senior Data Scientist',
  ctcLakhs: 12.5,
  dateOfJoining: '2027-01-01',
  postingLocation: 'ganit_office',
  retentionPay: { mode: 'manual', amount: 0 },
  relocationBonus: { mode: 'manual', amount: 0 }
};

describe('buildOfferData', () => {
  it('formats posting location into readable text', () => {
    const { values } = buildOfferData(baseInput);
    expect(values.POSTING).toBe('Ganit Office');
  });

  it('includes a reference number matching the GANIT/HR/APPT pattern', () => {
    const { values } = buildOfferData(baseInput);
    expect(values.REF_NUMBER).toMatch(/^GANIT\/HR\/APPT\/\d{4}-\d{4}$/);
  });

  it('sets both retention and relocation flags false when both are blank', () => {
    const { flags } = buildOfferData(baseInput);
    expect(flags.RETENTION_PAY_LINE).toBe(false);
    expect(flags.RELOCATION_BONUS_LINE).toBe(false);
  });

  it('sets only the retention flag true when only retention is filled', () => {
    const input = { ...baseInput, retentionPay: { mode: 'manual', amount: 100000 } };
    const { flags, values } = buildOfferData(input);
    expect(flags.RETENTION_PAY_LINE).toBe(true);
    expect(flags.RELOCATION_BONUS_LINE).toBe(false);
    expect(values.RETENTION_PAY_AMOUNT).toBe('1,00,000');
  });

  it('sets only the relocation flag true when only relocation is filled', () => {
    const input = { ...baseInput, relocationBonus: { mode: 'manual', amount: 50000 } };
    const { flags, values } = buildOfferData(input);
    expect(flags.RETENTION_PAY_LINE).toBe(false);
    expect(flags.RELOCATION_BONUS_LINE).toBe(true);
    expect(values.RELOCATION_BONUS_AMOUNT).toBe('50,000');
  });

  it('formats CTC as Indian-grouped currency', () => {
    const { values } = buildOfferData(baseInput);
    expect(values.CTC_NUM).toBe('12,50,000');
  });

  it('formats CTC in words', () => {
    const { values } = buildOfferData(baseInput);
    expect(values.CTC_WORDS).toBe('Twelve lakh fifty thousand');
  });

  it('formats date of joining as DD/MM/YYYY', () => {
    const { values } = buildOfferData(baseInput);
    expect(values.DOJ).toBe('01/01/2027');
  });

  it('includes insurance amounts for the correct tier', () => {
    const { values } = buildOfferData(baseInput);
    expect(values.MEDICAL_INSURANCE).toBe('5,00,000');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/buildOfferData.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `backend/lib/buildOfferData.js`:

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/buildOfferData.test.js`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/lib/buildOfferData.js backend/lib/buildOfferData.test.js
git commit -m "feat: add buildOfferData to assemble template values and conditional flags"
```

---

## Task 11: PDF generation via Puppeteer

**Files:**
- Create: `backend/lib/generatePdf.js`
- Test: `backend/lib/generatePdf.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/lib/generatePdf.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { generatePdf } from './generatePdf.js';

describe('generatePdf', () => {
  it('produces a non-empty PDF buffer starting with the PDF magic bytes', async () => {
    const html = '<html><body><h1>Test Offer Letter</h1></body></html>';
    const buffer = await generatePdf(html);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString('ascii')).toBe('%PDF');
  }, 30000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/generatePdf.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `backend/lib/generatePdf.js`:

```javascript
import puppeteer from 'puppeteer';

/**
 * Renders an HTML string to a PDF buffer using a headless Chromium instance.
 * A fresh browser is launched per call — acceptable for the MVP's
 * single-user, low-volume usage pattern.
 */
export async function generatePdf(html) {
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
    });
    return buffer;
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/generatePdf.test.js`
Expected: PASS (1 test; may take several seconds due to browser launch)

- [ ] **Step 5: Commit**

```bash
git add backend/lib/generatePdf.js backend/lib/generatePdf.test.js
git commit -m "feat: add generatePdf using Puppeteer"
```

---

## Task 12: Word (.docx) generation

**Files:**
- Create: `backend/lib/generateDocx.js`
- Test: `backend/lib/generateDocx.test.js`

The DOCX mirrors the same content as the PDF (candidate details, offer paragraph, static T&Cs summary, compensation table with conditional retention/relocation lines) but built directly with the `docx` library rather than from HTML, since `docx` builds documents from its own object model.

- [ ] **Step 1: Write the failing test**

Create `backend/lib/generateDocx.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { generateDocx } from './generateDocx.js';

const sampleValues = {
  REF_NUMBER: 'GANIT/HR/APPT/2027-0001',
  OFFER_DATE: '01/09/2026',
  NAME: 'Jane Doe',
  EMAIL: 'jane@example.com',
  CONTACT: '+919876543210',
  ROLE: 'Senior Data Scientist',
  CTC_NUM: '12,50,000',
  CTC_WORDS: 'Twelve lakh fifty thousand',
  DOJ: '01/01/2027',
  POSTING: 'Ganit Office',
  BASIC_PAY_M: '31,250',
  BASIC_PAY_Y: '3,75,000',
  HRA_M: '15,625',
  HRA_Y: '1,87,500',
  CONVEYANCE_M: '15,625',
  CONVEYANCE_Y: '1,87,500',
  TOTAL_FIXED_M: '62,500',
  TOTAL_FIXED_Y: '7,50,000',
  VARIABLE_PAY: '50,000',
  PF_M: '12,500',
  PF_Y: '1,50,000',
  GRATUITY_M: '4,167',
  GRATUITY_Y: '50,000',
  TOTAL_BENEFIT_M: '16,667',
  TOTAL_BENEFIT_Y: '2,00,000',
  MEDICAL_INSURANCE: '5,00,000',
  PERSONAL_ACCIDENT_INSURANCE: '10,00,000',
  TERM_INSURANCE: '20,00,000'
};

describe('generateDocx', () => {
  it('produces a non-empty docx buffer starting with the ZIP magic bytes', async () => {
    const buffer = await generateDocx(sampleValues, { RETENTION_PAY_LINE: false, RELOCATION_BONUS_LINE: false });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 2).toString('ascii')).toBe('PK');
  });

  it('produces a docx buffer when retention and relocation lines are included', async () => {
    const values = { ...sampleValues, RETENTION_PAY_AMOUNT: '1,00,000', RELOCATION_BONUS_AMOUNT: '50,000' };
    const buffer = await generateDocx(values, { RETENTION_PAY_LINE: true, RELOCATION_BONUS_LINE: true });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/generateDocx.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `backend/lib/generateDocx.js`:

```javascript
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType } from 'docx';

function labeledRow(label, value) {
  return new TableRow({
    children: [
      new TableCell({ children: [new Paragraph(label)] }),
      new TableCell({ children: [new Paragraph(value)] })
    ]
  });
}

function compensationRow(label, monthly, yearly) {
  return new TableRow({
    children: [
      new TableCell({ children: [new Paragraph(label)] }),
      new TableCell({ children: [new Paragraph(`₹ ${monthly}`)] }),
      new TableCell({ children: [new Paragraph(`₹ ${yearly}`)] })
    ]
  });
}

/**
 * Builds a .docx buffer covering the same content as the PDF:
 * candidate/offer details, compensation breakdown table (with optional
 * retention/relocation lines), and insurance coverage.
 */
export async function generateDocx(values, flags) {
  const children = [
    new Paragraph({ text: 'OFFER LETTER', heading: HeadingLevel.TITLE }),
    new Paragraph(`Ref: ${values.REF_NUMBER}    Date: ${values.OFFER_DATE}`),
    new Paragraph(''),
    new Paragraph(`Dear ${values.NAME},`),
    new Paragraph(
      `We are pleased to offer you a full-time role as ${values.ROLE} at Ganit Business Solutions Pvt. Ltd. ` +
      `Your potential annual Compensation of INR ${values.CTC_NUM} (${values.CTC_WORDS}). ` +
      `You will join Ganit on ${values.DOJ} and your position is work from ${values.POSTING} and not remote.`
    ),
    new Paragraph(''),
    new Paragraph({ text: 'Annexure 2 - Compensation Structure', heading: HeadingLevel.HEADING_1 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        labeledRow('Name', values.NAME),
        labeledRow('Date of Joining', values.DOJ),
        labeledRow('Designation', values.ROLE),
        labeledRow('CTC (Per Annum) ₹', values.CTC_NUM)
      ]
    }),
    new Paragraph(''),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Component')] }),
            new TableCell({ children: [new Paragraph('Monthly')] }),
            new TableCell({ children: [new Paragraph('Yearly')] })
          ]
        }),
        compensationRow('Basic Pay', values.BASIC_PAY_M, values.BASIC_PAY_Y),
        compensationRow('House Rent Allowance', values.HRA_M, values.HRA_Y),
        compensationRow('Conveyance Allowance', values.CONVEYANCE_M, values.CONVEYANCE_Y),
        compensationRow('Total Fixed Pay Component', values.TOTAL_FIXED_M, values.TOTAL_FIXED_Y),
        compensationRow('Variable Pay #', '', values.VARIABLE_PAY),
        compensationRow('PF Employer Contribution', values.PF_M, values.PF_Y),
        compensationRow('Gratuity Benefits', values.GRATUITY_M, values.GRATUITY_Y),
        compensationRow('Total Benefit Component', values.TOTAL_BENEFIT_M, values.TOTAL_BENEFIT_Y)
      ]
    })
  ];

  if (flags.RETENTION_PAY_LINE) {
    children.push(new Paragraph(''));
    children.push(new Paragraph(`Retention Pay* (Yearly): ₹ ${values.RETENTION_PAY_AMOUNT}`));
  }

  if (flags.RELOCATION_BONUS_LINE) {
    children.push(new Paragraph(''));
    children.push(new Paragraph(`Relocation Bonus** (Yearly): ₹ ${values.RELOCATION_BONUS_AMOUNT}`));
  }

  children.push(new Paragraph(''));
  children.push(new Paragraph({ text: 'Insurance Coverage', heading: HeadingLevel.HEADING_2 }));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      labeledRow('Medical Insurance', `₹ ${values.MEDICAL_INSURANCE}`),
      labeledRow('Personal Accident Insurance', `₹ ${values.PERSONAL_ACCIDENT_INSURANCE}`),
      labeledRow('Term Insurance', `₹ ${values.TERM_INSURANCE}`)
    ]
  }));

  if (flags.RETENTION_PAY_LINE) {
    children.push(new Paragraph({
      children: [new TextRun({
        text: '* Retention pay will be prorated & paid during June & December payroll. Any payout must be reimbursed if you resign within 12 months from the date of joining.',
        size: 16
      })]
    }));
  }

  if (flags.RELOCATION_BONUS_LINE) {
    children.push(new Paragraph({
      children: [new TextRun({
        text: '** Relocation bonus will be paid during the subsequent payroll after employees complete 1 month from date of joining and will be recovered if you resign within 12 months from the date of joining.',
        size: 16
      })]
    }));
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/generateDocx.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/lib/generateDocx.js backend/lib/generateDocx.test.js
git commit -m "feat: add generateDocx for Word offer letter output"
```

---

## Task 13: Express server with `/api/preview` and `/api/generate`

**Files:**
- Create: `backend/server.js`
- Test: `backend/server.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/server.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './server.js';

const validPayload = {
  candidateName: 'Jane Doe',
  candidateEmail: 'jane@example.com',
  candidateContact: '+919876543210',
  designation: 'Senior Data Scientist',
  ctcLakhs: 12.5,
  dateOfJoining: '2027-01-01',
  postingLocation: 'ganit_office',
  retentionPay: { mode: 'manual', amount: 0 },
  relocationBonus: { mode: 'manual', amount: 0 }
};

describe('POST /api/preview', () => {
  it('returns computed values for a valid payload', async () => {
    const res = await request(app).post('/api/preview').send(validPayload);
    expect(res.status).toBe(200);
    expect(res.body.values.NAME).toBe('Jane Doe');
    expect(res.body.values.CTC_WORDS).toBe('Twelve lakh fifty thousand');
    expect(res.body.flags.RETENTION_PAY_LINE).toBe(false);
  });

  it('returns 400 for an invalid payload', async () => {
    const res = await request(app).post('/api/preview').send({ ...validPayload, candidateEmail: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe('POST /api/generate', () => {
  it('returns a zip containing pdf and docx for a valid payload', async () => {
    const res = await request(app).post('/api/generate').send(validPayload);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(res.body.length).toBeGreaterThan(0);
  }, 30000);

  it('returns 400 for an invalid payload without generating documents', async () => {
    const res = await request(app).post('/api/generate').send({ ...validPayload, ctcLakhs: 500 });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `backend/`): `npx vitest run server.test.js`
Expected: FAIL — module not found, and `supertest` not yet imported successfully until installed (it was installed in Task 1).

- [ ] **Step 3: Install the zip dependency**

Run (from `backend/`):
```bash
npm install archiver
```

- [ ] **Step 4: Write the implementation**

Create `backend/server.js`:

```javascript
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';
import { OfferLetterInputSchema } from './lib/validate.js';
import { buildOfferData } from './lib/buildOfferData.js';
import { renderTemplate } from './lib/renderTemplate.js';
import { generatePdf } from './lib/generatePdf.js';
import { generateDocx } from './lib/generateDocx.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();
app.use(express.json());

app.post('/api/preview', (req, res) => {
  const parsed = OfferLetterInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }

  const { values, flags } = buildOfferData(parsed.data);
  res.json({ values, flags });
});

app.post('/api/generate', async (req, res) => {
  const parsed = OfferLetterInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }

  try {
    const { values, flags } = buildOfferData(parsed.data);
    const templatePath = path.join(__dirname, 'templates', 'offer-letter.html');
    const templateHtml = await fs.readFile(templatePath, 'utf-8');
    const filledHtml = renderTemplate(templateHtml, values, flags);

    const [pdfBuffer, docxBuffer] = await Promise.all([
      generatePdf(filledHtml),
      generateDocx(values, flags)
    ]);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="offer-letter.zip"');

    const archive = archiver('zip');
    archive.pipe(res);
    archive.append(pdfBuffer, { name: 'offer-letter.pdf' });
    archive.append(docxBuffer, { name: 'offer-letter.docx' });
    await archive.finalize();
  } catch (error) {
    console.error('Document generation failed:', error);
    res.status(500).json({ error: 'Document generation failed' });
  }
});

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Offer letter backend listening on port ${PORT}`);
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run (from `backend/`): `NODE_ENV=test npx vitest run server.test.js`
Expected: PASS (4 tests; the generate tests take longer due to Puppeteer)

- [ ] **Step 6: Commit**

```bash
git add backend/server.js backend/server.test.js backend/package.json backend/package-lock.json
git commit -m "feat: add Express server with preview and generate endpoints"
```

---

## Task 14: Frontend project scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/.gitignore`

- [ ] **Step 1: Scaffold with Vite**

Run (from the repo root):
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

- [ ] **Step 2: Verify `vite.config.js` proxies API calls to the backend**

Read `frontend/vite.config.js` (created by the scaffold) and edit it to add a dev proxy:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
```

- [ ] **Step 3: Confirm `.gitignore` excludes `node_modules` and `dist`**

Check `frontend/.gitignore` (Vite scaffolds this by default) contains at least:
```
node_modules
dist
```
If missing, add them.

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "chore: scaffold frontend Vite/React project"
```

---

## Task 15: API client module

**Files:**
- Create: `frontend/src/api.js`

- [ ] **Step 1: Write the implementation**

No backend is mocked for this file — it is a thin fetch wrapper, verified manually in Task 17's browser smoke test rather than unit-tested, since its only logic is passing data through `fetch`.

Create `frontend/src/api.js`:

```javascript
export async function fetchPreview(formData) {
  const res = await fetch('/api/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });

  const body = await res.json();
  if (!res.ok) {
    const error = new Error('Preview request failed');
    error.fieldErrors = body.errors;
    throw error;
  }
  return body;
}

export async function fetchGeneratedDocuments(formData) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });

  if (!res.ok) {
    const body = await res.json();
    const error = new Error('Generate request failed');
    error.fieldErrors = body.errors;
    throw error;
  }

  return res.blob();
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api.js
git commit -m "feat: add frontend API client for preview and generate endpoints"
```

---

## Task 16: Form + live preview + generate button (`App.jsx`)

**Files:**
- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/App.css`

- [ ] **Step 1: Replace the scaffolded `App.jsx`**

Overwrite `frontend/src/App.jsx` (the Vite scaffold's default counter demo) with:

```jsx
import { useState, useEffect, useRef } from 'react';
import { fetchPreview, fetchGeneratedDocuments } from './api.js';
import './App.css';

const initialFormData = {
  candidateName: '',
  candidateEmail: '',
  candidateContact: '',
  designation: '',
  ctcLakhs: '',
  dateOfJoining: '',
  postingLocation: 'ganit_office',
  retentionPay: { mode: 'manual', amount: '' },
  relocationBonus: { mode: 'manual', amount: '' }
};

function toApiPayload(formData) {
  return {
    ...formData,
    ctcLakhs: Number(formData.ctcLakhs) || 0,
    retentionPay: {
      mode: formData.retentionPay.mode,
      amount: formData.retentionPay.amount === '' ? 0 : Number(formData.retentionPay.amount)
    },
    relocationBonus: {
      mode: formData.relocationBonus.mode,
      amount: formData.relocationBonus.amount === '' ? 0 : Number(formData.relocationBonus.amount)
    }
  };
}

function isFormComplete(formData) {
  return (
    formData.candidateName.trim() !== '' &&
    formData.candidateEmail.trim() !== '' &&
    formData.candidateContact.trim() !== '' &&
    formData.designation.trim() !== '' &&
    formData.ctcLakhs !== '' &&
    formData.dateOfJoining !== ''
  );
}

export default function App() {
  const [formData, setFormData] = useState(initialFormData);
  const [preview, setPreview] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!isFormComplete(formData)) {
      setPreview(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await fetchPreview(toApiPayload(formData));
        setPreview(result);
        setFieldErrors({});
      } catch (err) {
        setFieldErrors(err.fieldErrors || {});
        setPreview(null);
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [formData]);

  function updateField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function updateOptionalBenefit(field, key, value) {
    setFormData((prev) => ({
      ...prev,
      [field]: { ...prev[field], [key]: value }
    }));
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const blob = await fetchGeneratedDocuments(toApiPayload(formData));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'offer-letter.zip';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setGenerateError('Failed to generate documents. Please check the form and try again.');
      setFieldErrors(err.fieldErrors || {});
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="app">
      <h1>Ganit Offer Letter Generator</h1>
      <div className="layout">
        <form className="form" onSubmit={(e) => e.preventDefault()}>
          <label>
            Candidate Name
            <input value={formData.candidateName} onChange={(e) => updateField('candidateName', e.target.value)} />
            {fieldErrors.candidateName && <span className="error">{fieldErrors.candidateName[0]}</span>}
          </label>

          <label>
            Email
            <input type="email" value={formData.candidateEmail} onChange={(e) => updateField('candidateEmail', e.target.value)} />
            {fieldErrors.candidateEmail && <span className="error">{fieldErrors.candidateEmail[0]}</span>}
          </label>

          <label>
            Contact
            <input value={formData.candidateContact} onChange={(e) => updateField('candidateContact', e.target.value)} placeholder="+919876543210" />
            {fieldErrors.candidateContact && <span className="error">{fieldErrors.candidateContact[0]}</span>}
          </label>

          <label>
            Role / Designation
            <input value={formData.designation} onChange={(e) => updateField('designation', e.target.value)} />
            {fieldErrors.designation && <span className="error">{fieldErrors.designation[0]}</span>}
          </label>

          <label>
            CTC (LPA)
            <input type="number" step="0.1" value={formData.ctcLakhs} onChange={(e) => updateField('ctcLakhs', e.target.value)} />
            {fieldErrors.ctcLakhs && <span className="error">{fieldErrors.ctcLakhs[0]}</span>}
          </label>

          <label>
            Date of Joining
            <input type="date" value={formData.dateOfJoining} onChange={(e) => updateField('dateOfJoining', e.target.value)} />
            {fieldErrors.dateOfJoining && <span className="error">{fieldErrors.dateOfJoining[0]}</span>}
          </label>

          <label>
            Posting Location
            <select value={formData.postingLocation} onChange={(e) => updateField('postingLocation', e.target.value)}>
              <option value="client_office">Client Office</option>
              <option value="ganit_office">Ganit Office</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>

          <fieldset>
            <legend>Retention Pay (optional)</legend>
            <label className="inline">
              <input
                type="radio"
                name="retentionMode"
                checked={formData.retentionPay.mode === 'manual'}
                onChange={() => updateOptionalBenefit('retentionPay', 'mode', 'manual')}
              />
              Manual
            </label>
            <label className="inline">
              <input
                type="radio"
                name="retentionMode"
                checked={formData.retentionPay.mode === 'auto'}
                onChange={() => updateOptionalBenefit('retentionPay', 'mode', 'auto')}
              />
              Auto (formula pending)
            </label>
            {formData.retentionPay.mode === 'manual' && (
              <input
                type="number"
                placeholder="Yearly amount, leave blank to omit"
                value={formData.retentionPay.amount}
                onChange={(e) => updateOptionalBenefit('retentionPay', 'amount', e.target.value)}
              />
            )}
          </fieldset>

          <fieldset>
            <legend>Relocation Bonus (optional)</legend>
            <label className="inline">
              <input
                type="radio"
                name="relocationMode"
                checked={formData.relocationBonus.mode === 'manual'}
                onChange={() => updateOptionalBenefit('relocationBonus', 'mode', 'manual')}
              />
              Manual
            </label>
            <label className="inline">
              <input
                type="radio"
                name="relocationMode"
                checked={formData.relocationBonus.mode === 'auto'}
                onChange={() => updateOptionalBenefit('relocationBonus', 'mode', 'auto')}
              />
              Auto (formula pending)
            </label>
            {formData.relocationBonus.mode === 'manual' && (
              <input
                type="number"
                placeholder="Yearly amount, leave blank to omit"
                value={formData.relocationBonus.amount}
                onChange={(e) => updateOptionalBenefit('relocationBonus', 'amount', e.target.value)}
              />
            )}
          </fieldset>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!preview || generating}
          >
            {generating ? 'Generating...' : 'Generate Offer Letter'}
          </button>
          {generateError && <p className="error">{generateError}</p>}
        </form>

        <div className="preview">
          <h2>Preview</h2>
          {!preview && <p className="muted">Fill in the required fields to see a preview.</p>}
          {preview && (
            <dl>
              <dt>Reference Number</dt><dd>{preview.values.REF_NUMBER}</dd>
              <dt>Offer Date</dt><dd>{preview.values.OFFER_DATE}</dd>
              <dt>CTC</dt><dd>₹{preview.values.CTC_NUM} ({preview.values.CTC_WORDS})</dd>
              <dt>Total Fixed Pay (Yearly)</dt><dd>₹{preview.values.TOTAL_FIXED_Y}</dd>
              <dt>Variable Pay (Yearly)</dt><dd>₹{preview.values.VARIABLE_PAY}</dd>
              <dt>Total Benefit (Yearly)</dt><dd>₹{preview.values.TOTAL_BENEFIT_Y}</dd>
              <dt>Insurance</dt>
              <dd>
                Medical ₹{preview.values.MEDICAL_INSURANCE}, PA ₹{preview.values.PERSONAL_ACCIDENT_INSURANCE}, Term ₹{preview.values.TERM_INSURANCE}
              </dd>
              {preview.flags.RETENTION_PAY_LINE && (
                <>
                  <dt>Retention Pay (Yearly)</dt><dd>₹{preview.values.RETENTION_PAY_AMOUNT}</dd>
                </>
              )}
              {preview.flags.RELOCATION_BONUS_LINE && (
                <>
                  <dt>Relocation Bonus (Yearly)</dt><dd>₹{preview.values.RELOCATION_BONUS_AMOUNT}</dd>
                </>
              )}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the stylesheet**

Create `frontend/src/App.css`:

```css
:root {
  --primary: #1a00d9;
  --secondary: #fe6e06;
  --light: #dbeaff;
}

* { box-sizing: border-box; }

body { margin: 0; font-family: 'Inter', system-ui, sans-serif; background: #f9fafb; }

.app { max-width: 1100px; margin: 0 auto; padding: 24px; }

h1 { color: var(--primary); }

.layout { display: flex; gap: 24px; flex-wrap: wrap; }

.form { flex: 1 1 400px; display: flex; flex-direction: column; gap: 14px; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }

.form label { display: flex; flex-direction: column; gap: 4px; font-size: 14px; font-weight: 500; }

.form label.inline { flex-direction: row; align-items: center; gap: 6px; font-weight: normal; }

.form input, .form select { padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }

.form fieldset { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }

.form button { padding: 10px; background: var(--secondary); color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }

.form button:disabled { background: #d1d5db; cursor: not-allowed; }

.error { color: #ef4444; font-size: 12px; }

.preview { flex: 1 1 350px; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }

.preview dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; font-size: 14px; }

.preview dt { font-weight: 600; color: #4b5563; }

.preview dd { margin: 0; }

.muted { color: #9ca3af; }
```

- [ ] **Step 3: Manually verify in the browser**

Run in two terminals:
```bash
cd backend && npm run dev
```
```bash
cd frontend && npm run dev
```

Open the printed Vite URL (typically `http://localhost:5173`). Fill in all required fields with sample data (e.g. CTC `12.5`, a future date). Confirm the preview panel populates. Leave Retention Pay and Relocation Bonus blank, click "Generate Offer Letter," and confirm a zip downloads containing `offer-letter.pdf` and `offer-letter.docx`. Open both files and confirm neither shows a Retention Pay or Relocation Bonus line. Then enter `100000` in Retention Pay (Manual), regenerate, and confirm the line and its footnote now appear in both files while Relocation Bonus remains absent.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx frontend/src/App.css
git commit -m "feat: add offer letter form with live preview and document generation"
```

---

## Task 17: Root-level dev convenience scripts and README

**Files:**
- Create: `package.json` (repo root)
- Create: `README.md`

- [ ] **Step 1: Create a root `package.json` with a combined dev script**

Run (from the repo root):
```bash
npm init -y
```

Edit the generated `package.json` to:

```json
{
  "name": "offer-letter-automation",
  "private": true,
  "scripts": {
    "dev:backend": "npm run dev --prefix backend",
    "dev:frontend": "npm run dev --prefix frontend",
    "test:backend": "npm test --prefix backend"
  }
}
```

- [ ] **Step 2: Write the README**

Create `README.md`:

```markdown
# Ganit Offer Letter Generator (MVP)

Local tool for generating Ganit offer letters (PDF + Word) from the real
company template. See `docs/superpowers/specs/2026-09-01-offer-letter-generator-mvp-design.md`
for the full design and `docs/superpowers/plans/2026-09-01-offer-letter-generator-mvp.md`
for the implementation plan.

## Running locally

Two terminals:

\`\`\`bash
npm run dev:backend   # starts the Express API on port 3001
npm run dev:frontend  # starts the Vite dev server, proxies /api to the backend
\`\`\`

Open the URL Vite prints (typically http://localhost:5173).

## Running backend tests

\`\`\`bash
npm run test:backend
\`\`\`

## Known MVP limitations

- No authentication, database, or cloud storage — everything runs locally and in-memory.
- The reference number counter resets on backend restart.
- CTC breakdown percentages and default insurance amounts are placeholder
  values in `backend/config/compensation.js`, pending real numbers from
  Ganit HR.
- Retention Pay / Relocation Bonus "Auto" mode is wired in the UI but not
  yet functional — the underlying formula has not been provided. Use
  "Manual" mode until then.
```

- [ ] **Step 3: Commit**

```bash
git add package.json README.md
git commit -m "docs: add root dev scripts and README"
```

---

## Task 18: Full backend test suite run

**Files:** none (verification only)

- [ ] **Step 1: Run the complete backend test suite**

Run (from `backend/`): `NODE_ENV=test npx vitest run`
Expected: All tests across `config/compensation.test.js`, `lib/ctcToWords.test.js`, `lib/compute.test.js`, `lib/validate.test.js`, `lib/renderTemplate.test.js`, `lib/buildOfferData.test.js`, `lib/generatePdf.test.js`, `lib/generateDocx.test.js`, and `server.test.js` pass (approximately 42 tests total).

- [ ] **Step 2: If any test fails, fix the root cause before proceeding**

Do not skip or comment out a failing test. Trace it back to the implementation file for that task and correct the logic.

- [ ] **Step 3: Confirm working tree is clean**

Run: `git status`
Expected: no uncommitted changes (aside from `backend/node_modules`, `frontend/node_modules`, `frontend/dist` which are gitignored).

---

## Self-Review Notes

- **Spec coverage:** every in-scope MVP item from the design doc has a task — single-page form (Task 16), server-side computation of all auto-derived fields (Tasks 3–6, 10), live preview (Task 16 + `/api/preview` in Task 13), PDF+Word generation matching the real template (Tasks 8, 9, 11, 12, 13), optional Retention Pay/Relocation Bonus with independent visibility and Manual/Auto toggle (Tasks 6, 10, 16), unit tests throughout, and the manual smoke test comparing output to the source PDF (Task 16 Step 3).
- **Type consistency:** `resolveOptionalBenefit`'s `{ mode, manualAmount, ctcLakhs, formulaFn }` signature (Task 6) is used identically in `buildOfferData.js` (Task 10). The `values`/`flags` shape returned by `buildOfferData` (Task 10) matches what `renderTemplate` (Task 9), `generateDocx` (Task 12), and the `/api/preview` response consumed by `App.jsx` (Task 16) all expect — same key names (`RETENTION_PAY_LINE`, `RETENTION_PAY_AMOUNT`, etc.) throughout.
- **No placeholders:** all code blocks are complete and runnable as written; the only "pending" items (CTC formula percentages, insurance amounts, retention/relocation auto-formulas) are explicitly modeled as swappable config/stub functions per the approved spec, not left as TODOs in the plan itself.
