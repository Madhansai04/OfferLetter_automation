import CompensationTable from './CompensationTable';
import { formatCurrency, formatDateSlashes, formatDateLong, numberToWords } from '../utils/formatters';

export default function PDFPreview({ formData, breakdown }) {
  if (!breakdown) return null;

  return (
    <div className="preview-box">
      <div className="preview-page">
        <div className="preview-header">
          <strong>Offer Letter - Page 1</strong>
        </div>

        <p><strong>Ref:</strong> GANIT/HR/APPT/{new Date().getFullYear()}</p>
        <p><strong>Date:</strong> {formatDateSlashes(new Date())}</p>

        <div className="preview-candidate-info">
          <p><strong>Name:</strong> {formData.name}</p>
          <p><strong>Email:</strong> {formData.email}</p>
          <p><strong>Phone:</strong> {formData.phone}</p>
        </div>

        <p><strong>Dear {formData.name},</strong></p>

        <p>
          <strong>Congratulations.</strong> We are pleased to offer you a full-time role as <strong>{formData.role}</strong>.
          Your annual Compensation of <strong>{formatCurrency(breakdown.totalCTC)}</strong> ({numberToWords(Math.floor(breakdown.totalCTC))}).
          You will join Ganit on <strong>{formatDateLong(formData.doj)}</strong> and your position is work from <strong>{formData.posting}</strong>.
        </p>
      </div>

      <div className="preview-page">
        <div className="preview-header">
          <strong>Compensation Structure - Page 4</strong>
        </div>

        <CompensationTable breakdown={breakdown} formData={formData} />
      </div>
    </div>
  );
}
