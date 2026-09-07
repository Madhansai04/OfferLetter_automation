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
  min
}) {
  return (
    <div className="form-group">
      <label htmlFor={name}>{label}</label>
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
  );
}
