import { useId, useRef } from 'react';
import { useTypingIntensity } from '../../hooks/useTypingIntensity';
import { useVitality } from '../../context/VitalityContext';

export default function ReactiveField({
  theme = 'chat',
  label,
  as = 'input',
  className = '',
  wrapClassName = '',
  value,
  onChange,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  children,
  inputRef,
  ...rest
}) {
  const id = useId();
  const shellRef = useRef(null);
  const { focused, intensity, onFocus, onBlur } = useTypingIntensity(value);
  const { signalFocus, signalBlur, signalTyping, signalPulse } = useVitality();

  const handleFocus = (e) => {
    onFocus();
    signalFocus(e.currentTarget.getBoundingClientRect(), theme);
    onFocusProp?.(e);
  };

  const handleBlur = (e) => {
    onBlur();
    signalBlur();
    onBlurProp?.(e);
  };

  const handleChange = (e) => {
    onChange?.(e);
    signalTyping(e.target.value, theme);
    if (shellRef.current) {
      signalPulse(shellRef.current.getBoundingClientRect(), 0.35 + intensity * 0.45);
    }
  };

  const InputTag = as === 'textarea' ? 'textarea' : 'input';
  const energy = Math.round(intensity * 100);

  return (
    <div className={`reactive-field ${wrapClassName}`.trim()}>
      {label && <label htmlFor={id}>{label}</label>}
      <div
        ref={shellRef}
        className={`reactive-shell theme-${theme} ${focused ? 'is-focused' : ''} ${intensity > 0.1 ? 'is-typing' : ''} ${className}`.trim()}
        style={{ '--field-energy': energy }}
      >
        <div className="reactive-heartbeat" aria-hidden="true" />
        <div className="reactive-glass-shine" aria-hidden="true" />
        <InputTag
          id={id}
          ref={inputRef}
          className="reactive-input"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
      </div>
      {children}
    </div>
  );
}