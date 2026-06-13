import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { computeCalmMode, cardRectFromElement } from '../lib/vitalityConsistency';
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
const NUMERIC_PATTERN = /^\d+\.?\d*$/;

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

const VITALITY_STUB_RUNTIME = {
  context: 'dashboard',
  intensity: 'medium',
  intensityScale: 1,
  calmMode: false,
  focusPoint: null,
  typingEnergy: 0,
  numericTyping: false,
  powerMode: false,
  pulses: [],
  successWave: 0,
  successRect: null,
};

const VITALITY_STUB = {
  ...VITALITY_STUB_RUNTIME,
  setIntensity: () => {},
  quoteHighlight: null,
  quoteFocus: null,
  quotes: VITALITY_QUOTES.dashboard,
  signalFocus: () => {},
  signalBlur: () => {},
  signalTyping: () => {},
  signalPulse: () => {},
  signalSuccess: () => {},
  signalSuccessFromElement: () => {},
  runtimeRef: { current: VITALITY_STUB_RUNTIME },
};

export function VitalityProvider({ context = 'dashboard', tracker = null, children }) {
  const [intensity, setIntensityState] = useState(loadIntensity);
  const [focusPoint, setFocusPoint] = useState(null);
  const [typingEnergy, setTypingEnergy] = useState(0);
  const [numericTyping, setNumericTyping] = useState(false);
  const [powerMode, setPowerMode] = useState(false);
  const [pulses, setPulses] = useState([]);
  const [successWave, setSuccessWave] = useState(0);
  const [successRect, setSuccessRect] = useState(null);
  const [quoteHighlight, setQuoteHighlight] = useState(null);
  const [quoteFocus, setQuoteFocus] = useState(null);
  const decayRef = useRef(null);
  const focusQuoteRef = useRef(null);
  const powerRef = useRef(false);
  const runtimeRef = useRef({});

  const calmMode = useMemo(() => computeCalmMode(tracker), [tracker]);

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

    const quoteContext = THEME_TO_CONTEXT[fieldTheme] || context;
    const pool = FOCUS_QUOTES[quoteContext] || FOCUS_QUOTES.dashboard;
    const text = pickQuote(pool, focusQuoteRef.current);
    focusQuoteRef.current = text;
    setQuoteFocus({ text, t: Date.now() });
  }, [context]);

  const signalBlur = useCallback(() => {
    setFocusPoint(null);
    setTypingEnergy(0);
    setNumericTyping(false);
    setPowerMode(false);
    powerRef.current = false;
    setTimeout(() => setQuoteFocus(null), 1800);
  }, []);

  const signalTyping = useCallback((text, _theme, { numeric = false } = {}) => {
    const str = String(text ?? '').trim();
    const power = detectPowerWords(str);
    const isNum = numeric || NUMERIC_PATTERN.test(str) || /\d{2,}/.test(str);
    powerRef.current = power;
    setPowerMode(power);
    setNumericTyping(isNum);
    setTypingEnergy((prev) => Math.min(1, prev + (isNum ? 0.26 : 0.18)));
  }, []);

  const signalPulse = useCallback((rect, strength = 0.35) => {
    if (!rect) return;
    const entry = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      strength: Math.min(0.55, strength * (powerRef.current ? 1.15 : 1)),
      warm: powerRef.current,
      t: Date.now(),
    };
    setPulses((prev) => [...prev.slice(-3), entry]);
  }, []);

  const signalSuccess = useCallback((area = 'default', rect = null) => {
    const now = Date.now();
    setSuccessWave(now);
    setSuccessRect(rect);
    const msg = SUCCESS_QUOTES[area] || SUCCESS_QUOTES.default;
    setQuoteHighlight({ text: msg, t: now });
    setTimeout(() => {
      setQuoteHighlight(null);
      setSuccessRect(null);
    }, 5500);
    setTimeout(() => setSuccessWave(0), 2000);
  }, []);

  const signalSuccessFromElement = useCallback((area, el) => {
    signalSuccess(area, cardRectFromElement(el));
  }, [signalSuccess]);

  useEffect(() => {
    if (typingEnergy <= 0) {
      powerRef.current = false;
      setPowerMode(false);
      setNumericTyping(false);
      return undefined;
    }
    const t = setTimeout(() => {
      setTypingEnergy((e) => Math.max(0, e - 0.14));
    }, 140);
    return () => clearTimeout(t);
  }, [typingEnergy]);

  useEffect(() => () => {
    if (decayRef.current) clearTimeout(decayRef.current);
  }, []);

  useEffect(() => {
    const onFocusIn = (e) => {
      const el = e.target;
      if (!el?.matches?.('input, textarea, select')) return;
      if (el.classList?.contains('reactive-input')) return;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) signalFocus(rect, null);
    };
    const onInput = (e) => {
      const el = e.target;
      if (!el?.matches?.('input, textarea')) return;
      if (el.classList?.contains('reactive-input')) return;
      const numeric = el.type === 'number';
      signalTyping(el.value, null, { numeric });
      signalPulse(el.getBoundingClientRect(), numeric ? 0.38 : 0.28);
    };
    const onFocusOut = (e) => {
      const next = e.relatedTarget;
      if (next?.matches?.('input, textarea, select')) return;
      if (e.target?.matches?.('input, textarea, select') && !e.target.classList?.contains('reactive-input')) {
        signalBlur();
      }
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('input', onInput);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('input', onInput);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, [signalFocus, signalBlur, signalTyping, signalPulse]);

  const value = useMemo(
    () => ({
      context,
      intensity,
      intensityScale: INTENSITY_SCALE[intensity] ?? 1,
      calmMode,
      setIntensity,
      focusPoint,
      typingEnergy,
      numericTyping,
      powerMode,
      pulses,
      successWave,
      successRect,
      quoteHighlight,
      quoteFocus,
      quotes: VITALITY_QUOTES[context] || VITALITY_QUOTES.dashboard,
      signalFocus,
      signalBlur,
      signalTyping,
      signalPulse,
      signalSuccess,
      signalSuccessFromElement,
      runtimeRef,
    }),
    [
      context,
      intensity,
      calmMode,
      focusPoint,
      typingEnergy,
      numericTyping,
      powerMode,
      pulses,
      successWave,
      successRect,
      quoteHighlight,
      quoteFocus,
      setIntensity,
      signalFocus,
      signalBlur,
      signalTyping,
      signalPulse,
      signalSuccess,
      signalSuccessFromElement,
    ],
  );

  runtimeRef.current = {
    context,
    intensity,
    intensityScale: INTENSITY_SCALE[intensity] ?? 1,
    calmMode,
    focusPoint,
    typingEnergy,
    numericTyping,
    powerMode,
    pulses,
    successWave,
    successRect,
  };

  return (
    <VitalityContext.Provider value={value}>
      {children}
    </VitalityContext.Provider>
  );
}

export function useVitality() {
  const ctx = useContext(VitalityContext);
  return ctx || VITALITY_STUB;
}