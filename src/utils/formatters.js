// Format currency to Indian Rupee
export function formatCurrency(amount) {
  if (!amount) return '₹0';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Format a plain number with Indian digit grouping, no currency symbol
export function formatNumber(amount) {
  if (!amount) return '0';
  return Math.round(amount).toLocaleString('en-IN');
}

// Slash form, matching how the template prints the offer letter's own date
// in its header: "Date: 25/08/2026".
export function formatDateSlashes(dateString) {
  if (!dateString) return '';

  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Long form used for the date of joining, e.g. "03 September 2026".
export function formatDateLong(dateString) {
  if (!dateString) return '';

  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, '0');

  return `${day} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// Hyphenated long form, e.g. "03-September-2026", used for the date of
// joining in Annexure 2. Page 1 keeps the spaced form above.
export function formatDateLongHyphen(dateString) {
  if (!dateString) return '';

  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, '0');

  return `${day}-${MONTH_NAMES[d.getMonth()]}-${d.getFullYear()}`;
}

// Convert number to Indian words (units, thousand, lakh, crore grouping)
export function numberToWords(num) {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if (num === 0) return 'zero';
  if (num < 0) return 'minus ' + numberToWords(-num);

  function belowHundred(n) {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    const t = tens[Math.floor(n / 10)];
    const o = n % 10;
    return o > 0 ? `${t} ${ones[o]}` : t;
  }

  function belowThousand(n) {
    if (n === 0) return '';
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    if (hundreds === 0) return belowHundred(rest);
    return rest > 0
      ? `${ones[hundreds]} hundred ${belowHundred(rest)}`
      : `${ones[hundreds]} hundred`;
  }

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  const parts = [];
  if (crore > 0) parts.push(`${belowThousand(crore)} crore`);
  if (lakh > 0) parts.push(`${belowHundred(lakh)} lakh`);
  if (thousand > 0) parts.push(`${belowHundred(thousand)} thousand`);
  if (remainder > 0) parts.push(belowThousand(remainder));

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// Example:
// numberToWords(1250000) -> "twelve lakh fifty thousand"
// numberToWords(5000000) -> "fifty lakh"
