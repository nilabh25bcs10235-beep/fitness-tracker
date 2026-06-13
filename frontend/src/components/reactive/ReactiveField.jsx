import { useId } from 'react';
import { useTypingIntensity } from '../../hooks/useTypingIntensity';
import ReactiveFieldCanvas from './ReactiveFieldCanvas';

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
  const { focused, intensity, onFocus, onBlur } = useTypingIntensity(value);

  const handleFocus = (e) => {
    onFocus();
    onFocusProp?.(e);
  };

  const handleBlur = (e) => {
    onBlur();
    onBlurProp?.(e);
  };

  const InputTag = as === 'textarea' ? 'textarea' : 'input';
  const energy = Math.round(intensity * 100);

  return (
    <div className={`reactive-field ${wrapClassName}`.trim()}>
      {label && <label htmlFor={id}>{label}</label>}
      <div
        className={`reactive-shell theme-${theme} ${focused ? 'is-focused' : ''} ${intensity > 0.1 ? 'is-typing' : ''} ${className}`.trim()}
        style={{ '--field-energy': energy }}
      >
        <ReactiveFieldCanvas theme={theme} focused={focused} intensity={intensity} />
        <div className="reactive-heartbeat" aria-hidden="true" />
        <div className="reactive-glass-shine" aria-hidden="true" />
        <InputTag
          id={id}
          ref={inputRef}
          className="reactive-input"
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
      </div>
      {children}
    </div>
  );
}