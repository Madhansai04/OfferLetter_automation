# Ganit Offer Letter Generator — MVP Design

**Status:** Approved
**Date:** 2026-09-01

## Context

`GANIT_OFFER_LETTER_REQUIREMENTS.md`, `GANIT_BACKEND_IMPLEMENTATION.md`, `GANIT_FRONTEND_IMPLEMENTATION.md`, and `GANIT_PROJECT_INTEGRATION.md` describe a full production system (auth + MFA, encrypted PostgreSQL, S3 storage, email sending, audit logging, multi-step frontend, bulk generation, HRIS integration). That system is too large to design and build as a single project, and several of its business inputs (CTC formula, default insurance amounts, the actual offer letter document) were placeholders (`TBD`) in those docs.

The user has since provided the real offer letter template: `Ganit_Offer_Letter_Placeholder_Template.pdf`, a 4-page document already containing `{{PLACEHOLDER}}` tags. This design scopes and specs the **first buildable slice**: a local tool that fills that template and produces PDF + Word output. Auth, database, cloud storage, email, and bulk generation are explicitly deferred to later sub-projects.

## Real Template — Structure of Record

The actual template (not the illustrative one in the requirements docs) is the source of truth for what gets generated. It has 4 pages:

- **Page 1** — Letterhead, "OFFER LETTER" title, `Ref: GANIT/HR/APPT/{{YYYY}}-{{seq}}` / `Date: {{OFFER_DATE}}` row, Name/Email/Contact box, salutation "Dear {{NAME}}," an offer paragraph containing `{{ROLE}}`, `{{CTC_NUM}}`, `{{CTC_WORDS}}`, `{{DOJ}}`, `{{POSTING}}`, followed by static mission/culture/"what's exciting at Ganit" content that never changes.
- **Page 2** — Static acceptance-terms paragraph, signature block hardcoded to **Ashok Harwani, Co-Founder & Chief Growth Officer**, and a candidate Acceptance section (Name/Signature/Date, left blank for the candidate to fill by hand). Fully static — no placeholders.
- **Page 3** — Annexure 1, Terms & Conditions. Entirely static boilerplate: probation (6 months), leave (32 days: 22 paid + 10 holidays), annual appraisal cycle, background check, notice period (30 days probation / 90 days post-confirmation), 6-month minimum tenure commitment (10% of Annual Fixed Pay if broken), and the Retention clause — a **flat ₹1,00,000** reimbursement if the candidate resigns voluntarily within 12 months. No placeholders on this page.
- **Page 4** — Annexure 2, Compensation Structure table: `{{NAME}}`, `{{DOJ}}`, `{{ROLE}}`, `{{CTC_NUM}}`, then a Fixed Pay breakdown (Basic Pay, House Rent Allowance, Conveyance Allowance — each Monthly + Yearly), `{{TOTAL_FIXED_MONTHLY}}` / `{{TOTAL_FIXED_YEARLY}}`, `{{VARIABLE_PAY}}` (yearly only, footnoted as paid in Q1 of the following calendar year based on performance), PF Employer Contribution and Gratuity Benefits (Monthly + Yearly), `{{TOTAL_BENEFIT_MONTHLY}}` / `{{TOTAL_BENEFIT_YEARLY}}`, and an Insurance table (`{{MEDICAL_INSURANCE}}`, `{{PERSONAL_ACCIDENT_INSURANCE}}`, `{{TERM_INSURANCE}}`).

### Confirmed deviations from the original requirements docs

- **Retention Pay / Relocation Bonus are optional extra lines below the Annexure 2 table**, not rows inside it. Revised after reviewing the real template: it has no built-in rows for these, but the user wants them addable per-offer. If left blank, neither appears anywhere in the output (the static ₹1,00,000 Retention clause in Annexure 1 is unaffected either way — that clause is unconditional boilerplate, separate from this optional yearly amount). If an amount is provided for either, one extra line appears directly below the compensation table on Page 4, together with its footnote (see "Retention Pay & Relocation Bonus" section below).
- **Signatory is hardcoded**, not a dropdown. Only Ashok Harwani / Co-Founder & Chief Growth Officer appears in the real template.
- **CTC formula and insurance tier amounts are not present anywhere in the real template** (it just has blank/placeholder cells). These remain genuinely unknown business inputs. Per user decision, the MVP ships with illustrative placeholder values, isolated in one config file, clearly marked as pending real numbers from Ganit HR:
  - Fixed pay pool = 60% of CTC, split Basic 50% / HRA 25% / Conveyance 25% of that pool
  - Variable Pay = 4% of CTC
  - PF Employer Contribution = 12% of CTC
  - Gratuity = 4% of CTC
  - Insurance: default tier (CTC < 10 LPA) = Medical ₹3L / PA ₹5L / Term ₹10L; enhanced tier (CTC ≥ 10 LPA) = Medical ₹5L / PA ₹10L / Term ₹20L

## Retention Pay & Relocation Bonus (optional extra lines)

Two optional, independent amounts: **Retention Pay** and **Relocation Bonus**. Each is a single yearly figure (matching the style of Variable Pay, which is also yearly-only in the real template — no monthly split).

**Visibility rule:** if an amount is blank/zero, that line and its footnote are omitted entirely from both the PDF and Word output — nothing renders, no empty row, no dangling footnote marker. If an amount is present (non-zero), one line renders directly below the Annexure 2 compensation table, followed by its footnote text at the bottom of the page. The two are independent — either, both, or neither can appear.

**Footnote text** (reused verbatim from the original requirements doc):
- Retention Pay ( * ): "Retention pay will be prorated & paid during June & December payroll. Any payout must be reimbursed if you resign within 12 months from the date of joining."
- Relocation Bonus ( ** ): "Relocation bonus will be paid during the subsequent payroll after employees complete 1 month from date of joining and will be recovered if you resign within 12 months from the date of joining."

**Manual vs. formula-driven entry:** the form has a toggle per field — **Manual** or **Auto** — for each of Retention Pay and Relocation Bonus independently.
- **Manual mode** (MVP default): HR types the yearly amount directly into a numeric input.
- **Auto mode**: the amount is computed by a formula function instead of typed. The real formula is not yet known — it will be supplied after the rest of the app is built and tested. The MVP wires the toggle and the UI now, backed by a stub function (`calculateRetentionPay(ctcLakhs)` / `calculateRelocationBonus(ctcLakhs)` in `config/compensation.js`) that throws a clear "formula not yet configured" error if selected, so the toggle is visibly present but Auto mode is not usable until the formula is added later. Manual mode is fully functional today.
- Switching a field to Auto does not require also switching the other — each toggle is independent.

## Scope

**In scope (MVP):**
- Local web app: React frontend + Node/Express backend, run via `npm run dev`, no deployment/hosting concerns
- Single-page form capturing the 7 core inputs: Candidate Name, Email, Contact, Role/Designation, CTC (in LPA), Date of Joining, Posting Location (Client Office / Ganit Office / Hybrid)
- Optional Retention Pay and Relocation Bonus fields, each with a Manual/Auto toggle (Auto is stubbed pending a formula — see dedicated section above)
- Server-side computation of all auto-derived fields: offer date (today), reference number, CTC in words, full compensation breakdown, insurance tier
- Live preview pane in the UI reflecting computed values as the HR user types, including conditional retention/relocation lines and footnotes
- Generate PDF (Puppeteer, rendering an HTML template styled to match the real PDF) and Word (`docx` library) on demand, both downloadable
- Unit tests for the compute logic

**Out of scope (future sub-projects, not designed here):**
- Authentication, MFA, RBAC
- Database / persistence of past offers (reference number counter is in-memory and resets on restart — acceptable for MVP)
- Cloud storage (S3), email sending, offer tracking/status
- Bulk generation, template versioning, HRIS integration, e-signature
- Audit logging, encryption at rest, compliance features
- Real CTC formula and insurance amounts (business input still pending from Ganit HR — config is swappable when provided)
- Real Retention Pay / Relocation Bonus formulas (Auto mode is wired but non-functional until provided)

## Architecture

```
[React form + live preview] --POST JSON--> [Express API]
                                                |
                                    [lib/validate.js: zod schema]
                                                |
                                    [lib/compute.js: CTC breakdown,
                                     insurance tier, CTC-in-words,
                                     reference number]
                                                |
                                  +-------------+-------------+
                                  |                           |
                     [templates/offer-letter.html          [docx library:
                      + Puppeteer]                           build matching
                                  |                           .docx]
                              offer.pdf                   offer.docx
                                  |                           |
                                  +----- returned to client ---+
                                     (downloadable files)
```

## Components

- **`config/compensation.js`** — CTC breakdown percentages and insurance tier thresholds/amounts, isolated in one file with a comment flagging them as placeholder values pending confirmation from Ganit HR. Also holds the stubbed `calculateRetentionPay(ctcLakhs)` / `calculateRelocationBonus(ctcLakhs)` functions for Auto mode, each throwing a "formula not yet configured" error until real formulas are supplied.
- **`lib/compute.js`** — pure functions, no I/O:
  - `calculateCompensationBreakdown(ctcLakhs)` → Basic/HRA/Conveyance (monthly+yearly), Total Fixed, Variable Pay, PF, Gratuity, Total Benefit
  - `getInsuranceCoverage(ctcLakhs)` → tier-based Medical/PA/Term amounts
  - `ctcToWords(ctcRupees)` → Indian numbering words
  - `generateReferenceNumber()` → `GANIT/HR/APPT/{YYYY}-{seq}`, in-memory sequence counter
  - `resolveOptionalBenefit({ mode, manualAmount, ctcLakhs, formulaFn })` → returns the yearly amount to use (manual value, or formula result in Auto mode) or `null` if blank/zero, used identically for both Retention Pay and Relocation Bonus
- **`lib/validate.js`** — zod schema for the form inputs: the 7 core fields (name, email, phone, designation, CTC range 1–100 LPA, DOJ not in the past, posting location enum) plus optional `retentionPay` / `relocationBonus` objects (`{ mode: 'manual' | 'auto', amount?: number }`)
- **`templates/offer-letter.html`** — HTML/CSS template matching the real PDF's 4-page layout and static content verbatim (mission, culture, T&Cs, retention clause, etc.), with `{{PLACEHOLDER}}` tokens for the dynamic fields listed above, plus conditionally-rendered blocks for the Retention Pay / Relocation Bonus lines and footnotes
- **`routes/preview.js`** — `POST /api/preview`: validate → compute → return JSON of all computed values (no document rendering), used to drive the live preview pane
- **`routes/generate.js`** — `POST /api/generate`: validate → compute → render PDF (Puppeteer loads the filled HTML template) + DOCX (`docx` library, built to match the same content) → return both files
- **Frontend**: one form component (7 core fields + 2 optional fields, each with a Manual/Auto toggle) + a preview pane that calls `/api/preview` on change (debounced) + a "Generate" button that calls `/api/generate` and triggers browser downloads for both files

## Data Flow

1. HR user fills the form; each change (debounced) posts to `/api/preview`, which returns computed compensation/insurance/ref-number/CTC-words for display.
2. HR clicks "Generate Offer Letter."
3. Backend validates input, recomputes all derived values, fills the HTML template, renders it to PDF via Puppeteer, and separately builds a matching `.docx` via the `docx` library.
4. Both files are returned to the browser and downloaded directly — no server-side storage.

## Error Handling

- Invalid form input (bad email/phone, CTC out of 1–100 LPA range, DOJ in the past) is rejected client-side (immediate feedback) and re-validated server-side before generation; server validation failures return 400 with field-level messages.
- If Puppeteer or docx generation throws, the API returns 500 with a generic error message and logs the failure server-side (console logging is sufficient for MVP — no external error tracking).
- Reference number counter is process-local; a restart resets it to 1 for the current year. This is a known MVP limitation, not silently masked — documented here and in a code comment.

## Testing

- **Unit tests (`lib/compute.js`):**
  - `calculateCompensationBreakdown`: breakdown sums to CTC within tolerance, across a range of CTC values
  - `getInsuranceCoverage`: boundary behavior exactly at 10 LPA and just below/above
  - `ctcToWords`: edge cases (0, values under 1 lakh, exact lakhs, values requiring both lakhs and remainder)
  - `generateReferenceNumber`: format and sequential uniqueness within a run
  - `resolveOptionalBenefit`: blank/zero → `null` (line omitted); manual amount → returned as-is; Auto mode → throws until a formula is configured
- **Manual smoke test:** generate one PDF and one DOCX from sample input, visually compare against the source template PDF for layout/content fidelity. Includes three variants: neither optional benefit set, only one set, both set — confirming lines and footnotes appear/disappear correctly and independently.

## Open Items (explicitly deferred, not blocking this build)

- Real CTC breakdown formula and default/enhanced insurance amounts — config is swappable once Ganit HR provides these.
- Real Retention Pay / Relocation Bonus formulas for Auto mode — to be supplied after the rest of the app is built and tested; Manual mode is unaffected and fully usable today.
- Everything listed under "Out of scope" above — each would get its own brainstorming → spec → plan cycle when prioritized.
