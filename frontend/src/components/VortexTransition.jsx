import { useEffect, useRef } from 'react';

export default function VortexTransition({ active, onComplete }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const DURATION = 2000;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 220 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * Math.max(window.innerWidth, window.innerHeight) * 0.65 + 40,
      speed: 0.012 + Math.random() * 0.028,
      size: Math.random() * 2.2 + 0.4,
      hue: Math.random() > 0.5 ? 195 : 270,
    }));

    startRef.current = performance.now();

    const draw = (now) => {
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / DURATION);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.fillStyle = `rgba(0, 0, 0, ${0.22 + t * 0.35})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const vortexPull = 1 + t * 3.5;

      particles.forEach((p) => {
        p.angle += p.speed * vortexPull;
        p.radius *= 0.996 - t * 0.004;
        if (p.radius < 8) p.radius = Math.max(canvas.width, canvas.height) * 0.55;

        const x = cx + Math.cos(p.angle) * p.radius;
        const y = cy + Math.sin(p.angle) * p.radius;
        const alpha = Math.min(1, (p.radius / 200) * (0.3 + t * 0.7));

        const grad = ctx.createRadialGradient(x, y, 0, x, y, p.size * 4);
        grad.addColorStop(0, `hsla(${p.hue}, 90%, 70%, ${alpha})`);
        grad.addColorStop(1, `hsla(${p.hue}, 80%, 40%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, p.size * (1 + t), 0, Math.PI * 2);
        ctx.fill();
      });

      const coreSize = 20 + t * 120;
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
      core.addColorStop(0, `rgba(255,255,255,${0.15 + t * 0.5})`);
      core.addColorStop(0.35, `rgba(120,80,255,${0.25 + t * 0.35})`);
      core.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
      ctx.fill();

      if (t < 1) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        onComplete?.();
      }
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <div className="vortex-overlay" aria-hidden="true">
      <canvas ref={canvasRef} className="vortex-canvas" />
      <div className="vortex-text">
        <span className="vortex-title">Entering FitTrack</span>
        <span className="vortex-sub">Syncing your universe...</span>
      </div>
    </div>
  );
}