import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  detectPowerWords,
  FOCUS_QUOTES,
  SUCCESS_QUOTES,
  THEME_TO_CONTEXT,
  VITALITY_QUOTES,
  pickQuote,
} from '../lib/vitalityQuotes';

const VitalityContext = createContext(null);

const INTENSITY_KEY = 'fittrack-vitality-intensity';

function loadIntensity() {
  try {
    const v = localStorage.getItem(INTENSITY_KEY);
    if (['off', 'low', 'medium', 'high'].includes(v)) return v;
  } catch {
    /* ignore */
  }
  return 'medium';
}

const INTENSITY_SCALE = { off: 0, low: 0.55, medium: 1, high: 1.35 };

export function VitalityProvider({ context = 'dashboard', children }) {
  const [intensity, setIntensityState] = useState(loadIntensity);
  const [focusPoint, setFocusPoint] = useState(null);
  const [typingEnergy, setTypingEnergy] = useState(0);
  const [powerMode, setPowerMode] = useState(false);
  const [pulse, setPulse] = useState(null);
  const [successWave, setSuccessWave] = useState(0);
  const [quoteHighlight, setQuoteHighlight] = useState(null);
  const [quoteFocus, setQuoteFocus] = useState(null);
  const decayRef = useRef(null);
  const focusQuoteRef = useRef(null);

  const setIntensity = useCallback((level) => {
    setIntensityState(level);
    try {
      localStorage.setItem(INTENSITY_KEY, level);
    } catch {
      /* ignore */
    }
  }, []);

  const signalFocus = useCallback((rect, fieldTheme) => {
    if (!rect) return;
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    setFocusPoint({ x, y, t: Date.now() });
    setTypingEnergy((e) => Math.max(e, 0.3));

    const quoteContext = THEME_TO_CONTEXT[fieldTheme] || context;
    const pool = FOCUS_QUOTES[quoteContext] || FOCUS_QUOTES.dashboard;
    const text = pickQuote(pool, focusQuoteRef.current);
    focusQuoteRef.current = text;
    setQuoteFocus({ text, t: Date.now() });
  }, [context]);

  const signalBlur = useCallback(() => {
    setFocusPoint(null);
    setTypingEnergy(0);
    setPowerMode(false);
    setTimeout(() => setQuoteFocus(null), 1800);
  }, []);

  const signalTyping = useCallback((text, _theme) => {
    const power = detectPowerWords(text);
    setPowerMode(power);
    setTypingEnergy((prev) => Math.min(1, prev + 0.18));
    if (decayRef.current) clearTimeout(decayRef.current);
    decayRef.current = setTimeout(() => {
      setTypingEnergy((prev) => Math.max(0, prev - 0.2));
    }, 140);
  }, []);

  const signalPulse = useCallback((rect, strength = 0.6) => {
    if (!rect) return;
    setPulse({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      strength,
      t: Date.now(),
    });
  }, []);

  const signalSuccess = useCallback((area = 'default') => {
    setSuccessWave(Date.now());
    const msg = SUCCESS_QUOTES[area] || SUCCESS_QUOTES.default;
    setQuoteHighlight({ text: msg, t: Date.now() });
    setTimeout(() => setQuoteHighlight(null), 5500);
  }, []);

  useEffect(() => () => {
    if (decayRef.current) clearTimeout(decayRef.current);
  }, []);

  const value = useMemo(
    () => ({
      context,
      intensity,
      intensityScale: INTENSITY_SCALE[intensity] ?? 1,
      setIntensity,
      focusPoint,
      typingEnergy,
      powerMode,
      pulse,
      successWave,
      quoteHighlight,
      quoteFocus,
      quotes: VITALITY_QUOTES[context] || VITALITY_QUOTES.dashboard,
      signalFocus,
      signalBlur,
      signalTyping,
      signalPulse,
      signalSuccess,
    }),
    [
      context,
      intensity,
      focusPoint,
      typingEnergy,
      powerMode,
      pulse,
      successWave,
      quoteHighlight,
      quoteFocus,
      setIntensity,
      signalFocus,
      signalBlur,
      signalTyping,
      signalPulse,
      signalSuccess,
    ],
  );

  return (
    <VitalityContext.Provider value={value}>
      {children}
    </VitalityContext.Provider>
  );
}

export function useVitality() {
  const ctx = useContext(VitalityContext);
  if (!ctx) {
    return {
      signalFocus: () => {},
      signalBlur: () => {},
      signalTyping: () => {},
      signalPulse: () => {},
      signalSuccess: () => {},
    };
  }
  return ctx;
}