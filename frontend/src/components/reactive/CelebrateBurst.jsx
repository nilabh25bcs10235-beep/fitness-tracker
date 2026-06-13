import { useEffect, useState } from 'react';

const BURST_THEMES = {
  food: ['🎉', '✨', '🥗', '💚'],
  fire: ['🔥', '⚡', '✨', '💪'],
  water: ['💧', '✨', '🌊', '💙'],
  recipe: ['✨', '🌿', '⭐', '🥘'],
  workout: ['💪', '🏋️', '⚡', '✨'],
  default: ['✨', '⭐', '💫', '🎉'],
};

export default function CelebrateBurst({ active, theme = 'default', message, onDone }) {
  const [visible, setVisible] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!active) return undefined;

    const icons = BURST_THEMES[theme] || BURST_THEMES.default;
    setParticles(
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        icon: icons[i % icons.length],
        x: 20 + Math.random() * 60,
        delay: Math.random() * 0.15,
        rotate: Math.random() * 360,
      })),
    );
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 1600);

    return () => clearTimeout(timer);
  }, [active, theme, onDone]);

  if (!visible) return null;

  return (
    <div className="celebrate-burst" role="status" aria-live="polite">
      {message && <span className="celebrate-message">{message}</span>}
      {particles.map((p) => (
        <span
          key={p.id}
          className="celebrate-particle"
          style={{
            left: `${p.x}%`,
            animationDelay: `${p.delay}s`,
            '--rot': `${p.rotate}deg`,
          }}
        >
          {p.icon}
        </span>
      ))}
    </div>
  );
}