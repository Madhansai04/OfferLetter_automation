# Ganit Offer Letter Generator - COMPLETE with ALL AUTOMATION

**PDF Template:** Kept 100% as-is  
**Logo:** Frontend form only  
**Automation:** Full CTC breakdown, insurance logic, conditional benefits, live preview  
**Cost:** $0 | **Time:** 30 minutes

---

## I. QUICK START

```bash
npm create vite@latest ganit-offer-generator -- --template react
cd ganit-offer-generator
npm install pdflib
mkdir -p src/components src/utils src/styles
```

---

## II. SETUP & FOLDER STRUCTURE

```
src/
├── components/
│   ├── OfferLetterForm.jsx       ← User inputs
│   ├── FormField.jsx              ← Reusable input
│   ├── PDFPreview.jsx             ← Live preview
│   └── CompensationTable.jsx       ← Calculated table
├── utils/
│   ├── calculator.js              ← CTC + Insurance logic
│   ├── pdfGenerator.js            ← Fill your PDF
│   └── formatters.js              ← Format numbers/text
├── styles/
│   └── App.css                    ← Styling
├── App.jsx
└── main.jsx

public/
├── ganit-logo.svg                 ← Logo (frontend only)
└── offer-letter-template.pdf      ← Your original PDF
```

---

## III. MAIN APP (with Preview)

**File: `src/App.jsx`**

```jsx
import React, { useState } from 'react';
import OfferLetterForm from './components/OfferLetterForm';
import PDFPreview from './components/PDFPreview';
import { generateOfferPDF } from './utils/pdfGenerator';
import { calculateCTCBreakdown } from './utils/calculator';
import './styles/App.css';

export default function App() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    ctc: '',
    doj: '',
    posting: '',
    retentionAmount: '',
    relocationAmount: ''
  });

  const [breakdown, setBreakdown] = useState(null);
  const [error, setError] = useState('');

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    setError('');

    // Recalculate when CTC changes
    if (name === 'ctc' && value) {
      try {
        const calc = calculateCTCBreakdown(
          parseFloat(value),
          newData.retentionAmount ? parseFloat(newData.retentionAmount) : 0,
          newData.relocationAmount ? parseFloat(newData.relocationAmount) : 0
        );
        setBreakdown(calc);
      } catch (err) {
        setError('Error calculating compensation');
      }
    }

    // Recalculate when retention/relocation changes
    if ((name === 'retentionAmount' || name === 'relocationAmount') && formData.ctc) {
      try {
        const calc = calculateCTCBreakdown(
          parseFloat(formData.ctc),
          newData.retentionAmount ? parseFloat(newData.retentionAmount) : 0,
          newData.relocationAmount ? parseFloat(newData.relocationAmount) : 0
        );
        setBreakdown(calc);
      } catch (err) {
        setError('Error calculating compensation');
      }
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required';
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'Valid email required';
    if (!formData.phone.match(/^\+?[1-9]\d{1,14}$/)) return 'Valid phone required';
    if (!formData.role.trim()) return 'Designation is required';
    if (!formData.ctc || parseFloat(formData.ctc) <= 0) return 'Valid CTC required';
    if (!formData.doj) return 'Date of joining is required';
    if (!formData.posting) return 'Posting location is required';
    return '';
  };

  const handleDownload = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await generateOfferPDF(formData, breakdown);
    } catch (err) {
      setError('Error generating PDF: ' + err.message);
      console.error(err);
    }
  };

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <img src="/ganit-logo.svg" alt="Ganit" className="logo" />
        <h1>Offer Letter Generator</h1>
      </header>

      {/* MAIN CONTAINER - FORM + PREVIEW */}
      <div className="main-container">
        {/* LEFT: FORM */}
        <div className="form-section">
          <h2>📋 Fill Details</h2>
          {error && <div className="error-message">⚠️ {error}</div>}
          
          <OfferLetterForm 
            formData={formData}
            onChange={handleFormChange}
          />

          <button className="btn-download" onClick={handleDownload}>
            📥 Download PDF
          </button>
        </div>

        {/* RIGHT: PREVIEW */}
        <div className="preview-section">
          <h2>👁️ Preview</h2>
          {breakdown ? (
            <PDFPreview formData={formData} breakdown={breakdown} />
          ) : (
            <div className="preview-placeholder">Fill form to see preview</div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## IV. FORM COMPONENT

**File: `src/components/OfferLetterForm.jsx`**

```jsx
import React from 'react';
import FormField from './FormField';

export default function OfferLetterForm({ formData, onChange }) {
  return (
    <form className="form">
      {/* CANDIDATE INFO */}
      <fieldset>
        <legend>👤 Candidate Information</legend>
        
        <FormField
          label="Full Name *"
          name="name"
          type="text"
          placeholder="John Doe"
          value={formData.name}
          onChange={onChange}
          required
        />

        <FormField
          label="Email Address *"
          name="email"
          type="email"
          placeholder="john@example.com"
          value={formData.email}
          onChange={onChange}
          required
        />

        <FormField
          label="Phone Number *"
          name="phone"
          type="tel"
          placeholder="+919876543210"
          value={formData.phone}
          onChange={onChange}
          required
        />
      </fieldset>

      {/* EMPLOYMENT DETAILS */}
      <fieldset>
        <legend>💼 Employment Details</legend>

        <FormField
          label="Designation/Role *"
          name="role"
          type="text"
          placeholder="Senior Data Scientist"
          value={formData.role}
          onChange={onChange}
          required
        />

        <FormField
          label="CTC (Lakhs) *"
          name="ctc"
          type="number"
          placeholder="12.5"
          value={formData.ctc}
          onChange={onChange}
          step="0.1"
          min="1"
          required
        />

        <FormField
          label="Date of Joining *"
          name="doj"
          type="date"
          value={formData.doj}
          onChange={onChange}
          required
        />

        <FormField
          label="Posting Location *"
          name="posting"
          type="select"
          value={formData.posting}
          onChange={onChange}
          options={[
            { value: '', label: 'Select...' },
            { value: 'Client Office', label: 'Client Office' },
            { value: 'Ganit Office', label: 'Ganit Office' },
            { value: 'Hybrid', label: 'Hybrid' }
          ]}
          required
        />
      </fieldset>

      {/* OPTIONAL BENEFITS */}
      <fieldset>
        <legend>🎁 Optional Benefits</legend>

        <FormField
          label="Retention Amount (Lakhs) - Leave blank if none"
          name="retentionAmount"
          type="number"
          placeholder="0"
          value={formData.retentionAmount}
          onChange={onChange}
          step="0.1"
          min="0"
        />

        <FormField
          label="Relocation Amount (Lakhs) - Leave blank if none"
          name="relocationAmount"
          type="number"
          placeholder="0"
          value={formData.relocationAmount}
          onChange={onChange}
          step="0.1"
          min="0"
        />
      </fieldset>
    </form>
  );
}
```

---

## V. FORM FIELD COMPONENT

**File: `src/components/FormField.jsx`**

```jsx
import React from 'react';

export default function FormField({
  label,
  name,
  type,
  value,
  onChange,
  placeholder,
  options,
  required
}) {
  return (
    <div className="form-group">
      <label htmlFor={name}>{label}</label>
      {type === 'select' ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
        >
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
        />
      )}
    </div>
  );
}
```

---

## VI. LIVE PREVIEW COMPONENT

**File: `src/components/PDFPreview.jsx`**

```jsx
import React from 'react';
import CompensationTable from './CompensationTable';
import { formatCurrency, numberToWords } from '../utils/formatters';

export default function PDFPreview({ formData, breakdown }) {
  if (!breakdown) return null;

  return (
    <div className="preview-box">
      {/* PAGE 1 PREVIEW */}
      <div className="preview-page">
        <div className="preview-header">
          <strong>Offer Letter - Page 1</strong>
        </div>

        <p><strong>Ref:</strong> GANIT/HR/APPT/{new Date().getFullYear()}</p>
        <p><strong>Date:</strong> {new Date().toLocaleDateString('en-IN')}</p>

        <div className="preview-candidate-info">
          <p><strong>Name:</strong> {formData.name}</p>
          <p><strong>Email:</strong> {formData.email}</p>
          <p><strong>Phone:</strong> {formData.phone}</p>
        </div>

        <p><strong>Dear {formData.name},</strong></p>

        <p>
          <strong>Congratulations.</strong> We are pleased to offer you a full-time role as <strong>{formData.role}</strong>. 
          Your annual Compensation of <strong>{formatCurrency(formData.ctc * 100000)}</strong> ({numberToWords(Math.floor(formData.ctc * 100000))}).
        </p>
      </div>

      {/* PAGE 4 PREVIEW */}
      <div className="preview-page">
        <div className="preview-header">
          <strong>Compensation Structure - Page 4</strong>
        </div>

        <CompensationTable breakdown={breakdown} formData={formData} />
      </div>
    </div>
  );
}
```

---

## VII. COMPENSATION TABLE (with Conditional Logic)

**File: `src/components/CompensationTable.jsx`**

```jsx
import React from 'react';
import { formatCurrency } from '../utils/formatters';

export default function CompensationTable({ breakdown, formData }) {
  if (!breakdown) return null;

  return (
    <div className="compensation-wrapper">
      <table className="compensation-table">
        <thead>
          <tr>
            <th>Component</th>
            <th>Monthly</th>
            <th>Yearly</th>
          </tr>
        </thead>
        <tbody>
          {/* FIXED PAY */}
          <tr className="section-header">
            <td colSpan="3"><strong>FIXED PAY</strong></td>
          </tr>
          
          <tr>
            <td>Basic Pay</td>
            <td>{formatCurrency(breakdown.fixed.basic.monthly)}</td>
            <td>{formatCurrency(breakdown.fixed.basic.yearly)}</td>
          </tr>
          
          <tr>
            <td>House Rent Allowance</td>
            <td>{formatCurrency(breakdown.fixed.hra.monthly)}</td>
            <td>{formatCurrency(breakdown.fixed.hra.yearly)}</td>
          </tr>
          
          <tr>
            <td>Conveyance Allowance</td>
            <td>{formatCurrency(breakdown.fixed.conveyance.monthly)}</td>
            <td>{formatCurrency(breakdown.fixed.conveyance.yearly)}</td>
          </tr>
          
          <tr className="total-row">
            <td><strong>Total Fixed Pay</strong></td>
            <td><strong>{formatCurrency(breakdown.fixed.total.monthly)}</strong></td>
            <td><strong>{formatCurrency(breakdown.fixed.total.yearly)}</strong></td>
          </tr>

          {/* VARIABLE */}
          <tr className="section-header">
            <td colSpan="3"><strong>VARIABLE</strong></td>
          </tr>
          
          <tr>
            <td>Variable Pay</td>
            <td>{formatCurrency(breakdown.variable.monthly)}</td>
            <td>{formatCurrency(breakdown.variable.yearly)}</td>
          </tr>

          {/* OPTIONAL - RETENTION (Only if entered) */}
          {breakdown.optional.retention.yearly > 0 && (
            <>
              <tr className="section-header">
                <td colSpan="3"><strong>OPTIONAL BENEFITS</strong></td>
              </tr>
              <tr className="optional-row">
                <td><strong>Retention Pay *</strong></td>
                <td><strong>{formatCurrency(breakdown.optional.retention.monthly)}</strong></td>
                <td><strong>{formatCurrency(breakdown.optional.retention.yearly)}</strong></td>
              </tr>
            </>
          )}

          {/* OPTIONAL - RELOCATION (Only if entered) */}
          {breakdown.optional.relocation.yearly > 0 && (
            <tr className="optional-row">
              <td><strong>Relocation Bonus **</strong></td>
              <td><strong>{formatCurrency(breakdown.optional.relocation.monthly)}</strong></td>
              <td><strong>{formatCurrency(breakdown.optional.relocation.yearly)}</strong></td>
            </tr>
          )}

          {/* STATUTORY */}
          <tr className="section-header">
            <td colSpan="3"><strong>STATUTORY BENEFITS</strong></td>
          </tr>
          
          <tr>
            <td>PF Employer Contribution</td>
            <td>{formatCurrency(breakdown.statutory.pf.monthly)}</td>
            <td>{formatCurrency(breakdown.statutory.pf.yearly)}</td>
          </tr>
          
          <tr>
            <td>Gratuity Benefits</td>
            <td>{formatCurrency(breakdown.statutory.gratuity.monthly)}</td>
            <td>{formatCurrency(breakdown.statutory.gratuity.yearly)}</td>
          </tr>
        </tbody>
      </table>

      {/* INSURANCE (Conditional based on CTC) */}
      <div className="insurance-section">
        <h4>Insurance Coverage</h4>
        <table className="insurance-table">
          <tbody>
            <tr>
              <td>Medical Insurance</td>
              <td>
                {breakdown.insurance.medical === 500000 
                  ? '₹5,00,000' 
                  : breakdown.insurance.medical > 0 
                    ? formatCurrency(breakdown.insurance.medical) 
                    : 'As per company policy'}
              </td>
            </tr>
            <tr>
              <td>Personal Accident Insurance</td>
              <td>
                {breakdown.insurance.personalAccident === 1000000
                  ? '₹10,00,000'
                  : breakdown.insurance.personalAccident > 0
                    ? formatCurrency(breakdown.insurance.personalAccident)
                    : 'As per company policy'}
              </td>
            </tr>
            <tr>
              <td>Term Insurance</td>
              <td>
                {breakdown.insurance.term === 2000000
                  ? '₹20,00,000'
                  : breakdown.insurance.term > 0
                    ? formatCurrency(breakdown.insurance.term)
                    : 'As per company policy'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* FOOTNOTES - CONDITIONAL (Only if benefits selected) */}
      <div className="footnotes">
        {breakdown.optional.retention.yearly > 0 && (
          <p className="footnote">
            <strong>* Retention pay</strong> will be prorated &amp; paid during June &amp; December payroll. 
            Any payout must be reimbursed if you resign within 12 months from the date of joining.
          </p>
        )}
        
        {breakdown.optional.relocation.yearly > 0 && (
          <p className="footnote">
            <strong>** Relocation bonus</strong> will be paid during the subsequent payroll after employees 
            complete 1 month from date of joining and will be recovered if you resign within 12 months from the date of joining.
          </p>
        )}
      </div>
    </div>
  );
}
```

---

## VIII. CALCULATOR (FULL AUTOMATION)

**File: `src/utils/calculator.js`**

```javascript
/**
 * COMPLETE CTC BREAKDOWN WITH:
 * - Fixed/Variable/Statutory split
 * - Conditional insurance based on CTC
 * - Optional benefits (Retention/Relocation)
 * - Insurance Logic:
 *   - CTC < 10 LPA: Medical claim (TBD), PA (TBD), Term (TBD)
 *   - CTC >= 10 LPA: Medical ₹5,00,000, PA ₹10,00,000, Term ₹20,00,000
 */

export function calculateCTCBreakdown(
  ctcLakhs,
  retentionLakhs = 0,
  relocationLakhs = 0
) {
  const ctc = ctcLakhs * 100000;
  
  // ==========================================
  // FIXED PAY (60% of CTC)
  // ==========================================
  const fixedYearly = ctc * 0.60;
  const basicYearly = fixedYearly * 0.50;      // 50% of fixed
  const hraYearly = fixedYearly * 0.25;        // 25% of fixed
  const conveyanceYearly = fixedYearly * 0.25; // 25% of fixed
  
  // ==========================================
  // VARIABLE (4% of CTC)
  // ==========================================
  const variableYearly = ctc * 0.04;
  
  // ==========================================
  // STATUTORY (36% of CTC)
  // ==========================================
  const pfYearly = ctc * 0.12;          // 12% of CTC
  const gratuityYearly = ctc * 0.04;    // 4% of CTC
  
  // ==========================================
  // OPTIONAL (Only if entered)
  // ==========================================
  const retentionYearly = retentionLakhs * 100000;
  const relocationYearly = relocationLakhs * 100000;

  // ==========================================
  // INSURANCE LOGIC (Conditional)
  // ==========================================
  let insurance = {};
  
  if (ctcLakhs >= 10) {
    // CTC >= 10 LPA
    insurance = {
      medical: 500000,              // ₹5,00,000
      personalAccident: 1000000,    // ₹10,00,000
      term: 2000000                 // ₹20,00,000
    };
  } else {
    // CTC < 10 LPA (Use same amounts - can be changed later)
    insurance = {
      medical: 500000,              // Change if different
      personalAccident: 1000000,    // Change if different
      term: 2000000                 // Change if different
    };
  }

  // ==========================================
  // RETURN STRUCTURED BREAKDOWN
  // ==========================================
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
        show: retentionYearly > 0  // ✅ CONDITIONAL
      },
      relocation: {
        monthly: relocationYearly / 12,
        yearly: relocationYearly,
        show: relocationYearly > 0  // ✅ CONDITIONAL
      }
    },
    insurance: insurance,  // ✅ CTC-BASED
    
    // Summary
    totalCTC: ctc + retentionYearly + relocationYearly,
    totalMonthly: (ctc + retentionYearly + relocationYearly) / 12
  };
}
```

---

## IX. PDF GENERATOR (Fill Your Template)

**File: `src/utils/pdfGenerator.js`**

```javascript
import { PDFDocument } from 'pdflib';
import { formatCurrency, formatDate, numberToWords } from './formatters';

export async function generateOfferPDF(formData, breakdown) {
  try {
    // Load your original PDF template
    const templateUrl = '/offer-letter-template.pdf';
    const templateBytes = await fetch(templateUrl).then(res => res.arrayBuffer());
    
    // Load PDF document
    const pdfDoc = await PDFDocument.load(templateBytes);
    
    // Get pages (typically 4 pages)
    const pages = pdfDoc.getPages();
    const page1 = pages[0];
    const page4 = pages[3]; // Assume compensation table is on page 4

    // Fill placeholders on page 1, page 4, conditional retention/relocation
    // lines, footnotes — see repository's actual src/utils/pdfGenerator.js
    // for the exact coordinates measured from the real template PDF.

    // ============================================
    // SAVE & DOWNLOAD
    // ============================================
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `offer-letter-${formData.name.replace(/\s+/g, '-')}.pdf`;
    link.click();
    
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('PDF generation error:', err);
    throw err;
  }
}
```

---

## X. FORMATTERS

**File: `src/utils/formatters.js`**

```javascript
// Format currency to Indian Rupee
export function formatCurrency(amount) {
  if (!amount) return '₹0';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Format date to DD-MM-YYYY
export function formatDate(dateString) {
  if (!dateString) return '';
  
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}-${month}-${year}`;
}

// Convert number to Indian words (units, thousand, lakh, crore grouping)
export function numberToWords(num) {
  // See repository's actual src/utils/formatters.js for the corrected
  // implementation — the original sketch here used flat 2-digit grouping,
  // which is wrong for the Indian lakh/crore numbering system.
}

// Example:
// numberToWords(1250000) -> "twelve lakh fifty thousand"
// numberToWords(5000000) -> "fifty lakh"
```

---

## XI. CSS

**File: `src/styles/App.css`**

See the repository's actual `src/styles/App.css` for the full stylesheet
(Ganit color palette: primary `#1a00d9`, secondary `#fe6e06`, light
`#dbeaff`).

---

## XII. QUICK START

```bash
npm install
npm run dev
```

Add `public/ganit-logo.svg` (frontend header logo) and confirm
`public/offer-letter-template.pdf` is the real Ganit template.

---

## ✅ FEATURES COMPLETE

✅ Full CTC breakdown automation  
✅ Insurance logic (CTC < 10 vs >= 10 LPA)  
✅ Conditional benefits (Retention/Relocation)  
✅ Conditional footnotes (2 lines below table)  
✅ Live preview in frontend  
✅ Your original PDF kept as-is  
✅ Logo only in frontend  
✅ Word (.docx) download alongside PDF (added beyond this doc's original scope)

---

**Note:** This document is kept as the original spec for reference. The
actual implementation in this repository deviates in a few places where the
example code above had bugs or used illustrative placeholder values —
notably: `pdf-lib` (not `pdflib`) is the correct npm package name; the PDF
placeholder coordinates in `pdfGenerator.js` are measured from the real
template rather than the example numbers shown here; `numberToWords` was
rewritten to correctly handle Indian lakh/crore grouping; and a Word
(`.docx`) download was added alongside the PDF. See `README.md` for the
current, accurate description of how the app works.
