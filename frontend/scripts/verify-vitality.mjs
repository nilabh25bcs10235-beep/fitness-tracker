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

async function canvasEnergy(page, selector = '.vitality-canvas') {
  return page.evaluate((sel) => {
    const canvas = document.querySelector(sel);
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    if (!width || !height) return 0;
    const data = ctx.getImageData(0, 0, width, height).data;
    let bright = 0;
    for (let i = 0; i < data.length; i += 16) {
      const a = data[i + 3];
      if (a > 8 && (data[i] + data[i + 1] + data[i + 2]) > 30) bright += 1;
    }
    return bright;
  }, selector);
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

  if (quotes.length < 2) fail(`Layer 2: expected ambient quote slots, found ${quotes.length}`);
  else pass(`Layer 2: ${quotes.length} quote elements present`);

  await page.waitForTimeout(4000);
  const visibleQuotes = await page.$$('.vitality-quote.ambient.visible');
  if (visibleQuotes.length < 1) fail('Layer 2: no ambient quote became visible in cycle');
  else pass(`Layer 2: ${visibleQuotes.length} ambient quote(s) visible`);

  await page.click('button.tab-workouts');
  await page.waitForTimeout(800);

  const workoutInput = await page.$('.reactive-input');
  if (!workoutInput) fail('Layer 3: no reactive input on Workouts tab');
  else {
    const energyIdle = await canvasEnergy(page, '.vitality-reactive-canvas');
    await workoutInput.click();
    await page.waitForTimeout(500);
    const energyFocus = await canvasEnergy(page, '.vitality-reactive-canvas');
    if (energyFocus < 8) {
      fail(`Layer 3: focus did not draw on reactive canvas (${energyIdle} -> ${energyFocus})`);
    } else {
      pass(`Layer 3: focus reactive overlay active (${energyIdle} -> ${energyFocus})`);
    }

    await workoutInput.type('heavy PR 225', { delay: 40 });
    await page.waitForTimeout(600);
    const energyType = await canvasEnergy(page, '.vitality-reactive-canvas');
    if (energyType <= energyFocus) {
      fail(`Layer 3: typing did not increase reactive energy (${energyFocus} -> ${energyType})`);
    } else {
      pass(`Layer 3: typing pulses detected (${energyFocus} -> ${energyType})`);
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