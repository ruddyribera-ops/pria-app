import type { PhaseField } from '../../lib/pptx/phaseDefinitions';

interface Props {
  field: PhaseField;
  value: unknown;
  onChange: (name: string, val: unknown) => void;
  disabled: boolean;
  idPrefix?: string;
  textClass?: string;
  selectClass?: string;
  textareaClass?: string;
  checkboxFieldClass?: string;
  checkboxInputClass?: string;
  checkboxLabelClass?: string;
}

export default function PhaseFieldRenderer({
  field,
  value,
  onChange,
  disabled,
  idPrefix = 'phase',
  textClass,
  selectClass,
  textareaClass,
  checkboxFieldClass,
  checkboxInputClass,
  checkboxLabelClass,
}: Props) {
  const val = (value !== undefined && value !== '') ? value : field.default ?? '';

  const baseInputStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    border: '1px solid #d4d4e0',
    borderRadius: '4px',
    fontSize: '0.8125rem',
    outline: 'none',
    background: '#f8f8ff',
    width: '100%',
    boxSizing: 'border-box',
  };

  if (field.type === 'select') {
    return (
      <select
        value={val as string}
        onChange={(e) => onChange(field.name, e.target.value)}
        disabled={disabled}
        className={selectClass}
        style={selectClass ? undefined : { ...baseInputStyle, cursor: disabled ? 'not-allowed' : 'pointer' }}
        aria-label={field.label}
      >
        {(field.options || []).map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div className={checkboxFieldClass} style={checkboxFieldClass ? undefined : { display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.25rem' }}>
        <input
          type="checkbox"
          id={`${idPrefix}-field-${field.name}`}
          checked={val === true || val === 'true'}
          onChange={(e) => onChange(field.name, e.target.checked)}
          disabled={disabled}
          className={checkboxInputClass}
          style={checkboxInputClass ? undefined : { width: '18px', height: '18px', accentColor: '#3A9E5E', cursor: disabled ? 'not-allowed' : 'pointer' }}
          aria-label={field.label}
        />
        <label
          htmlFor={`${idPrefix}-field-${field.name}`}
          className={checkboxLabelClass}
          style={checkboxLabelClass ? undefined : { fontSize: '0.8125rem', color: '#1e1e2f', cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          {field.label}
        </label>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        value={val as string}
        onChange={(e) => onChange(field.name, e.target.value)}
        disabled={disabled}
        placeholder={field.placeholder}
        className={textareaClass}
        style={textareaClass ? undefined : { ...baseInputStyle, minHeight: '80px', resize: 'vertical' }}
        aria-label={field.label}
      />
    );
  }

  return (
    <input
      type="text"
      value={val as string}
      onChange={(e) => onChange(field.name, e.target.value)}
      disabled={disabled}
      placeholder={field.placeholder}
      className={textClass}
      style={textClass ? undefined : baseInputStyle}
      aria-label={field.label}
    />
  );
}