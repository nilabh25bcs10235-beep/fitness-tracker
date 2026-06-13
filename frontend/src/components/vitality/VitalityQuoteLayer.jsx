import { useEffect, useRef, useState } from 'react';
import { pickQuote } from '../../lib/vitalityQuotes';
import { useVitality } from '../../context/VitalityContext';

const FADE_IN_MS = 2800;
const HOLD_MS = 5200;
const FADE_OUT_MS = 2800;

function useContextualQuote(quotes, context, enabled) {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState('hidden');
  const prevContextRef = useRef(null);
  const prevQuoteRef = useRef('');

  useEffect(() => {
    if (!enabled || quotes.length === 0) {
      setPhase('hidden');
      return undefined;
    }

    const isRepeat = prevContextRef.current === context;
    prevContextRef.current = context;
    if (isRepeat) return undefined;

    const next = pickQuote(quotes, prevQuoteRef.current);
    prevQuoteRef.current = next;
    setText(next);
    setPhase('entering');

    const holdTimer = setTimeout(() => setPhase('exiting'), FADE_IN_MS + HOLD_MS);
    const hideTimer = setTimeout(() => setPhase('hidden'), FADE_IN_MS + HOLD_MS + FADE_OUT_MS);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(hideTimer);
    };
  }, [quotes, context, enabled]);

  const visible = phase === 'entering' || phase === 'exiting';
  return { text, visible, phase };
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
  const contextual = useContextualQuote(quotes, context, enabled);

  if (!enabled) return null;

  const showFocus = quoteFocus && focusPoint;
  const showReward = Boolean(quoteHighlight?.text);
  const showContextual = contextual.visible && contextual.text && !showFocus && !showReward;

  const focusLeft = focusPoint
    ? `${Math.min(72, Math.max(8, (focusPoint.x / (typeof window !== 'undefined' ? window.innerWidth : 1200)) * 100 - 12))}%`
    : undefined;
  const focusTop = focusPoint
    ? `${Math.min(58, Math.max(22, (focusPoint.y / (typeof window !== 'undefined' ? window.innerHeight : 800)) * 100 + 10))}%`
    : undefined;

  return (
    <div className="vitality-quotes" aria-hidden="true" data-context={context}>
      {showContextual && (
        <p
          className={`vitality-quote contextual ${contextual.phase === 'entering' ? 'visible' : 'fading'}`}
          key={`ctx-${context}-${contextual.text}`}
        >
          <span className="vitality-quote-backdrop" aria-hidden="true" />
          {contextual.text}
        </p>
      )}

      {showFocus && (
        <p
          className={`vitality-quote focus visible ${typingEnergy > 0.2 ? 'typing' : ''}`}
          style={{ left: focusLeft, top: focusTop }}
        >
          {quoteFocus.text}
        </p>
      )}

      {showReward && (
        <p className="vitality-quote reward visible" key={quoteHighlight.t}>
          <span className="vitality-quote-backdrop" aria-hidden="true" />
          {quoteHighlight.text}
        </p>
      )}
    </div>
  );
}