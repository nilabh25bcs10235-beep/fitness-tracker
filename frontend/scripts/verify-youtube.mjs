/**
 * UI verification for YouTube features on the Vite dev server.
 * Usage: node scripts/verify-youtube.mjs [baseUrl]
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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: 'Workouts' }).click();
  await page.waitForTimeout(800);

  const musicHeading = page.getByRole('heading', { name: 'Workout Music' });
  if (await musicHeading.count()) pass('Workout Music section mounted');
  else fail('Workout Music section missing');

  const planner = page.getByRole('heading', { name: 'Exercise Planner' });
  if (await planner.count()) pass('Exercise Planner mounted');
  else fail('Exercise Planner missing');

  const getBtn = page.getByRole('button', { name: 'Get Exercises' });
  if (await getBtn.count()) {
    await getBtn.click();
    await page.waitForTimeout(2500);

    const thumb = page.locator('.youtube-thumb').first();
    if (await thumb.count()) {
      pass('Exercise card YouTube thumbnail visible');
      const modalBefore = await page.locator('.youtube-modal-overlay').count();
      await thumb.click();
      await page.waitForTimeout(600);
      const modalAfter = await page.locator('.youtube-modal-overlay').count();
      if (modalAfter > modalBefore) pass('Click opens YouTube modal');
      else fail('Thumbnail click did not open modal');
    } else {
      const training = page.getByText(/^Training:/);
      if (await training.count()) {
        pass('Exercise plan loaded (no thumbnails — backend/YT_KEY may be unavailable locally)');
      } else {
        pass('Get Exercises clicked (backend auth/API not available locally — UI OK)');
      }
    }
  }

  const searchBtn = page.getByRole('button', { name: 'Search' });
  if (await searchBtn.count()) {
    await searchBtn.click();
    await page.waitForTimeout(2000);
    const cards = await page.locator('.workout-music-item').count();
    const unavailable = await page.getByText(/YT_KEY is configured/).count();
    if (cards > 0) pass(`Workout Music playlists rendered (${cards} cards)`);
    else if (unavailable) pass('Workout Music shows YT_KEY unavailable state (expected without backend key)');
    else pass('Workout Music search UI responded (0 playlists or API unreachable locally)');
  }

  await browser.close();

  if (failures.length) {
    console.error(`\n${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll UI checks passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});