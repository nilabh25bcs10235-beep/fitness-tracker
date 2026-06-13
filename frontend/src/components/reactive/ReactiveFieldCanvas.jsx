import { useEffect, useRef } from 'react';

const THEME_CONFIG = {
  food: {
    emojis: ['🍎', '🥗', '🍗', '🥦', '🍳', '🥑'],
    colors: ['#22d3ee', '#a855f7', '#fbbf24', '#4ade80'],
    gather: true,
  },
  fire: {
    colors: ['#f97316', '#ef4444', '#fbbf24', '#fb923c'],
    gather: false,
  },
  workout: {
    emojis: ['🏋️', '💪', '⚡'],
    colors: ['#6366f1', '#22d3ee', '#a855f7'],
    gather: true,
  },
  water: {
    colors: ['#38bdf8', '#22d3ee', '#67e8f9', '#0ea5e9'],
    gather: false,
  },
  recipe: {
    emojis: ['🌿', '🥘', '✨'],
    colors: ['#a855f7', '#22d3ee', '#4ade80'],
    gather: true,
  },
  chat: {
    colors: ['#6366f1', '#22d3ee', '#a855f7', '#818cf8'],
    gather: true,
  },
};

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function createParticle(w, h, theme, i) {
  const cfg = THEME_CONFIG[theme] || THEME_CONFIG.chat;
  const useEmoji = cfg.emojis && i % 4 === 0;
  return {
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-0.3, 0.3),
    vy: rand(-0.35, 0.35),
    size: useEmoji ? rand(10, 16) : rand(2, 5),
    opacity: rand(0.15, 0.45),
    color: cfg.colors[i % cfg.colors.length],
    emoji: useEmoji ? cfg.emojis[i % cfg.emojis.length] : null,
    phase: rand(0, Math.PI * 2),
  };
}

export default function ReactiveFieldCanvas({ theme = 'chat', focused = false, intensity = 0 }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const frameRef = useRef(null);
  const stateRef = useRef({ focused, intensity });

  stateRef.current = { focused, intensity };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = theme === 'fire' ? 28 : 22;
      particlesRef.current = Array.from({ length: count }, (_, i) =>
        createParticle(rect.width, rect.height, theme, i),
      );
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement || canvas);

    const cfg = THEME_CONFIG[theme] || THEME_CONFIG.chat;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const { focused: f, intensity: inten } = stateRef.current;
      const energy = f ? 0.35 + inten * 0.65 : inten * 0.25;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      ctx.clearRect(0, 0, rect.width, rect.height);

      if (f && energy > 0.2) {
        const pulse = 0.08 + Math.sin(Date.now() / 420) * 0.04;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rect.width * 0.55);
        grad.addColorStop(0, `rgba(34, 211, 238, ${0.06 + energy * 0.08})`);
        grad.addColorStop(1, 'rgba(99, 102, 241, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, rect.width, rect.height);

        ctx.strokeStyle = `rgba(34, 211, 238, ${pulse * energy})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rect.width * 0.42, rect.height * 0.38, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      particlesRef.current.forEach((p) => {
        const speed = 0.4 + energy * 1.6;
        p.phase += 0.02 + energy * 0.03;

        if (f && cfg.gather) {
          p.vx += (cx - p.x) * 0.0008 * energy;
          p.vy += (cy - p.y) * 0.0008 * energy;
        }

        if (theme === 'fire') {
          p.vy -= 0.15 * energy;
          p.vx += Math.sin(p.phase) * 0.08 * energy;
        }

        if (theme === 'water') {
          p.vy += Math.sin(p.phase) * 0.12;
          p.vx += Math.cos(p.phase * 0.7) * 0.06;
        }

        p.x += p.vx * speed;
        p.y += p.vy * speed;

        if (p.x < -10) p.x = rect.width + 10;
        if (p.x > rect.width + 10) p.x = -10;
        if (p.y < -10) p.y = rect.height + 10;
        if (p.y > rect.height + 10) p.y = -10;

        p.vx *= 0.985;
        p.vy *= 0.985;

        const alpha = p.opacity * (0.5 + energy * 0.8);
        if (p.emoji) {
          ctx.font = `${p.size}px sans-serif`;
          ctx.globalAlpha = alpha * 0.7;
          ctx.fillText(p.emoji, p.x, p.y);
        } else {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          if (theme === 'water') {
            ctx.ellipse(p.x, p.y, p.size * 0.6, p.size, 0, 0, Math.PI * 2);
          } else {
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          }
          ctx.fill();
        }
      });

      ctx.globalAlpha = 1;
      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      ro.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="reactive-canvas" aria-hidden="true" />;
}