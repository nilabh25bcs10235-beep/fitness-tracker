/**
 * Verifies all three vitality layers in the running Vite dev server.
 * Usage: node scripts/verify-vitality.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:5173';
const failures = [];

function fail(msg) {
  failures.push(msg);
  console.error(`FAIL: ${msg}`);
}

function pass(msg) {
  console.log(`PASS: ${msg}`);
}

async function canvasEnergy(page, selector = '.vitality-canvas', { minAlpha = 8, minRgb = 30 } = {}) {
  return page.evaluate(({ sel, minAlpha, minRgb }) => {
    const canvas = document.querySelector(sel);
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    if (!width || !height) return 0;
    const data = ctx.getImageData(0, 0, width, height).data;
    let bright = 0;
    for (let i = 0; i < data.length; i += 12) {
      const a = data[i + 3];
      if (a > minAlpha && (data[i] + data[i + 1] + data[i + 2]) > minRgb) bright += 1;
    }
    return bright;
  }, { sel: selector, minAlpha, minRgb });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.addInitScript(() => {
    localStorage.setItem('fittrack-vitality-intensity', 'medium');
    localStorage.setItem('fittrack-screen-brightness', 'normal');
  });

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  const layer1 = await page.$('.vitality-bg');
  const canvas = await page.$('.vitality-canvas');
  const overlay = await page.$('.vitality-overlay');
  const quotes = await page.$$('.vitality-quote');

  if (!layer1) fail('Layer 1: .vitality-bg missing');
  else pass('Layer 1: vitality background mounted');

  if (!canvas) fail('Layer 1: canvas missing');
  else {
    const box = await canvas.boundingBox();
    if (!box?.width || !box?.height) fail('Layer 1: canvas has zero size');
    else pass(`Layer 1: canvas ${Math.round(box.width)}x${Math.round(box.height)}`);
  }

  const energyBefore = await canvasEnergy(page, '.vitality-canvas');
  if (energyBefore < 20) fail(`Layer 1: canvas appears empty (energy=${energyBefore})`);
  else pass(`Layer 1: canvas drawing energy nodes (score=${energyBefore})`);

  const reactiveCanvas = await page.$('.vitality-reactive-canvas');
  if (!reactiveCanvas) fail('Layer 3: reactive overlay canvas missing');
  else pass('Layer 3: reactive overlay canvas mounted');

  if (!overlay) fail('Layer 2: .vitality-overlay missing (quotes hidden behind UI?)');
  else {
    const z = await overlay.evaluate((el) => getComputedStyle(el).zIndex);
    if (Number(z) < 2) fail(`Layer 2: overlay z-index too low (${z})`);
    else pass(`Layer 2: quote overlay above app (z-index ${z})`);
  }

  await page.waitForTimeout(3200);
  const contextualQuote = await page.$('.vitality-quote.contextual.visible');
  if (!contextualQuote) fail('Layer 2: contextual quote did not appear on section load');
  else {
    const opacity = await contextualQuote.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
    if (opacity < 0.2) fail(`Layer 2: contextual quote opacity too low (${opacity})`);
    else pass(`Layer 2: contextual quote visible on load (opacity ${opacity.toFixed(2)})`);
  }

  await page.click('button.tab-meals');
  await page.waitForTimeout(3200);
  const mealsQuote = await page.$('.vitality-quote.contextual.visible');
  if (!mealsQuote) fail('Layer 2: contextual quote did not appear on tab switch');
  else pass('Layer 2: contextual quote appears on section change');

  await page.click('button.tab-workouts');
  await page.waitForTimeout(800);

  const workoutInput = await page.$('.reactive-input');
  if (!workoutInput) fail('Layer 3: no reactive input on Workouts tab');
  else {
    await workoutInput.click();
    await page.waitForTimeout(400);
    const energyFocusOnly = await canvasEnergy(page, '.vitality-reactive-canvas', { minAlpha: 1, minRgb: 1 });
    if (energyFocusOnly > 1200) {
      fail(`Layer 3: persistent focus halo on reactive canvas (${energyFocusOnly})`);
    } else {
      pass(`Layer 3: no sunray/halo on focus alone (${energyFocusOnly})`);
    }

    await workoutInput.type('heavy PR 225', { delay: 35 });
    await page.waitForTimeout(900);
    const energyType = await canvasEnergy(page, '.vitality-reactive-canvas', { minAlpha: 1, minRgb: 1 });
    if (energyType <= energyFocusOnly + 1) {
      fail(`Layer 3: typing did not increase reactive energy (${energyFocusOnly} -> ${energyType})`);
    } else {
      pass(`Layer 3: subtle typing ripples detected (${energyFocusOnly} -> ${energyType})`);
    }

    const focusQuote = await page.$('.vitality-quote.focus.visible');
    if (!focusQuote) fail('Layer 2/3: focus quote not visible while typing');
    else pass('Layer 2/3: focus quote visible near input');
  }

  await browser.close();

  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll vitality layer checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});