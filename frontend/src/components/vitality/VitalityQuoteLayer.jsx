import { useEffect, useState } from 'react';
import { useVitality } from '../../context/VitalityContext';

export default function VitalityQuoteLayer() {
  const { quotes, quoteHighlight, intensity, context } = useVitality();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (intensity === 'off') return undefined;
    setVisible(false);
    const showTimer = setTimeout(() => setVisible(true), 400);
    const rotate = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % quotes.length);
        setVisible(true);
      }, 1200);
    }, 11000);
    return () => {
      clearTimeout(showTimer);
      clearInterval(rotate);
    };
  }, [quotes.length, intensity, context]);

  if (intensity === 'off') return null;

  const ambient = quotes[index];
  const highlight = quoteHighlight?.text;

  return (
    <div className="vitality-quotes" aria-hidden="true">
      <p className={`vitality-quote ambient ${visible ? 'visible' : ''}`}>
        {ambient}
      </p>
      {highlight && (
        <p className="vitality-quote highlight visible" key={highlight}>
          {highlight}
        </p>
      )}
    </div>
  );
}