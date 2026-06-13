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

/** Reactive strength — typing only (no persistent focus halo). */
export function vitalityEnergy(s) {
  return Math.min(1, (s.typingEnergy || 0) + (s.numericTyping ? 0.08 : 0));
}

/** Ambient flow toward focused field — subtle idle pull, stronger while typing. */
export function focusFlowStrength(s) {
  if (!s.focusPoint) return 0;
  return Math.min(1, 0.1 + (s.typingEnergy || 0) * 0.9);
}

export function drawPulses(ctx, s, { baseHue, scale, now }) {
  (s.pulses || []).forEach((p) => {
    const age = (now - p.t) / (p.warm ? 1100 : 850);
    if (age >= 1) return;
    const pr = p.warm ? WARM_HUE : baseHue;
    const rings = p.strength > 0.7 ? 2 : 1;
    for (let r = 0; r < rings; r += 1) {
      const ringAge = Math.min(1, age + r * 0.12);
      const radius = 6 + ringAge * (p.strength > 0.7 ? 95 : 72);
      const alpha = (1 - ringAge) * 0.62 * scale * p.strength;
      ctx.strokeStyle = `rgba(${pr[0]}, ${pr[1]}, ${pr[2]}, ${alpha})`;
      ctx.lineWidth = 1.4 + (1 - ringAge) * 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

export function drawSuccessWave(ctx, s, { scale, width, height, now }) {
  if (!s.successWave || now - s.successWave >= 1800) return;
  const age = (now - s.successWave) / 1800;
  const rect = s.successRect;

  if (rect) {
    const waveY = rect.bottom - (rect.bottom - rect.top) * age;
    const waveGrad = ctx.createLinearGradient(rect.left, waveY - 30, rect.left, waveY + 30);
    waveGrad.addColorStop(0, 'rgba(34, 211, 238, 0)');
    waveGrad.addColorStop(0.5, `rgba(52, 211, 153, ${(1 - age) * 0.55 * scale})`);
    waveGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = waveGrad;
    ctx.fillRect(rect.left - 8, waveY - 40, rect.width + 16, 80);
  } else {
    const y = height * (1 - age * 0.85);
    const waveGrad = ctx.createLinearGradient(0, y - 40, 0, y + 40);
    waveGrad.addColorStop(0, 'rgba(34, 211, 238, 0)');
    waveGrad.addColorStop(0.5, `rgba(34, 211, 238, ${(1 - age) * 0.38 * scale})`);
    waveGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = waveGrad;
    ctx.fillRect(0, y - 50, width, 100);
  }
}