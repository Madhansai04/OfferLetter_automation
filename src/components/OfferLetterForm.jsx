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

      <fieldset>
        <legend>Optional Benefits</legend>

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
