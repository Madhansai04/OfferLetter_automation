import { useState } from 'react';
import { OFFER_STATUSES, RECRUITERS } from '../utils/offerRecords';
import { formatCurrency, formatDateSlashes } from '../utils/formatters';

// Filled in from the letter on download, but HR can correct it. Shows the
// formatted amount at rest and the plain number while being edited; the
// record only changes when the edit is committed.
function CtcInput({ value, name, onCommit }) {
  const [draft, setDraft] = useState(null);
  const commit = () => {
    const amount = Math.round(Number(String(draft).replace(/[^\d.]/g, ''))) || null;
    if (amount !== (value || null)) onCommit(amount);
    setDraft(null);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      className="offer-table-control offer-ctc-input"
      placeholder="Enter CTC"
      aria-label={`Offered CTC for ${name}`}
      value={draft ?? (value ? formatCurrency(value) : '')}
      onFocus={() => setDraft(value ? String(value) : '')}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur(); }
      }}
    />
  );
}

const EMPTY_FILTERS = { search: '', status: '', recruiter: '', from: '', to: '' };

// Every filter except status, so the counts show the split across statuses
// for whatever candidates, recruiter and dates HR has narrowed down to.
function matchesNonStatusFilters(r, f) {
  const q = f.search.trim().toLowerCase();
  if (q && ![r.name, r.email, r.designation, r.phone].some((v) => String(v || '').toLowerCase().includes(q))) {
    return false;
  }
  if (f.recruiter === '__none__') {
    if (r.recruiter) return false;
  } else if (f.recruiter && r.recruiter !== f.recruiter) {
    return false;
  }
  if (f.from && r.offerDate < f.from) return false;
  if (f.to && r.offerDate > f.to) return false;
  return true;
}

export default function OfferDetailsTable({ records, onUpdate }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  if (records.length === 0) {
    return (
      <div className="preview-placeholder">
        <span className="preview-placeholder-icon" aria-hidden="true">🗂️</span>
        <strong>No offers yet</strong>
        <span>Each offer letter you download is added here automatically.</span>
      </div>
    );
  }

  const setFilter = (name, value) => setFilters((f) => ({ ...f, [name]: value }));
  const inScope = records.filter((r) => matchesNonStatusFilters(r, filters));
  const visible = filters.status ? inScope.filter((r) => r.status === filters.status) : inScope;
  const countOf = (status) => inScope.filter((r) => r.status === status).length;
  const isFiltered = Object.values(filters).some(Boolean);

  const stats = [
    { label: 'Total Offered', status: 'Offered', count: countOf('Offered') },
    { label: 'Joined', status: 'Joined', count: countOf('Joined') },
    { label: 'Declined', status: 'Declined', count: countOf('Declined') },
    { label: 'Withdrew', status: 'Withdrew', count: countOf('Withdrew') }
  ];

  return (
    <>
      <div className="offer-stats">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            className={`offer-stat stat-${s.status.toLowerCase()}${filters.status === s.status ? ' active' : ''}`}
            aria-pressed={filters.status === s.status}
            onClick={() => setFilter('status', filters.status === s.status ? '' : s.status)}
          >
            <span className="offer-stat-label">{s.label}</span>
            <span className="offer-stat-count">{s.count}</span>
          </button>
        ))}
      </div>

      <div className="offer-filters">
        <input
          type="search"
          className="offer-table-control offer-filter-search"
          placeholder="Search name, email, designation, phone…"
          aria-label="Search offers"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
        />
        <select
          className="offer-table-control"
          aria-label="Filter by status"
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
        >
          <option value="">All statuses</option>
          {OFFER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="offer-table-control"
          aria-label="Filter by recruiter"
          value={filters.recruiter}
          onChange={(e) => setFilter('recruiter', e.target.value)}
        >
          <option value="">All recruiters</option>
          <option value="__none__">Not assigned</option>
          {RECRUITERS.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <label className="offer-filter-date">
          <span>Offered from</span>
          <input
            type="date"
            className="offer-table-control"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => setFilter('from', e.target.value)}
          />
        </label>
        <label className="offer-filter-date">
          <span>to</span>
          <input
            type="date"
            className="offer-table-control"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => setFilter('to', e.target.value)}
          />
        </label>
        {isFiltered && (
          <button type="button" className="offer-filter-clear" onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear filters
          </button>
        )}
      </div>

      <div className="offer-table-wrapper">
        <table className="offer-table">
          <thead>
            <tr>
              <th>Date of offer released</th>
              <th>Candidate Name</th>
              <th>Designation</th>
              <th>Offered CTC</th>
              <th>Contact Number</th>
              <th>Email ID</th>
              <th>Date of Joining</th>
              <th>Status</th>
              <th>Recruiter Name</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="offer-table-empty">No offers match these filters.</td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={r.id} className={`row-status-${r.status.toLowerCase()}`}>
                <td className="nowrap">{formatDateSlashes(r.offerDate)}</td>
                <td>{r.name}</td>
                <td>{r.designation}</td>
                <td>
                  <CtcInput value={r.ctc} name={r.name} onCommit={(ctc) => onUpdate(r.id, { ctc })} />
                </td>
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
    </>
  );
}
