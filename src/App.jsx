import { useState } from 'react';
import logoUrl from './assets/LOGO.png';
import OfferLetterForm from './components/OfferLetterForm';
import PDFPreview from './components/PDFPreview';
import OfferDetailsTable from './components/OfferDetailsTable';
import { generateOfferDocx } from './utils/docxGenerator';
import { calculateCTCBreakdown } from './utils/calculator';
import { formatCurrency } from './utils/formatters';
import {
  addOfferRecord,
  loadOfferRecords,
  saveOfferRecords,
  updateOfferRecord
} from './utils/offerRecords';
import './styles/App.css';

export default function App() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    fixedPay: '',
    variableAmount: '',
    doj: '',
    posting: '',
    retentionAmount: '',
    relocationAmount: '',
    joiningBonusAmount: ''
  });

  const [breakdown, setBreakdown] = useState(null);
  const [error, setError] = useState('');
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const [view, setView] = useState('generate');
  const [offerRecords, setOfferRecords] = useState(() => loadOfferRecords());

  function commitOfferRecords(next) {
    setOfferRecords(next);
    saveOfferRecords(next);
  }

  const handleOfferRecordUpdate = (id, changes) => {
    commitOfferRecords(updateOfferRecord(offerRecords, id, changes));
  };

  function recalculate(data) {
    if (!data.fixedPay) {
      setBreakdown(null);
      return;
    }
    try {
      const calc = calculateCTCBreakdown(
        parseFloat(data.fixedPay),
        data.variableAmount ? parseFloat(data.variableAmount) : 0,
        data.retentionAmount ? parseFloat(data.retentionAmount) : 0,
        data.relocationAmount ? parseFloat(data.relocationAmount) : 0,
        data.joiningBonusAmount ? parseFloat(data.joiningBonusAmount) : 0
      );
      setBreakdown(calc);
    } catch (err) {
      setError('Error calculating compensation');
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    setError('');

    if (
      name === 'fixedPay' ||
      name === 'variableAmount' ||
      name === 'retentionAmount' ||
      name === 'relocationAmount' ||
      name === 'joiningBonusAmount'
    ) {
      recalculate(newData);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required';
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'Valid email required';
    if (!formData.phone.match(/^\+?[1-9]\d{1,14}$/)) return 'Valid phone required';
    if (!formData.role.trim()) return 'Designation is required';
    if (!formData.fixedPay || parseFloat(formData.fixedPay) <= 0) {
      return 'Valid fixed pay required';
    }
    if (formData.variableAmount === '' || parseFloat(formData.variableAmount) < 0) {
      return 'Variable pay is required (enter 0 if none)';
    }
    if (!formData.doj) return 'Date of joining is required';
    if (!formData.posting.trim()) return 'Posting location is required';

    return '';
  };

  const handleDownloadDocx = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setGeneratingDocx(true);
    setError('');
    try {
      const saved = await generateOfferDocx(formData, breakdown);
      // Only a letter that actually went out is recorded; cancelling the
      // save dialog leaves the register untouched.
      if (saved) commitOfferRecords(addOfferRecord(offerRecords, { ...formData, ctc: breakdown?.totalCTC }));
    } catch (err) {
      setError('Error generating Word document: ' + err.message);
      console.error(err);
    } finally {
      setGeneratingDocx(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <img src={logoUrl} alt="Ganit" className="logo" onError={(e) => { e.target.style.display = 'none'; }} />
        <div className="header-titles">
          <h1>Offer Letter Generator</h1>
          <p>Build a candidate offer and preview it instantly</p>
        </div>
        <nav className="header-nav" aria-label="Sections">
          <button
            type="button"
            className={`nav-tab${view === 'generate' ? ' active' : ''}`}
            aria-current={view === 'generate' ? 'page' : undefined}
            onClick={() => setView('generate')}
          >
            Generate Offer
          </button>
          <button
            type="button"
            className={`nav-tab${view === 'offers' ? ' active' : ''}`}
            aria-current={view === 'offers' ? 'page' : undefined}
            onClick={() => setView('offers')}
          >
            Offer Details
            {offerRecords.length > 0 && <span className="nav-count">{offerRecords.length}</span>}
          </button>
        </nav>
      </header>

      {view === 'offers' ? (
        <div className="offers-container">
          <div className="offers-section">
            <div className="section-heading">
              <h2>Offer Details</h2>
              <span className="section-caption">
                Added when an offer letter is downloaded · changes save automatically
              </span>
            </div>
            <OfferDetailsTable records={offerRecords} onUpdate={handleOfferRecordUpdate} />
          </div>
        </div>
      ) : (
        <div className="main-container">
          <div className="form-section">
            <div className="section-heading">
              <h2>Fill Details</h2>
              <span className="section-caption">All fields marked * are required</span>
            </div>
            {error && <div className="error-message">{error}</div>}

            <OfferLetterForm
              formData={formData}
              onChange={handleFormChange}
            />

            {breakdown && (
              <div className="ctc-summary">
                <div className="ctc-summary-head">
                  <span>Compensation Summary</span>
                  <span className="ctc-live-badge">Live</span>
                </div>
                <div className="ctc-summary-row">
                  <span>Fixed Pay</span>
                  <span>{formatCurrency(breakdown.fixedPay.yearly)}</span>
                </div>
                <div className="ctc-summary-row">
                  <span>Variable Pay</span>
                  <span>{formatCurrency(breakdown.variable.yearly)}</span>
                </div>
                {breakdown.optional.retention.show && (
                  <div className="ctc-summary-row">
                    <span>Retention Pay</span>
                    <span>{formatCurrency(breakdown.optional.retention.yearly)}</span>
                  </div>
                )}
                <div className="ctc-summary-row ctc-summary-total">
                  <span>CTC (Per Annum)</span>
                  <span>{formatCurrency(breakdown.totalCTC)}</span>
                </div>
                {breakdown.optional.relocation.show && (
                  <div className="ctc-summary-note">
                    Relocation bonus of {formatCurrency(breakdown.optional.relocation.yearly)} is
                    paid over and above the CTC.
                  </div>
                )}
                {breakdown.optional.joiningBonus.show && (
                  <div className="ctc-summary-note">
                    Joining bonus of {formatCurrency(breakdown.optional.joiningBonus.yearly)} is
                    paid over and above the CTC.
                  </div>
                )}
              </div>
            )}

            <div className="download-buttons">
              <button className="btn-download" onClick={handleDownloadDocx} disabled={generatingDocx}>
                {generatingDocx ? 'Generating...' : 'Download Offer Letter'}
              </button>
            </div>
          </div>

          <div className="preview-section">
            <div className="section-heading">
              <h2>Preview</h2>
              <span className="section-caption">Updates as you type</span>
            </div>
            {breakdown ? (
              <PDFPreview formData={formData} breakdown={breakdown} />
            ) : (
              <div className="preview-placeholder">
                <span className="preview-placeholder-icon" aria-hidden="true">📄</span>
                <strong>Nothing to preview yet</strong>
                <span>Enter the fixed pay to generate a live offer preview.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
