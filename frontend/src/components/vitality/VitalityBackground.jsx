import { memo, useEffect, useRef } from 'react';
import { useVitality } from '../../context/VitalityContext';
import VitalityQuoteLayer from './VitalityQuoteLayer';

const NODE_COUNT = 58;
const CONNECT_DIST = 130;

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

function VitalityCanvas() {
  const canvasRef = useRef(null);
  const nodesRef = useRef([]);
  const frameRef = useRef(null);
  const stateRef = useRef({});

  const {
    context,
    intensity,
    intensityScale,
    focusPoint,
    typingEnergy,
    powerMode,
    pulse,
    successWave,
  } = useVitality();

  stateRef.current = {
    context,
    intensity,
    intensityScale,
    focusPoint,
    typingEnergy,
    powerMode,
    pulse,
    successWave,
  };

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
      const themeSpeed = THEME_SPEED[s.context] || 1;
      const [hr, hg, hb] = THEME_HUE[s.context] || THEME_HUE.dashboard;
      const warm = s.powerMode;
      const energy = Math.min(1, s.typingEnergy + (s.focusPoint ? 0.25 : 0));
      const now = Date.now();

      ctx.clearRect(0, 0, width, height);

      const grad = ctx.createRadialGradient(width * 0.5, height * 0.35, 0, width * 0.5, height * 0.5, width * 0.85);
      grad.addColorStop(0, `rgba(${hr}, ${hg}, ${hb}, ${baseAlpha * 0.35})`);
      grad.addColorStop(1, 'rgba(3, 3, 8, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const nodes = nodesRef.current;
      const focus = s.focusPoint;

      nodes.forEach((n) => {
        const wave = Math.sin(n.phase + now / 2200) * 0.04;
        n.phase += 0.004 * themeSpeed;

        if (focus) {
          const dx = focus.x - n.x;
          const dy = focus.y - n.y;
          const dist = Math.hypot(dx, dy) || 1;
          const pull = 0.00035 * energy * (1 + (warm ? 0.5 : 0));
          n.vx += (dx / dist) * pull;
          n.vy += (dy / dist) * pull * 0.6;
          if (dist < 180) n.glow = Math.min(1, n.glow + 0.04);
          else n.glow = Math.max(0, n.glow - 0.02);
        } else {
          n.glow = Math.max(0, n.glow - 0.015);
        }

        n.vy += (-0.018 - wave) * themeSpeed;
        n.vx += wave * 0.3;
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

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > CONNECT_DIST) continue;

          const lineAlpha = baseAlpha * (1 - dist / CONNECT_DIST) * (0.5 + energy * 0.5);
          const wr = warm ? hr + 40 : hr;
          const wg = warm ? hg - 30 : hg;
          ctx.strokeStyle = `rgba(${wr}, ${wg}, ${hb}, ${lineAlpha})`;
          ctx.lineWidth = 0.6 + energy * 0.4;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      nodes.forEach((n) => {
        const nodeAlpha = baseAlpha * (1.2 + n.glow * 0.8 + energy * 0.3);
        const nr = warm ? hr + 30 : hr;
        const ng = warm ? hg - 20 : hg;
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size * 4);
        glow.addColorStop(0, `rgba(${nr}, ${ng}, ${hb}, ${nodeAlpha})`);
        glow.addColorStop(1, `rgba(${nr}, ${ng}, ${hb}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      if (s.pulse && now - s.pulse.t < 900) {
        const age = (now - s.pulse.t) / 900;
        const r = 8 + age * 80;
        ctx.strokeStyle = `rgba(${hr}, ${hg}, ${hb}, ${(1 - age) * 0.35 * scale})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(s.pulse.x, s.pulse.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (s.successWave && now - s.successWave < 1400) {
        const age = (now - s.successWave) / 1400;
        const y = height * (1 - age);
        const waveGrad = ctx.createLinearGradient(0, y - 40, 0, y + 40);
        waveGrad.addColorStop(0, 'rgba(34, 211, 238, 0)');
        waveGrad.addColorStop(0.5, `rgba(34, 211, 238, ${(1 - age) * 0.25 * scale})`);
        waveGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
        ctx.fillStyle = waveGrad;
        ctx.fillRect(0, y - 50, width, 100);
        nodes.forEach((n) => {
          if (Math.abs(n.y - y) < 60) n.glow = Math.min(1, n.glow + 0.08);
        });
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
  const { intensity } = useVitality();

  return (
    <div className={`vitality-bg ${intensity === 'off' ? 'vitality-off' : ''}`} aria-hidden="true">
      <div className="vitality-base" />
      <VitalityCanvas />
      <VitalityQuoteLayer />
    </div>
  );
}

export default memo(VitalityBackground);