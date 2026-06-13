import { memo, useEffect, useRef } from 'react';
import { useVitality } from '../../context/VitalityContext';
import VitalityQuoteLayer from './VitalityQuoteLayer';
import {
  THEME_HUE,
  WARM_HUE,
  drawPulses,
  lerpHue,
} from './vitalityDraw';

const NODE_COUNT = 62;
const CONNECT_DIST = 135;

const THEME_SPEED = {
  dashboard: 0.75,
  meals: 1,
  workouts: 1.15,
  recipes: 0.9,
  ai: 1.25,
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

function useVitalityCanvas(drawFrameRef) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const { runtimeRef } = useVitality();

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
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const s = runtimeRef?.current || {};
      drawFrameRef.current?.(ctx, s, { width, height, dpr });
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
  }, [runtimeRef]);

  return canvasRef;
}

function VitalityAmbientCanvas() {
  const nodesRef = useRef([]);
  const drawRef = useRef(null);

  drawRef.current = (ctx, s, { width, height }) => {
    if (s.intensity === 'off') {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const scale = s.intensityScale ?? 1;
    const baseAlpha = (s.intensity === 'low' ? 0.1 : s.intensity === 'high' ? 0.18 : 0.14) * scale;
    const calm = s.calmMode ? 0.52 : 1;
    const themeSpeed = (THEME_SPEED[s.context] || 1) * calm;
    const baseHue = THEME_HUE[s.context] || THEME_HUE.dashboard;
    const warmMix = s.powerMode ? 0.55 : 0;
    const [hr, hg, hb] = lerpHue(baseHue, WARM_HUE, warmMix);
    const now = Date.now();

    if (nodesRef.current.length === 0) {
      nodesRef.current = createNodes(width, height);
    }

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
      n.glow = Math.max(0, n.glow - 0.014);

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

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > CONNECT_DIST) continue;

        const lineAlpha = baseAlpha * (1 - dist / CONNECT_DIST) * 0.5;
        ctx.strokeStyle = `rgba(${hr}, ${hg}, ${hb}, ${lineAlpha})`;
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    nodes.forEach((n) => {
      const nodeAlpha = baseAlpha * (1.15 + n.glow * 0.95);
      const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size * 4);
      glow.addColorStop(0, `rgba(${hr}, ${hg}, ${hb}, ${nodeAlpha})`);
      glow.addColorStop(1, `rgba(${hr}, ${hg}, ${hb}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size * 3, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const canvasRef = useVitalityCanvas(drawRef);

  return <canvas ref={canvasRef} className="vitality-canvas" aria-hidden="true" />;
}

function VitalityReactiveCanvas() {
  const drawRef = useRef(null);

  drawRef.current = (ctx, s, { width, height }) => {
    ctx.clearRect(0, 0, width, height);

    if (s.intensity === 'off') return;

    const scale = s.intensityScale ?? 1;
    const baseHue = THEME_HUE[s.context] || THEME_HUE.dashboard;
    const now = Date.now();

    drawPulses(ctx, s, { baseHue, scale, now, width, height });
  };

  const canvasRef = useVitalityCanvas(drawRef);

  return <canvas ref={canvasRef} className="vitality-reactive-canvas" aria-hidden="true" />;
}

function VitalityBackground() {
  const { intensity, calmMode } = useVitality();

  return (
    <>
      <div
        className={`vitality-bg ${intensity === 'off' ? 'vitality-off' : ''} ${calmMode ? 'vitality-calm' : ''}`}
        aria-hidden="true"
      >
        <div className="vitality-base" />
        <VitalityAmbientCanvas />
      </div>
      {intensity !== 'off' && (
        <div className="vitality-overlay" aria-hidden="true">
          <VitalityReactiveCanvas />
          <VitalityQuoteLayer />
        </div>
      )}
    </>
  );
}

export default memo(VitalityBackground);