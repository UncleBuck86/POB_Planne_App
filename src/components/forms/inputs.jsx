import React, { useRef, useEffect } from 'react';
import { useTheme } from '../../ThemeContext.jsx';

function baseStyle(theme) {
  const borderCol = theme.name === 'Dark' ? '#bfc4ca' : theme.primary;
  return { background: theme.background, color: theme.text, border: '1px solid ' + borderCol, padding: '6px 8px', borderRadius: 6, fontSize: 13 };
}

function useEnterNav(nextRef, prevRef) {
  return (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = e.shiftKey ? prevRef?.current : nextRef?.current;
      if (target?.focus) target.focus();
    }
  };
}

export function TextInput({ value, onChange, placeholder, disabled, nextRef, prevRef, inputRef, type='text', style }) {
  const { theme } = useTheme();
  const ref = inputRef || useRef(null);
  const onKeyDown = useEnterNav(nextRef, prevRef);
  return (
    <input ref={ref} type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      onKeyDown={onKeyDown} style={{ ...baseStyle(theme), ...style }} />
  );
}

export function SelectInput({ value, onChange, options=[], disabled, nextRef, prevRef, inputRef, placeholder='-- Select --', style }) {
  const { theme } = useTheme();
  const ref = inputRef || useRef(null);
  const onKeyDown = useEnterNav(nextRef, prevRef);
  return (
    <select ref={ref} value={value} onChange={onChange} disabled={disabled} onKeyDown={onKeyDown} style={{ ...baseStyle(theme), ...style }}>
      <option value="">{placeholder}</option>
      {options.map(opt => typeof opt === 'string' ? (
        <option key={opt} value={opt}>{opt}</option>
      ) : (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export function DateInput(props) {
  return <TextInput {...props} type="date" />;
}

function normalizeDigits(s='') { return s.replace(/[^0-9xX]/g,'').slice(0,16); }
function formatPhone(raw=''){
  const s = normalizeDigits(raw);
  // Allow leading country code 1, then (xxx) xxx-xxxx ext x...
  if(!s) return '';
  let i=0; let cc='';
  if(s[0]==='1'){ cc='1 '; i=1; }
  const a=s.slice(i,i+3); const b=s.slice(i+3,i+6); const c=s.slice(i+6,i+10); const ext=s.slice(i+10);
  let out='';
  if(a){ out += '('+a+')'; }
  if(b){ out += (out? ' ':'') + b; }
  if(c){ out += (b? '-':' ') + c; }
  if(ext){ out += ' x'+ext; }
  return (cc+out).trim();
}

export function PhoneInput({ value, onChange, disabled, nextRef, prevRef, inputRef, placeholder='(###) ###-####', style }){
  const { theme } = useTheme();
  const ref = inputRef || useRef(null);
  const onKeyDown = useEnterNav(nextRef, prevRef);
  // Accept any input, but format visually; keep original in-state via onChange
  const handleChange = (e) => {
    const raw = e.target.value;
    const normalized = normalizeDigits(raw);
    const formatted = formatPhone(normalized);
    // Emit normalized digits as value; caller may store formatted if desired
    onChange({ target:{ value: formatted } });
  };
  useEffect(() => {
    // no-op, formatting is pure
  }, [value]);
  return (
    <input ref={ref} value={value} onChange={handleChange} placeholder={placeholder} disabled={disabled} onKeyDown={onKeyDown} style={{ ...baseStyle(theme), ...style }} />
  );
}
