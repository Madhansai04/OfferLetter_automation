import { useState } from 'react';
import OfferLetterForm from './components/OfferLetterForm';
import PDFPreview from './components/PDFPreview';
import { generateOfferPDF } from './utils/pdfGenerator';
import { generateOfferDocx } from './utils/docxGenerator';
import { calculateCTCBreakdown } from './utils/calculator';
import './styles/App.css';

export default function App() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    ctc: '',
    variableAmount: '',
    doj: '',
    posting: '',
    retentionAmount: '',
    relocationAmount: ''
  });

  const [breakdown, setBreakdown] = useState(null);
  const [error, setError] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingDocx, setGeneratingDocx] = useState(false);

  function recalculate(data) {
    if (!data.ctc) {
      setBreakdown(null);
      return;
    }
    try {
      const calc = calculateCTCBreakdown(
        parseFloat(data.ctc),
        data.variableAmount ? parseFloat(data.variableAmount) : 0,
        data.retentionAmount ? parseFloat(data.retentionAmount) : 0,
        data.relocationAmount ? parseFloat(data.relocationAmount) : 0
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
      name === 'ctc' ||
      name === 'variableAmount' ||
      name === 'retentionAmount' ||
      name === 'relocationAmount'
    ) {
      recalculate(newData);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required';
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'Valid email required';
    if (!formData.phone.match(/^\+?[1-9]\d{1,14}$/)) return 'Valid phone required';
    if (!formData.role.trim()) return 'Designation is required';
    if (!formData.ctc || parseFloat(formData.ctc) <= 0) return 'Valid CTC required';
    if (formData.variableAmount === '' || parseFloat(formData.variableAmount) < 0) {
      return 'Variable pay is required (enter 0 if none)';
    }
    if (!formData.doj) return 'Date of joining is required';
    if (!formData.posting) return 'Posting location is required';

    const ctc = parseFloat(formData.ctc) * 100000;
    const deductions =
      (parseFloat(formData.variableAmount) || 0) +
      (parseFloat(formData.retentionAmount) || 0) +
      (parseFloat(formData.relocationAmount) || 0);
    if (deductions >= ctc) {
      return 'Variable + retention + relocation must be less than the CTC';
    }

    return '';
  };

  const handleDownloadPdf = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setGeneratingPdf(true);
    setError('');
    try {
      await generateOfferPDF(formData, breakdown);
    } catch (err) {
      setError('Error generating PDF: ' + err.message);
      console.error(err);
    } finally {
      setGeneratingPdf(false);
    }
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
      await generateOfferDocx(formData, breakdown);
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
        <img src="/LOGO.png" alt="Ganit" className="logo" onError={(e) => { e.target.style.display = 'none'; }} />
        <h1>Offer Letter Generator</h1>
      </header>

      <div className="main-container">
        <div className="form-section">
          <h2>Fill Details</h2>
          {error && <div className="error-message">{error}</div>}

          <OfferLetterForm
            formData={formData}
            onChange={handleFormChange}
          />

          <div className="download-buttons">
            <button className="btn-download" onClick={handleDownloadPdf} disabled={generatingPdf}>
              {generatingPdf ? 'Generating...' : 'Download PDF'}
            </button>
            <button className="btn-download btn-download-secondary" onClick={handleDownloadDocx} disabled={generatingDocx}>
              {generatingDocx ? 'Generating...' : 'Download Word'}
            </button>
          </div>
        </div>

        <div className="preview-section">
          <h2>Preview</h2>
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
