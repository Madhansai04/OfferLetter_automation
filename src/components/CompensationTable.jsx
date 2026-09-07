import { formatCurrency } from '../utils/formatters';

export default function CompensationTable({ breakdown }) {
  if (!breakdown) return null;

  // Same labels and order as the Word letter, so the preview matches what
  // downloads. Only the ones with an amount entered are shown.
  const optionalBenefits = [
    { label: 'Retention Pay *', amount: breakdown.optional.retention.yearly },
    { label: 'Relocation Bonus **', amount: breakdown.optional.relocation.yearly },
    { label: 'Joining Bonus ***', amount: breakdown.optional.joiningBonus.yearly }
  ].filter((benefit) => benefit.amount > 0);

  const hasOptionalBenefits = optionalBenefits.length > 0;

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

          <tr className="section-header">
            <td colSpan="3"><strong>VARIABLE</strong></td>
          </tr>

          {/* Variable and the optional benefits are single annual amounts,
              not split monthly/yearly, so their value spans both columns. */}
          <tr>
            <td>Variable Pay</td>
            <td colSpan="2">{formatCurrency(breakdown.variable.yearly)}</td>
          </tr>

          {/* The section header belongs to the group, not to any one row, so
              it is driven by whether any optional benefit was entered. */}
          {hasOptionalBenefits && (
            <tr className="section-header">
              <td colSpan="3"><strong>OPTIONAL BENEFITS</strong></td>
            </tr>
          )}

          {optionalBenefits.map((benefit) => (
            <tr className="optional-row" key={benefit.label}>
              <td><strong>{benefit.label}</strong></td>
              <td colSpan="2"><strong>{formatCurrency(benefit.amount)}</strong></td>
            </tr>
          ))}

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

          <tr className="total-row">
            <td><strong>Total Benefit Component</strong></td>
            <td><strong>{formatCurrency(breakdown.statutory.total.monthly)}</strong></td>
            <td><strong>{formatCurrency(breakdown.statutory.total.yearly)}</strong></td>
          </tr>
        </tbody>
      </table>

      <div className="insurance-section">
        <h4>Insurance Coverage</h4>
        <table className="insurance-table">
          <tbody>
            <tr>
              <td>Medical Insurance</td>
              <td>{formatCurrency(breakdown.insurance.medical)}</td>
            </tr>
            <tr>
              <td>Personal Accident Insurance</td>
              <td>{formatCurrency(breakdown.insurance.personalAccident)}</td>
            </tr>
            <tr>
              <td>Term Insurance</td>
              <td>{formatCurrency(breakdown.insurance.term)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="footnotes">
        {breakdown.optional.retention.show && (
          <p className="footnote">
            <strong>* Retention pay</strong> will be prorated &amp; paid during June &amp; December payroll.
            Any payout must be reimbursed if you resign within 12 months from the date of joining.
          </p>
        )}

        {breakdown.optional.relocation.show && (
          <p className="footnote">
            <strong>** Relocation bonus</strong> will be paid during the subsequent payroll after employees
            complete 1 month from date of joining and will be recovered if you resign within 12 months from the date of joining.
          </p>
        )}

        {breakdown.optional.joiningBonus.show && (
          <p className="footnote">
            <strong>*** Joining bonus</strong> will be paid during the subsequent payroll after employees
            complete 1 month from date of joining and will be recovered if you resign within 12 months from the date of joining.
          </p>
        )}
      </div>
    </div>
  );
}
