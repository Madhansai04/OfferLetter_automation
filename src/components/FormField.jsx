import { useLayoutEffect, useRef } from 'react';

// Digits only, with a single optional decimal point. The parent form keeps
// this unformatted string, so the calculator still receives a plain number.
function toRawAmount(text) {
  const cleaned = String(text).replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

// Indian digit grouping: last three digits, then pairs (12,34,567).
function groupIndian(digits) {
  if (digits.length <= 3) return digits;
  const head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  return `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${tail}`;
}

function formatAmount(raw) {
  if (raw === '' || raw === undefined || raw === null) return '';
  const [integer, decimal] = String(raw).split('.');
  const grouped = groupIndian(integer);
  return String(raw).includes('.') ? `${grouped}.${decimal ?? ''}` : grouped;
}

function countDigits(text) {
  return (text.match(/[\d.]/g) || []).length;
}

export default function FormField({
  label,
  name,
  type,
  value,
  onChange,
  placeholder,
  options,
  required,
  step,
  min,
  hint,
  prefix,
  full,
  format
}) {
  const isAmount = format === 'indian';
  const inputRef = useRef(null);
  const caretRef = useRef(null);

  // Re-formatting shifts the text, so put the caret back after the same
  // number of digits the user had typed past.
  useLayoutEffect(() => {
    if (!isAmount || caretRef.current === null) return;
    const el = inputRef.current;
    if (!el) return;

    let remaining = caretRef.current;
    caretRef.current = null;

    let position = el.value.length;
    for (let i = 0; i < el.value.length; i++) {
      if (remaining === 0) {
        position = i;
        break;
      }
      if (/[\d.]/.test(el.value[i])) remaining--;
    }
    el.setSelectionRange(position, position);
  });

  const handleAmountChange = (e) => {
    const el = e.target;
    const caret = el.selectionStart ?? el.value.length;
    caretRef.current = countDigits(el.value.slice(0, caret));
    onChange({ target: { name, value: toRawAmount(el.value) } });
  };

  return (
    <div className={full ? 'form-group form-group-full' : 'form-group'}>
      <label htmlFor={name}>
        <span>{label}</span>
        {required ? (
          <span className="label-required" aria-hidden="true">*</span>
        ) : (
          <span className="label-optional">Optional</span>
        )}
      </label>

      <div className={prefix ? 'input-shell has-prefix' : 'input-shell'}>
        {prefix && <span className="input-prefix">{prefix}</span>}
        {type === 'select' ? (
          <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
          >
            {options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : isAmount ? (
          <input
            id={name}
            ref={inputRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            name={name}
            value={formatAmount(value)}
            onChange={handleAmountChange}
            placeholder={placeholder}
            required={required}
          />
        ) : (
          <input
            id={name}
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            step={step}
            min={min}
          />
        )}
      </div>

      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
