/**
 * The Offer Details register: one row per candidate an offer letter was
 * downloaded for.
 *
 * The app is a single .html file opened offline, so there is no server to
 * keep this on. It lives in the browser's localStorage on the HR machine,
 * which survives closing the app and reinstalling it with Setup.ps1, but is
 * per machine and is lost if the browser's site data is cleared.
 */

export const OFFER_STATUSES = ['Offered', 'Joined', 'Declined', 'Withdrew'];

export const RECRUITERS = ['Kavya', 'Rithanya', 'Surya GM', 'Ravi Singh', 'Jyothi Singh', 'Raj'];

const STORAGE_KEY = 'ganit.offerRecords.v1';

function defaultStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadOfferRecords(storage = defaultStorage()) {
  try {
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOfferRecords(records, storage = defaultStorage()) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

function localIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Adds the candidate from a downloaded offer, newest first.
 *
 * Downloading a letter again for the same email (a corrected or revised offer)
 * refreshes that candidate's row instead of adding a duplicate. The status and
 * recruiter HR already set on it are kept.
 */
export function addOfferRecord(records, formData, releasedOn = new Date()) {
  const email = String(formData.email || '').trim();
  const details = {
    offerDate: localIsoDate(releasedOn),
    name: String(formData.name || '').trim(),
    designation: String(formData.role || '').trim(),
    phone: String(formData.phone || '').trim(),
    email,
    doj: formData.doj || '',
    ctc: Number(formData.ctc) || null
  };

  const existing = records.find((r) => r.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    const updated = { ...existing, ...details };
    return [updated, ...records.filter((r) => r !== existing)];
  }

  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return [{ id, ...details, status: 'Offered', recruiter: '' }, ...records];
}

export function updateOfferRecord(records, id, changes) {
  return records.map((r) => (r.id === id ? { ...r, ...changes } : r));
}
