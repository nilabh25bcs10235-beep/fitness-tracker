import { useCallback, useEffect, useRef, useState } from 'react';

export function useTypingIntensity(value) {
  const [focused, setFocused] = useState(false);
  const [intensity, setIntensity] = useState(0);
  const decayRef = useRef(null);

  const bump = useCallback(() => {
    setIntensity((prev) => Math.min(1, prev + 0.22));
    if (decayRef.current) clearTimeout(decayRef.current);
    decayRef.current = setTimeout(() => {
      setIntensity((prev) => Math.max(0, prev - 0.15));
    }, 120);
  }, []);

  useEffect(() => {
    if (value) bump();
  }, [value, bump]);

  useEffect(() => () => {
    if (decayRef.current) clearTimeout(decayRef.current);
  }, []);

  const onFocus = useCallback(() => {
    setFocused(true);
    setIntensity((prev) => Math.max(prev, 0.35));
  }, []);

  const onBlur = useCallback(() => {
    setFocused(false);
    setIntensity(0);
  }, []);

  return { focused, intensity, onFocus, onBlur, bump };
}