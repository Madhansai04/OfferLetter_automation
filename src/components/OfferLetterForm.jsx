import FormField from './FormField';

export default function OfferLetterForm({ formData, onChange }) {
  return (
    <form className="form">
      <fieldset>
        <legend>Candidate Information</legend>

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

      <fieldset>
        <legend>Employment Details</legend>

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
          label="Fixed Pay (₹) *"
          name="fixedPay"
          type="number"
          placeholder="450000"
          value={formData.fixedPay}
          onChange={onChange}
          step="1000"
          min="1"
          required
        />

        <FormField
          label="Variable Pay (₹) *"
          name="variableAmount"
          type="number"
          placeholder="50000"
          value={formData.variableAmount}
          onChange={onChange}
          step="1000"
          min="0"
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
          type="text"
          placeholder="Chennai"
          value={formData.posting}
          onChange={onChange}
          required
        />
      </fieldset>

      <fieldset>
        <legend>Optional Benefits</legend>

        <FormField
          label="Retention Amount (₹) - Leave blank if none"
          name="retentionAmount"
          type="number"
          placeholder="0"
          value={formData.retentionAmount}
          onChange={onChange}
          step="1000"
          min="0"
        />

        <FormField
          label="Relocation Amount (₹) - Leave blank if none"
          name="relocationAmount"
          type="number"
          placeholder="0"
          value={formData.relocationAmount}
          onChange={onChange}
          step="1000"
          min="0"
        />

        <FormField
          label="Joining Bonus (₹) - Leave blank if none"
          name="joiningBonusAmount"
          type="number"
          placeholder="0"
          value={formData.joiningBonusAmount}
          onChange={onChange}
          step="1000"
          min="0"
        />
      </fieldset>
    </form>
  );
}
