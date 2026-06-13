import { useState, useCallback, memo } from 'react';

const FLOATERS = [
  { emoji: '💧', size: 3.2, path: 'wander-a', dur: 28, delay: 0 },
  { emoji: '🏋️', size: 3, path: 'wander-b', dur: 32, delay: 2 },
  { emoji: '🚀', size: 3.4, path: 'wander-c', dur: 36, delay: 4 },
  { emoji: '🍎', size: 2.8, path: 'wander-d', dur: 30, delay: 1 },
  { emoji: '🍗', size: 3, path: 'wander-e', dur: 38, delay: 6 },
  { emoji: '🥕', size: 2.6, path: 'wander-f', dur: 31, delay: 3 },
  { emoji: '💧', size: 2.4, path: 'wander-g', dur: 26, delay: 5 },
  { emoji: '🥦', size: 2.5, path: 'wander-h', dur: 29, delay: 7 },
  { emoji: '🍇', size: 2.7, path: 'wander-i', dur: 35, delay: 2.5 },
  { emoji: '🥤', size: 3.1, path: 'wander-j', dur: 27, delay: 8 },
];

function Burst({ x, y, emoji, onDone }) {
  return (
    <div
      className="food-burst"
      style={{ left: x, top: y }}
      onAnimationEnd={onDone}
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className="burst-particle"
          style={{ '--a': `${i * 36}deg` }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

function FloatingFoodBackground() {
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
    }, 2000);
  }, []);

  return (
    <div className="starfield" aria-hidden="true">
      <div className="starfield-nebula" />
      <div className="starfield-grid" />
      {Array.from({ length: 18 }).map((_, i) => (
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

export default memo(FloatingFoodBackground);