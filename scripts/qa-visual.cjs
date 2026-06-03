const fs = require('fs');
const path = require('path');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const { chromium } = require('playwright-core');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'qa-screenshots');
const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:5181';
const CHROME_PATHS = [
  process.env.CHROME_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
].filter(Boolean);

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1200 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 1400 },
];

const ROUTES = [
  { path: '/', name: 'home', mustContain: 'Kinetic Brews' },
  { path: '/menu', name: 'menu', mustContain: 'The Pulse Menu' },
  { path: '/gallery', name: 'gallery', mustContain: 'Photo & Video' },
  { path: '/locations', name: 'locations', mustContain: 'Find Us' },
  { path: '/about', name: 'about', mustContain: 'Brewed On Route 66' },
  { path: '/contact', name: 'contact', mustContain: 'Get in Touch' },
  { path: '/checkout', name: 'checkout', mustContain: 'Build Pickup' },
  { path: '/signin', name: 'signin', mustContain: 'Java Drip Coffee Account' },
  { path: '/profile', name: 'profile', mustContain: 'Profile Access' },
  { path: '/privacy', name: 'privacy', mustContain: 'Privacy Policy' },
  { path: '/terms', name: 'terms', mustContain: 'Terms of Service' },
  { path: '/admin/signin', name: 'admin-signin', mustContain: 'Staff Control Room' },
];

const IGNORED_CONSOLE_ERROR_PATTERNS = [
  /Failed to load resource: net::ERR_BLOCKED_BY_RESPONSE\.NotSameOrigin/i,
  /Clerk: Failed to load Clerk UI/i,
  /failed_to_load_clerk_ui/i,
  /ErrorUtils caught an error/i,
  /fburl\.com\/debugjs/i,
  /DataStore\.get: namespace is required/i,
  /Failed to load resource: the server responded with a status of 403/i,
];

function findChromeExecutable() {
  const executablePath = CHROME_PATHS.find((candidate) => fs.existsSync(candidate));
  if (!executablePath) {
    throw new Error(
      'Could not find Google Chrome. Set CHROME_EXECUTABLE_PATH to run visual QA with another Chrome-compatible browser.'
    );
  }
  return executablePath;
}

function slugify(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

async function checkServer() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(BASE_URL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${BASE_URL} returned HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Visual QA requires the frontend dev server at ${BASE_URL}. Run \`npm run dev\` first. (${error.message})`
    );
  } finally {
    clearTimeout(timer);
  }
}

async function collectLayoutIssues(page, route, viewport) {
  return page.evaluate(({ routeName, viewportName }) => {
    const doc = document.documentElement;
    const body = document.body;
    const overflowBy = Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth;
    const brokenImages = Array.from(document.images)
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.alt || image.currentSrc || image.src || 'unnamed image');
    const visibleText = (body.innerText || '').replace(/\s+/g, ' ').trim();
    const rawIconTokens = ['arrow_forward', 'chevron_left', 'chevron_right', 'play_arrow', 'gallery_thumbnail']
      .filter((token) => visibleText.includes(token));

    return {
      routeName,
      viewportName,
      title: document.title,
      overflowBy,
      brokenImages,
      rawIconTokens,
      visibleText,
    };
  }, { routeName: route.name, viewportName: viewport.name });
}

async function revealFullPage(page) {
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = page.viewportSize()?.height || 900;
  const maxScrolls = Math.ceil(pageHeight / viewportHeight);

  for (let i = 0; i <= maxScrolls; i += 1) {
    await page.evaluate((top) => window.scrollTo(0, top), i * viewportHeight * 0.85);
    await page.waitForTimeout(120);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
}

function isIgnoredConsoleError(message) {
  return IGNORED_CONSOLE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

async function run() {
  await checkServer();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const executablePath = findChromeExecutable();
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--disable-gpu', '--no-first-run'],
  });

  const failures = [];
  const results = [];

  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
      });

      for (const route of ROUTES) {
        const page = await context.newPage();
        const consoleErrors = [];
        const pageErrors = [];

        page.on('console', (message) => {
          const text = message.text();
          if (message.type() === 'error' && !isIgnoredConsoleError(text)) {
            consoleErrors.push(text);
          }
        });
        page.on('pageerror', (error) => pageErrors.push(error.message));

        const url = new URL(route.path, BASE_URL).toString();
        const screenshotName = `${viewport.name}-${slugify(route.name)}.png`;
        const screenshotPath = path.join(OUTPUT_DIR, screenshotName);

        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(1800);
          await revealFullPage(page);

          const layout = await collectLayoutIssues(page, route, viewport);
          const expectedTextFound = layout.visibleText.toLowerCase().includes(route.mustContain.toLowerCase());

          await page.screenshot({ path: screenshotPath, fullPage: true, timeout: 10000 });

          const routeFailures = [];
          if (!expectedTextFound) {
            routeFailures.push(`missing expected text "${route.mustContain}"`);
          }
          if (layout.overflowBy > 3) {
            routeFailures.push(`horizontal overflow by ${Math.round(layout.overflowBy)}px`);
          }
          if (layout.brokenImages.length > 0) {
            routeFailures.push(`broken images: ${layout.brokenImages.join(', ')}`);
          }
          if (layout.rawIconTokens.length > 0) {
            routeFailures.push(`raw icon text visible: ${layout.rawIconTokens.join(', ')}`);
          }
          if (pageErrors.length > 0) {
            routeFailures.push(`page errors: ${pageErrors.join(' | ')}`);
          }
          if (consoleErrors.length > 0) {
            routeFailures.push(`console errors: ${consoleErrors.join(' | ')}`);
          }

          results.push({
            viewport: viewport.name,
            route: route.path,
            screenshot: path.relative(ROOT_DIR, screenshotPath),
            status: routeFailures.length ? 'failed' : 'passed',
            failures: routeFailures,
          });

          if (routeFailures.length > 0) {
            failures.push(`${viewport.name} ${route.path}: ${routeFailures.join('; ')}`);
          }
        } catch (error) {
          const message = `${viewport.name} ${route.path}: ${error.message}`;
          failures.push(message);
          results.push({
            viewport: viewport.name,
            route: route.path,
            screenshot: path.relative(ROOT_DIR, screenshotPath),
            status: 'failed',
            failures: [error.message],
          });
        } finally {
          await page.close().catch(() => {});
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const reportPath = path.join(OUTPUT_DIR, 'visual-report.json');
  fs.writeFileSync(reportPath, `${JSON.stringify({ baseUrl: BASE_URL, results }, null, 2)}\n`);

  if (failures.length > 0) {
    console.error('\nVisual QA failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    console.error(`\nScreenshots and report: ${path.relative(ROOT_DIR, OUTPUT_DIR)}`);
    process.exit(1);
  }

  console.log(`Visual QA passed across ${ROUTES.length} routes and ${VIEWPORTS.length} viewport sizes.`);
  console.log(`Screenshots and report: ${path.relative(ROOT_DIR, OUTPUT_DIR)}`);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
