import { useState, useCallback } from 'react';

const FLOATERS = [
  { emoji: '🏋️', size: 2.2, path: 'wander-a', dur: 34, delay: 0 },
  { emoji: '🚀', size: 2.5, path: 'wander-b', dur: 38, delay: 2 },
  { emoji: '🍎', size: 2, path: 'wander-c', dur: 32, delay: 4 },
  { emoji: '🍌', size: 1.8, path: 'wander-d', dur: 36, delay: 1 },
  { emoji: '🍗', size: 2.1, path: 'wander-e', dur: 40, delay: 6 },
  { emoji: '🥕', size: 1.7, path: 'wander-f', dur: 33, delay: 3 },
  { emoji: '🍊', size: 1.9, path: 'wander-g', dur: 37, delay: 5 },
  { emoji: '🥦', size: 1.6, path: 'wander-h', dur: 31, delay: 7 },
  { emoji: '🍇', size: 1.8, path: 'wander-i', dur: 39, delay: 2.5 },
  { emoji: '🥚', size: 1.5, path: 'wander-j', dur: 30, delay: 8 },
  { emoji: '🥑', size: 1.7, path: 'wander-k', dur: 35, delay: 1.5 },
  { emoji: '🍕', size: 2, path: 'wander-l', dur: 42, delay: 9 },
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
        !hidden.has(f.emoji + f.path) && (
          <button
            key={`${f.emoji}-${f.path}`}
            type="button"
            className={`floater floater-roam ${f.path}`}
            style={{
              '--size': `${f.size}rem`,
              '--dur': `${f.dur}s`,
              '--delay': `${f.delay}s`,
            }}
            onClick={(e) => pop(f.emoji + f.path, f.emoji, e)}
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