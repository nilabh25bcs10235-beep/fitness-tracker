export const THEME_HUE = {
  dashboard: [34, 211, 238],
  meals: [45, 212, 191],
  workouts: [56, 189, 248],
  recipes: [52, 211, 153],
  ai: [99, 102, 241],
};

export const WARM_HUE = [251, 146, 60];

export function lerpHue(base, warm, t) {
  return [
    Math.round(base[0] + (warm[0] - base[0]) * t),
    Math.round(base[1] + (warm[1] - base[1]) * t),
    Math.round(base[2] + (warm[2] - base[2]) * t),
  ];
}

const RIPPLE_DURATION = 2600;

/** Subtle screen-wide ripples — typing only. */
export function drawPulses(ctx, s, { baseHue, scale, now, width, height }) {
  const maxRadius = Math.hypot(width, height) * 0.92;
  const originX = width * 0.5;
  const originY = height * 0.5;
  let screenWash = 0;
  let washRgb = baseHue;

  (s.pulses || []).forEach((p) => {
    const age = (now - p.t) / RIPPLE_DURATION;
    if (age >= 1) return;

    const eased = 1 - (1 - age) ** 2.2;
    const radius = 12 + eased * maxRadius;
    const [pr, pg, pb] = p.warm ? WARM_HUE : baseHue;

    const fadeIn = Math.min(1, age * 6);
    const fadeOut = 1 - age;
    const alpha = fadeIn * fadeOut * 0.072 * scale * Math.min(1, p.strength);

    if (alpha < 0.003) return;

    const grad = ctx.createRadialGradient(p.x, p.y, radius * 0.78, p.x, p.y, radius);
    grad.addColorStop(0, 'rgba(3, 7, 18, 0)');
    grad.addColorStop(0.88, `rgba(${pr}, ${pg}, ${pb}, ${alpha * 0.4})`);
    grad.addColorStop(0.96, `rgba(${pr}, ${pg}, ${pb}, ${alpha})`);
    grad.addColorStop(1, 'rgba(3, 7, 18, 0)');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 0.45 + (1 - eased) * 0.25;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    const washAlpha = alpha * 0.42 * (1 - eased * 0.55);
    if (washAlpha > screenWash) {
      screenWash = washAlpha;
      washRgb = [pr, pg, pb];
    }
  });

  if (screenWash > 0.002) {
    const [wr, wg, wb] = washRgb;
    const wash = ctx.createRadialGradient(originX, originY, 0, originX, originY, maxRadius);
    wash.addColorStop(0, `rgba(${wr}, ${wg}, ${wb}, ${screenWash})`);
    wash.addColorStop(1, 'rgba(3, 7, 18, 0)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);
  }
}