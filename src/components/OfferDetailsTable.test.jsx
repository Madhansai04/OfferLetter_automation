import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import OfferDetailsTable from './OfferDetailsTable.jsx';

const record = {
  id: 'a1',
  offerDate: '2026-09-23',
  name: 'Asha Rao',
  designation: 'Data Scientist',
  phone: '+919876543210',
  email: 'asha@example.com',
  doj: '2026-10-05',
  status: 'Joined',
  recruiter: 'Surya GM',
  ctc: 1250000
};

describe('OfferDetailsTable', () => {
  const html = renderToStaticMarkup(<OfferDetailsTable records={[record]} onUpdate={() => {}} />);

  it('shows the columns in the requested order', () => {
    const headers = [...html.matchAll(/<th>(.*?)<\/th>/g)].map((m) => m[1]);
    expect(headers).toEqual([
      'Date of offer released', 'Candidate Name', 'Designation', 'Offered CTC', 'Contact Number',
      'Email ID', 'Date of Joining', 'Status', 'Recruiter Name'
    ]);
  });

  it('shows the offer details and an editable date of joining', () => {
    expect(html).toContain('23/09/2026');
    expect(html).toContain('Asha Rao');
    expect(html).toContain('asha@example.com');
    expect(html).toMatch(/<input type="date"[^>]*value="2026-10-05"/);
  });

  it('offers the status and recruiter dropdowns with the saved choice selected', () => {
    for (const s of ['Offered', 'Joined', 'Declined', 'Withdrew']) expect(html).toContain(`<option value="${s}"`);
    for (const r of ['Kavya', 'Rithanya', 'Surya GM', 'Ravi Singh', 'Jyothi Singh', 'Raj']) {
      expect(html).toContain(`<option value="${r}"`);
    }
    expect(html).toContain('<option value="Joined" selected="">');
    expect(html).toContain('<option value="Surya GM" selected="">');
  });

  it('shows the offered CTC in an editable field, empty for offers recorded before it was tracked', () => {
    expect(html).toMatch(/<input type="text"[^>]*aria-label="Offered CTC for Asha Rao"[^>]*value="₹12,50,000"/);
    const old = renderToStaticMarkup(<OfferDetailsTable records={[{ ...record, ctc: undefined }]} onUpdate={() => {}} />);
    expect(old).toMatch(/placeholder="Enter CTC"[^>]*value=""/);
  });

  it('colour-codes each row by its status', () => {
    expect(html).toContain('<tr class="row-status-joined">');
  });

  it('counts offers still pending and each outcome above the table', () => {
    const records = [
      record,
      { ...record, id: 'b', status: 'Joined' },
      { ...record, id: 'c', status: 'Declined' },
      { ...record, id: 'd', status: 'Offered' }
    ];
    const out = renderToStaticMarkup(<OfferDetailsTable records={records} onUpdate={() => {}} />);
    const counts = Object.fromEntries(
      [...out.matchAll(/offer-stat-label">(.*?)<\/span><span class="offer-stat-count">(\d+)/g)].map((m) => [m[1], Number(m[2])])
    );
    expect(counts).toEqual({ 'Total Offered': 1, Joined: 2, Declined: 1, Withdrew: 0 });
  });

  it('explains the empty state', () => {
    expect(renderToStaticMarkup(<OfferDetailsTable records={[]} onUpdate={() => {}} />)).toContain('No offers yet');
  });
});
