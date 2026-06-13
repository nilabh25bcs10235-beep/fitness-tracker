import { useEffect, useState } from 'react';

export default function WaterGlass({ progress = 0, splashing = false, size = 'lg' }) {
  const [wave, setWave] = useState(0);
  const fill = Math.min(100, Math.max(4, progress));

  useEffect(() => {
    const id = setInterval(() => setWave((w) => (w + 1) % 360), 80);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`water-glass-wrap water-glass-${size} ${splashing ? 'water-splash' : ''}`}>
      <div className="water-glass-glow" />
      <div className="water-glass">
        <div className="water-glass-rim" />
        <div className="water-glass-body">
          <div className="water-fill" style={{ height: `${fill}%` }}>
            <div
              className="water-wave water-wave-front"
              style={{ transform: `translateX(${Math.sin(wave / 20) * 6}px)` }}
            />
            <div
              className="water-wave water-wave-back"
              style={{ transform: `translateX(${Math.cos(wave / 18) * -8}px)` }}
            />
            <div className="water-bubbles">
              <span /><span /><span /><span />
            </div>
          </div>
          <div className="water-glass-shine" />
        </div>
        <div className="water-glass-base" />
      </div>
      {splashing && (
        <div className="water-splash-drops">
          <span>💧</span><span>💧</span><span>💧</span>
        </div>
      )}
    </div>
  );
}