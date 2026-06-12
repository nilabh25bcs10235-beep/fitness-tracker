import { useState, useCallback } from 'react';

const FLOATERS = [
  { emoji: '🏋️', size: 2.2, x: 8, y: 15, dur: 18 },
  { emoji: '🚀', size: 2.5, x: 85, y: 20, dur: 22 },
  { emoji: '🍎', size: 2, x: 20, y: 70, dur: 16 },
  { emoji: '🍌', size: 1.8, x: 70, y: 65, dur: 20 },
  { emoji: '🍗', size: 2.1, x: 45, y: 10, dur: 24 },
  { emoji: '🥕', size: 1.7, x: 55, y: 80, dur: 19 },
  { emoji: '🍊', size: 1.9, x: 90, y: 50, dur: 21 },
  { emoji: '🥦', size: 1.6, x: 12, y: 45, dur: 17 },
  { emoji: '🍇', size: 1.8, x: 35, y: 35, dur: 23 },
  { emoji: '🥚', size: 1.5, x: 62, y: 40, dur: 15 },
];

function Burst({ x, y, emoji, onDone }) {
  return (
    <div
      className="food-burst"
      style={{ left: x, top: y }}
      onAnimationEnd={onDone}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="burst-particle"
          style={{ '--a': `${i * 45}deg` }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

export default function FloatingFoodBackground() {
  const [bursts, setBursts] = useState([]);
  const [hidden, setHidden] = useState(new Set());

  const pop = useCallback((id, emoji, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const burstId = `${id}-${Date.now()}`;
    setBursts((b) => [...b, { id: burstId, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, emoji }]);
    setHidden((h) => new Set(h).add(id));
    setTimeout(() => {
      setHidden((h) => {
        const next = new Set(h);
        next.delete(id);
        return next;
      });
    }, 2200);
  }, []);

  return (
    <div className="starfield" aria-hidden="true">
      <div className="starfield-nebula" />
      <div className="starfield-grid" />
      {Array.from({ length: 36 }).map((_, i) => (
        <span
          key={`star-${i}`}
          className="star"
          style={{
            '--x': `${(i * 37) % 100}%`,
            '--y': `${(i * 53) % 100}%`,
            '--d': `${2 + (i % 4)}s`,
            '--delay': `${(i % 10) * 0.4}s`,
            '--size': `${1 + (i % 3)}px`,
          }}
        />
      ))}
      {FLOATERS.map((f) => (
        !hidden.has(f.emoji + f.x) && (
          <button
            key={`${f.emoji}-${f.x}`}
            type="button"
            className="floater"
            style={{
              '--x': `${f.x}%`,
              '--y': `${f.y}%`,
              '--size': `${f.size}rem`,
              '--dur': `${f.dur}s`,
            }}
            onClick={(e) => pop(f.emoji + f.x, f.emoji, e)}
            tabIndex={-1}
            aria-hidden="true"
          >
            {f.emoji}
          </button>
        )
      ))}
      {bursts.map((b) => (
        <Burst
          key={b.id}
          x={b.x}
          y={b.y}
          emoji={b.emoji}
          onDone={() => setBursts((prev) => prev.filter((x) => x.id !== b.id))}
        />
      ))}
    </div>
  );
}