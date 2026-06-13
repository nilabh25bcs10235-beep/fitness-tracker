import { useEffect, useRef, useState } from 'react';
import { pickQuote } from '../../lib/vitalityQuotes';
import { useVitality } from '../../context/VitalityContext';

const FADE_MS = 3200;
const HOLD_MS = 5200;
const CYCLE_MS = FADE_MS + HOLD_MS + FADE_MS;

function useQuoteCycle(quotes, enabled, offset = 0) {
  const [text, setText] = useState(quotes[0] || '');
  const [visible, setVisible] = useState(false);
  const prevRef = useRef(text);

  useEffect(() => {
    if (!enabled || quotes.length === 0) {
      setVisible(false);
      return undefined;
    }

    setText(pickQuote(quotes));
    prevRef.current = quotes[0];

    let fadeOutTimer;
    let swapTimer;
    let fadeInTimer;
    let cycleTimer;

    const runCycle = () => {
      setVisible(true);
      fadeOutTimer = setTimeout(() => setVisible(false), FADE_MS + HOLD_MS);
      swapTimer = setTimeout(() => {
        const next = pickQuote(quotes, prevRef.current);
        prevRef.current = next;
        setText(next);
      }, FADE_MS + HOLD_MS + FADE_MS - 180);
      fadeInTimer = setTimeout(() => setVisible(true), FADE_MS + HOLD_MS + FADE_MS);
    };

    const startTimer = setTimeout(runCycle, offset);
    cycleTimer = setInterval(runCycle, CYCLE_MS);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(swapTimer);
      clearTimeout(fadeInTimer);
      clearInterval(cycleTimer);
    };
  }, [quotes, enabled, offset]);

  return { text, visible };
}

export default function VitalityQuoteLayer() {
  const {
    quotes,
    quoteHighlight,
    quoteFocus,
    intensity,
    context,
    focusPoint,
    typingEnergy,
  } = useVitality();

  const enabled = intensity !== 'off';
  const primary = useQuoteCycle(quotes, enabled, 0);
  const secondary = useQuoteCycle(quotes, enabled, Math.round(CYCLE_MS * 0.48));

  if (!enabled) return null;

  const showFocus = quoteFocus && focusPoint;
  const focusLeft = focusPoint
    ? `${Math.min(70, Math.max(6, (focusPoint.x / (typeof window !== 'undefined' ? window.innerWidth : 1200)) * 100 - 14))}%`
    : undefined;
  const focusTop = focusPoint
    ? `${Math.min(65, Math.max(20, (focusPoint.y / (typeof window !== 'undefined' ? window.innerHeight : 800)) * 100 + 8))}%`
    : undefined;

  return (
    <div className="vitality-quotes" aria-hidden="true" data-context={context}>
      <p className={`vitality-quote ambient slot-bl ${primary.visible ? 'visible' : ''}`}>
        {primary.text}
      </p>

      <p className={`vitality-quote ambient slot-tr ${secondary.visible ? 'visible' : ''}`}>
        {secondary.text}
      </p>

      {showFocus && (
        <p
          className={`vitality-quote focus visible ${typingEnergy > 0.2 ? 'typing' : ''}`}
          style={{ left: focusLeft, top: focusTop }}
        >
          {quoteFocus.text}
        </p>
      )}

      {quoteHighlight?.text && (
        <p className="vitality-quote reward visible" key={quoteHighlight.t}>
          {quoteHighlight.text}
        </p>
      )}
    </div>
  );
}