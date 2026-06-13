import { memo, useEffect, useRef } from 'react';
import { useVitality } from '../../context/VitalityContext';
import VitalityQuoteLayer from './VitalityQuoteLayer';

const NODE_COUNT = 62;
const CONNECT_DIST = 135;
const FLOW_DIST = 260;

const THEME_SPEED = {
  dashboard: 0.75,
  meals: 1,
  workouts: 1.15,
  recipes: 0.9,
  ai: 1.25,
};

const THEME_HUE = {
  dashboard: [34, 211, 238],
  meals: [45, 212, 191],
  workouts: [56, 189, 248],
  recipes: [52, 211, 153],
  ai: [99, 102, 241],
};

const WARM_HUE = [251, 146, 60];

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function createNodes(w, h) {
  return Array.from({ length: NODE_COUNT }, () => ({
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-0.12, 0.12),
    vy: rand(-0.22, -0.06),
    phase: rand(0, Math.PI * 2),
    glow: 0,
    size: rand(1.2, 2.8),
  }));
}

function lerpHue(base, warm, t) {
  return [
    Math.round(base[0] + (warm[0] - base[0]) * t),
    Math.round(base[1] + (warm[1] - base[1]) * t),
    Math.round(base[2] + (warm[2] - base[2]) * t),
  ];
}

function VitalityCanvas() {
  const canvasRef = useRef(null);
  const nodesRef = useRef([]);
  const frameRef = useRef(null);
  const stateRef = useRef({});

  const vitality = useVitality();
  stateRef.current = vitality;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (nodesRef.current.length === 0) {
        nodesRef.current = createNodes(width, height);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const s = stateRef.current;
      if (s.intensity === 'off') {
        ctx.clearRect(0, 0, width, height);
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      const scale = s.intensityScale;
      const baseAlpha = (s.intensity === 'low' ? 0.08 : s.intensity === 'high' ? 0.2 : 0.14) * scale;
      const calm = s.calmMode ? 0.52 : 1;
      const themeSpeed = (THEME_SPEED[s.context] || 1) * calm;
      const baseHue = THEME_HUE[s.context] || THEME_HUE.dashboard;
      const warmMix = s.powerMode ? 0.55 : 0;
      const [hr, hg, hb] = lerpHue(baseHue, WARM_HUE, warmMix);
      const energy = Math.min(
        1,
        s.typingEnergy + (s.focusPoint ? 0.32 : 0) + (s.numericTyping ? 0.12 : 0),
      );
      const now = Date.now();
      const focus = s.focusPoint;

      ctx.clearRect(0, 0, width, height);

      const grad = ctx.createRadialGradient(width * 0.5, height * 0.35, 0, width * 0.5, height * 0.5, width * 0.85);
      grad.addColorStop(0, `rgba(${hr}, ${hg}, ${hb}, ${baseAlpha * 0.35 * calm})`);
      grad.addColorStop(1, 'rgba(3, 3, 8, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const nodes = nodesRef.current;

      nodes.forEach((n) => {
        const wave = Math.sin(n.phase + now / (calm > 0.9 ? 2200 : 3200)) * 0.04;
        n.phase += 0.004 * themeSpeed;

        if (focus) {
          const dx = focus.x - n.x;
          const dy = focus.y - n.y;
          const dist = Math.hypot(dx, dy) || 1;
          const pull = 0.00055 * energy * (1 + (s.powerMode ? 0.65 : 0)) * calm;
          n.vx += (dx / dist) * pull;
          n.vy += (dy / dist) * pull * 0.65;
          if (dist < FLOW_DIST) n.glow = Math.min(1, n.glow + 0.05 * energy);
          else n.glow = Math.max(0, n.glow - 0.018);
        } else {
          n.glow = Math.max(0, n.glow - 0.014);
        }

        n.vy += (-0.018 - wave) * themeSpeed;
        n.vx += wave * 0.28;
        n.x += n.vx * themeSpeed;
        n.y += n.vy * themeSpeed;
        n.vx *= 0.992;
        n.vy *= 0.992;

        if (n.y < -20) {
          n.y = height + 20;
          n.x = rand(0, width);
        }
        if (n.x < -20) n.x = width + 20;
        if (n.x > width + 20) n.x = -20;
      });

      if (focus) {
        const nearby = nodes
          .map((n) => ({ n, d: Math.hypot(n.x - focus.x, n.y - focus.y) }))
          .filter(({ d }) => d < FLOW_DIST)
          .sort((a, b) => a.d - b.d)
          .slice(0, 14);

        nearby.forEach(({ n, d }) => {
          const alpha = baseAlpha * (1 - d / FLOW_DIST) * (0.35 + energy * 0.65);
          ctx.strokeStyle = `rgba(${hr}, ${hg}, ${hb}, ${alpha})`;
          ctx.lineWidth = 0.5 + energy * 0.6;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(focus.x, focus.y);
          ctx.stroke();
        });

        const focusGlow = ctx.createRadialGradient(
          focus.x, focus.y, 0,
          focus.x, focus.y, 90 + energy * 40,
        );
        focusGlow.addColorStop(0, `rgba(${hr}, ${hg}, ${hb}, ${0.06 + energy * 0.08})`);
        focusGlow.addColorStop(1, 'rgba(34, 211, 238, 0)');
        ctx.fillStyle = focusGlow;
        ctx.beginPath();
        ctx.arc(focus.x, focus.y, 90 + energy * 40, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > CONNECT_DIST) continue;

          let lineBoost = 0.5 + energy * 0.55;
          if (focus) {
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            const fd = Math.hypot(midX - focus.x, midY - focus.y);
            if (fd < FLOW_DIST) lineBoost += (1 - fd / FLOW_DIST) * 0.4;
          }

          const lineAlpha = baseAlpha * (1 - dist / CONNECT_DIST) * lineBoost;
          ctx.strokeStyle = `rgba(${hr}, ${hg}, ${hb}, ${lineAlpha})`;
          ctx.lineWidth = 0.55 + energy * 0.5 + (s.powerMode ? 0.25 : 0);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      nodes.forEach((n) => {
        const nodeAlpha = baseAlpha * (1.15 + n.glow * 0.95 + energy * 0.35);
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size * 4);
        glow.addColorStop(0, `rgba(${hr}, ${hg}, ${hb}, ${nodeAlpha})`);
        glow.addColorStop(1, `rgba(${hr}, ${hg}, ${hb}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      (s.pulses || []).forEach((p) => {
        const age = (now - p.t) / (p.warm ? 1100 : 850);
        if (age >= 1) return;
        const pr = p.warm ? WARM_HUE : baseHue;
        const rings = p.strength > 0.7 ? 2 : 1;
        for (let r = 0; r < rings; r += 1) {
          const ringAge = Math.min(1, age + r * 0.12);
          const radius = 6 + ringAge * (p.strength > 0.7 ? 95 : 72);
          const alpha = (1 - ringAge) * 0.38 * scale * p.strength;
          ctx.strokeStyle = `rgba(${pr[0]}, ${pr[1]}, ${pr[2]}, ${alpha})`;
          ctx.lineWidth = 1.2 + (1 - ringAge) * 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      if (s.successWave && now - s.successWave < 1800) {
        const age = (now - s.successWave) / 1800;
        const rect = s.successRect;

        if (rect) {
          const waveY = rect.bottom - (rect.bottom - rect.top) * age;
          const waveGrad = ctx.createLinearGradient(rect.left, waveY - 30, rect.left, waveY + 30);
          waveGrad.addColorStop(0, 'rgba(34, 211, 238, 0)');
          waveGrad.addColorStop(0.5, `rgba(52, 211, 153, ${(1 - age) * 0.32 * scale})`);
          waveGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
          ctx.fillStyle = waveGrad;
          ctx.fillRect(rect.left - 8, waveY - 40, rect.width + 16, 80);

          nodes.forEach((n) => {
            if (
              n.x >= rect.left - 20 &&
              n.x <= rect.right + 20 &&
              Math.abs(n.y - waveY) < 70
            ) {
              n.glow = Math.min(1, n.glow + 0.12 * (1 - age));
            }
          });
        } else {
          const y = height * (1 - age * 0.85);
          const waveGrad = ctx.createLinearGradient(0, y - 40, 0, y + 40);
          waveGrad.addColorStop(0, 'rgba(34, 211, 238, 0)');
          waveGrad.addColorStop(0.5, `rgba(34, 211, 238, ${(1 - age) * 0.28 * scale})`);
          waveGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
          ctx.fillStyle = waveGrad;
          ctx.fillRect(0, y - 50, width, 100);
          nodes.forEach((n) => {
            if (Math.abs(n.y - y) < 65) n.glow = Math.min(1, n.glow + 0.1);
          });
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      if (document.hidden && frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      } else if (!frameRef.current) {
        frameRef.current = requestAnimationFrame(draw);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="vitality-canvas" aria-hidden="true" />;
}

function VitalityBackground() {
  const { intensity, calmMode } = useVitality();

  return (
    <div
      className={`vitality-bg ${intensity === 'off' ? 'vitality-off' : ''} ${calmMode ? 'vitality-calm' : ''}`}
      aria-hidden="true"
    >
      <div className="vitality-base" />
      <VitalityCanvas />
      <VitalityQuoteLayer />
    </div>
  );
}

export default memo(VitalityBackground);