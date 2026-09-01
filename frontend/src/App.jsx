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
