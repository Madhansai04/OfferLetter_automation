const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen'
];

const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
];

function convertBelowThousand(num) {
  if (num === 0) return '';
  if (num < 20) return ONES[num];
  if (num < 100) {
    const tens = TENS[Math.floor(num / 10)];
    const rest = num % 10;
    return rest === 0 ? tens : `${tens} ${ONES[rest]}`;
  }
  const hundreds = ONES[Math.floor(num / 100)];
  const rest = num % 100;
  return rest === 0
    ? `${hundreds} hundred`
    : `${hundreds} hundred ${convertBelowThousand(rest)}`;
}

/**
 * Converts a rupee amount into Indian-numbering words (lakh-based).
 * Only handles values up to 99 lakh (sufficient for CTC amounts in this app).
 */
export function ctcToWords(amount) {
  if (amount === 0) return 'Zero';

  const lakhs = Math.floor(amount / 100000);
  const remainder = amount % 100000;
  const thousands = Math.floor(remainder / 1000);
  const belowThousand = remainder % 1000;

  const parts = [];
  if (lakhs > 0) parts.push(`${convertBelowThousand(lakhs)} lakh`);
  if (thousands > 0) parts.push(`${convertBelowThousand(thousands)} thousand`);
  if (belowThousand > 0) parts.push(convertBelowThousand(belowThousand));

  const result = parts.join(' ');
  return result.charAt(0).toUpperCase() + result.slice(1);
}
