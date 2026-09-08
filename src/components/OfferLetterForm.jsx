import FormField from './FormField';

export default function OfferLetterForm({ formData, onChange }) {
  return (
    <form className="form">
      <fieldset className="form-card">
        <legend>
          <span className="legend-step">1</span>
          <span className="legend-text">
            Candidate Information
            <small>Who the offer is for</small>
          </span>
        </legend>

        <div className="field-grid">
          <FormField
            label="Full Name"
            name="name"
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={onChange}
            required
            full
          />

          <FormField
            label="Email Address"
            name="email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={onChange}
            required
          />

          <FormField
            label="Phone Number"
            name="phone"
            type="tel"
            placeholder="+919876543210"
            value={formData.phone}
            onChange={onChange}
            required
          />

          <FormField
            label="Date of Joining"
            name="doj"
            type="date"
            value={formData.doj}
            onChange={onChange}
            required
          />

          <FormField
            label="Posting Location"
            name="posting"
            type="text"
            placeholder="Chennai"
            value={formData.posting}
            onChange={onChange}
            required
          />

          <FormField
            label="Designation/Role"
            name="role"
            type="text"
            placeholder="Senior Data Scientist"
            value={formData.role}
            onChange={onChange}
            required
            full
          />
        </div>
      </fieldset>

      <fieldset className="form-card">
        <legend>
          <span className="legend-step">2</span>
          <span className="legend-text">
            Compensation Details
            <small>Annual pay structure</small>
          </span>
        </legend>

        <div className="field-grid">
          <FormField
            label="Fixed Pay"
            name="fixedPay"
            type="number"
            format="indian"
            placeholder="4,50,000"
            value={formData.fixedPay}
            onChange={onChange}
            step="1000"
            min="1"
            required
            prefix="₹"
            hint="Annual fixed component"
          />

          <FormField
            label="Variable Pay"
            name="variableAmount"
            type="number"
            format="indian"
            placeholder="50,000"
            value={formData.variableAmount}
            onChange={onChange}
            step="1000"
            min="0"
            required
            prefix="₹"
            hint="Enter 0 if none"
          />

          <FormField
            label="Retention Amount"
            name="retentionAmount"
            type="number"
            format="indian"
            placeholder="0"
            value={formData.retentionAmount}
            onChange={onChange}
            step="1000"
            min="0"
            prefix="₹"
            hint="Leave blank if none"
          />

          <FormField
            label="Relocation Amount"
            name="relocationAmount"
            type="number"
            format="indian"
            placeholder="0"
            value={formData.relocationAmount}
            onChange={onChange}
            step="1000"
            min="0"
            prefix="₹"
            hint="Paid over and above the CTC"
          />

          <FormField
            label="Joining Bonus"
            name="joiningBonusAmount"
            type="number"
            format="indian"
            placeholder="0"
            value={formData.joiningBonusAmount}
            onChange={onChange}
            step="1000"
            min="0"
            prefix="₹"
            hint="Paid over and above the CTC"
          />
        </div>
      </fieldset>
    </form>
  );
}
