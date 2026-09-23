import { OFFER_STATUSES, RECRUITERS } from '../utils/offerRecords';
import { formatDateSlashes } from '../utils/formatters';

export default function OfferDetailsTable({ records, onUpdate }) {
  if (records.length === 0) {
    return (
      <div className="preview-placeholder">
        <span className="preview-placeholder-icon" aria-hidden="true">🗂️</span>
        <strong>No offers yet</strong>
        <span>Each offer letter you download is added here automatically.</span>
      </div>
    );
  }

  return (
    <div className="offer-table-wrapper">
      <table className="offer-table">
        <thead>
          <tr>
            <th>Date of offer released</th>
            <th>Candidate Name</th>
            <th>Designation</th>
            <th>Contact Number</th>
            <th>Email ID</th>
            <th>Date of Joining</th>
            <th>Status</th>
            <th>Recruiter Name</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td className="nowrap">{formatDateSlashes(r.offerDate)}</td>
              <td>{r.name}</td>
              <td>{r.designation}</td>
              <td className="nowrap">{r.phone}</td>
              <td>{r.email}</td>
              <td>
                <input
                  type="date"
                  className="offer-table-control"
                  value={r.doj}
                  aria-label={`Date of joining for ${r.name}`}
                  onChange={(e) => onUpdate(r.id, { doj: e.target.value })}
                />
              </td>
              <td>
                <select
                  className={`offer-table-control status-${r.status.toLowerCase()}`}
                  value={r.status}
                  aria-label={`Status for ${r.name}`}
                  onChange={(e) => onUpdate(r.id, { status: e.target.value })}
                >
                  {OFFER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td>
                <select
                  className="offer-table-control"
                  value={r.recruiter}
                  aria-label={`Recruiter for ${r.name}`}
                  onChange={(e) => onUpdate(r.id, { recruiter: e.target.value })}
                >
                  <option value="">Select…</option>
                  {RECRUITERS.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
