import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const DisplayContext = createContext(null);

const BRIGHTNESS_KEY = 'fittrack-screen-brightness';
const LEVELS = ['soft', 'normal', 'bright', 'vivid'];

export const BRIGHTNESS_FILTER = {
  soft: 0.86,
  normal: 1,
  bright: 1.1,
  vivid: 1.22,
};

function loadBrightness() {
  try {
    const v = localStorage.getItem(BRIGHTNESS_KEY);
    if (LEVELS.includes(v)) return v;
  } catch {
    /* ignore */
  }
  return 'normal';
}

export function DisplayProvider({ children }) {
  const [brightness, setBrightnessState] = useState(loadBrightness);

  const setBrightness = useCallback((level) => {
    setBrightnessState(level);
    try {
      localStorage.setItem(BRIGHTNESS_KEY, level);
    } catch {
      /* ignore */
    }
  }, []);

  const cycleBrightness = useCallback(() => {
    setBrightnessState((current) => {
      const idx = LEVELS.indexOf(current);
      const next = LEVELS[(idx + 1) % LEVELS.length];
      try {
        localStorage.setItem(BRIGHTNESS_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      brightness,
      brightnessFilter: BRIGHTNESS_FILTER[brightness] ?? 1,
      setBrightness,
      cycleBrightness,
    }),
    [brightness, setBrightness, cycleBrightness],
  );

  return (
    <DisplayContext.Provider value={value}>
      {children}
    </DisplayContext.Provider>
  );
}

export function useDisplay() {
  const ctx = useContext(DisplayContext);
  if (!ctx) {
    return { brightness: 'normal', brightnessFilter: 1, cycleBrightness: () => {} };
  }
  return ctx;
}