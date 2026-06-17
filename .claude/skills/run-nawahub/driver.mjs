// NawaHub browser driver — logs into the running dev app and drives it with
// puppeteer (which ships its own Chromium; there is no system Chrome here).
//
// puppeteer lives in backend/node_modules, so we resolve it via a require()
// rooted at the backend package rather than relative to this file.
//
// Prereqs (must already be running — see SKILL.md):
//   - frontend dev server on http://localhost:5173
//   - backend  dev server on http://localhost:3000  (talking to a seeded DB)
//
// Usage (Windows/Git Bash note: pass route WITHOUT leading slash to avoid shell
// path expansion; the driver prepends / automatically):
//   node .claude/skills/run-nawahub/driver.mjs                 # login -> dashboard, screenshot
//   node .claude/skills/run-nawahub/driver.mjs invoices        # login, go to /invoices, screenshot
//   node .claude/skills/run-nawahub/driver.mjs deals deals     # path + screenshot basename
//   BASE=http://localhost:5173 EMAIL=... PASSWORD=... node ...  # overrides
//
// Exit code is non-zero on any failure (login never completed, route errored,
// console/page error), so it doubles as a smoke test.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(here, '../../../backend');
const requireFromBackend = createRequire(join(backendDir, 'package.json'));
const puppeteer = requireFromBackend('puppeteer');

const BASE = process.env.BASE || 'http://localhost:5173';
const EMAIL = process.env.EMAIL || 'admin@nawahub.com';
const PASSWORD = process.env.PASSWORD || 'Nawa@123';

// Accept "invoices" or "/invoices" — Git Bash expands /foo to a Windows path,
// so callers on Windows should omit the leading slash.
const rawRoute = process.argv[2] || '';
const routeArg = rawRoute ? ('/' + rawRoute.replace(/^\/+/, '')) : '/';
const shotName = (process.argv[3] || rawRoute.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'dashboard');
const shotPath = join(here, 'screenshots', `${shotName}.png`);

const log = (...a) => console.log('[driver]', ...a);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  log('opening', BASE);
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });

  // If we land on the login page, sign in.
  const onLogin = await page.$('#email');
  if (onLogin) {
    log('login form detected — signing in as', EMAIL);
    await page.type('#email', EMAIL, { delay: 10 });
    await page.type('#password', PASSWORD, { delay: 10 });
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
    ]);
    // SPA may not hard-navigate; wait for the login form to disappear instead.
    await page.waitForFunction(() => !document.querySelector('#email'), { timeout: 30000 });
    log('signed in');
  } else {
    log('no login form — already authenticated or different landing');
  }

  // Navigate to the requested route (client-side).
  if (routeArg !== '/') {
    const target = BASE.replace(/\/$/, '') + routeArg;
    log('navigating to', target);
    await page.goto(target, { waitUntil: 'networkidle2', timeout: 30000 });
  }

  // Give React Query a beat to paint data.
  await new Promise((r) => setTimeout(r, 1500));

  await page.screenshot({ path: shotPath, fullPage: false });
  const title = await page.title();
  const url = page.url();
  log('title:', JSON.stringify(title));
  log('url:', url);
  log('screenshot:', shotPath);

  if (pageErrors.length) {
    log('PAGE ERRORS:', pageErrors.length);
    pageErrors.slice(0, 5).forEach((e) => log('  -', e));
    process.exitCode = 1;
  }
} catch (err) {
  console.error('[driver] FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
