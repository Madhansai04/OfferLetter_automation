import { describe, it, expect } from 'vitest';
import {
  addOfferRecord,
  updateOfferRecord,
  loadOfferRecords,
  saveOfferRecords
} from './offerRecords.js';

const form = {
  name: ' Asha Rao ',
  email: 'asha@example.com',
  phone: '+919876543210',
  role: 'Data Scientist',
  doj: '2026-10-05'
};

function memoryStorage() {
  const data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); }
  };
}

describe('addOfferRecord', () => {
  it('records the candidate with the release date, status Offered and no recruiter', () => {
    const [r] = addOfferRecord([], form, new Date(2026, 8, 23));
    expect(r).toMatchObject({
      offerDate: '2026-09-23',
      name: 'Asha Rao',
      designation: 'Data Scientist',
      phone: '+919876543210',
      email: 'asha@example.com',
      doj: '2026-10-05',
      status: 'Offered',
      recruiter: ''
    });
    expect(r.id).toBeTruthy();
  });

  it('puts the newest offer first', () => {
    const first = addOfferRecord([], form);
    const both = addOfferRecord(first, { ...form, email: 'ben@example.com', name: 'Ben' });
    expect(both.map((r) => r.name)).toEqual(['Ben', 'Asha Rao']);
  });

  it('refreshes an existing row for the same email, keeping status and recruiter', () => {
    let records = addOfferRecord([], form, new Date(2026, 8, 1));
    records = updateOfferRecord(records, records[0].id, { status: 'Joined', recruiter: 'Kavya' });
    records = addOfferRecord(records, { ...form, email: 'ASHA@example.com', role: 'Senior Data Scientist' }, new Date(2026, 8, 23));

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      offerDate: '2026-09-23',
      designation: 'Senior Data Scientist',
      status: 'Joined',
      recruiter: 'Kavya'
    });
  });
});

describe('updateOfferRecord', () => {
  it('changes only the targeted row', () => {
    let records = addOfferRecord([], form);
    records = addOfferRecord(records, { ...form, email: 'ben@example.com' });
    const updated = updateOfferRecord(records, records[1].id, { doj: '2026-11-01' });
    expect(updated[1].doj).toBe('2026-11-01');
    expect(updated[0].doj).toBe('2026-10-05');
  });
});

describe('storage', () => {
  it('round-trips records', () => {
    const storage = memoryStorage();
    const records = addOfferRecord([], form);
    expect(saveOfferRecords(records, storage)).toBe(true);
    expect(loadOfferRecords(storage)).toEqual(records);
  });

  it('starts empty when nothing is stored, the data is corrupt, or storage is unavailable', () => {
    expect(loadOfferRecords(memoryStorage())).toEqual([]);
    const bad = memoryStorage();
    bad.setItem('ganit.offerRecords.v1', '{not json');
    expect(loadOfferRecords(bad)).toEqual([]);
    expect(loadOfferRecords(null)).toEqual([]);
    expect(saveOfferRecords([], null)).toBe(false);
  });
});
