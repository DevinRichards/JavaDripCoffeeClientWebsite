const fs = require('fs');
const { chromium } = require('playwright-core');

const API_BASE = 'http://127.0.0.1:3201/api';
const APP_BASE = process.env.QA_BASE_URL || 'http://localhost:5181';
const CHROME_PATHS = [
  process.env.CHROME_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
].filter(Boolean);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function findChromeExecutable() {
  const executablePath = CHROME_PATHS.find((candidate) => fs.existsSync(candidate));
  if (!executablePath) {
    throw new Error('Could not find Google Chrome. Set CHROME_EXECUTABLE_PATH to run notification QA.');
  }
  return executablePath;
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  return { response, body };
}

function parseClockTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return (hours * 60) + minutes;
}

function formatMinutesAsLabel(totalMinutes) {
  const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  let hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const meridiem = hours >= 12 ? 'PM' : 'AM';

  hours %= 12;
  if (hours === 0) hours = 12;

  return `${hours}:${String(minutes).padStart(2, '0')} ${meridiem}`;
}

function getValidPickupTime(location, now = new Date()) {
  const day = now.getDay();
  const hoursText = day === 0
    ? (location.hours_sunday || location.hours_weekend)
    : day === 6
      ? (location.hours_saturday || location.hours_weekend)
      : location.hours_weekday;
  const matches = String(hoursText || '').match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];

  if (matches.length < 2) return 'ASAP';

  const openMinutes = parseClockTime(matches[0]);
  const closeMinutes = parseClockTime(matches[1]);
  const currentMinutes = (now.getHours() * 60) + now.getMinutes();

  if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
    return 'ASAP';
  }

  const earliestLaterMinutes = Math.ceil((currentMinutes + 15) / 15) * 15;
  const pickupMinutes = Math.max(openMinutes, earliestLaterMinutes);

  if (pickupMinutes > closeMinutes) {
    throw new Error('No valid pickup slots remain today for notification QA.');
  }

  return formatMinutesAsLabel(pickupMinutes);
}

async function main() {
  const login = await request(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'staff@javadrip.coffee',
      password: 'JavaDripAdmin!2026',
    }),
  });

  assert(login.response.ok, `Admin login failed: ${JSON.stringify(login.body)}`);
  const token = login.body?.data?.token;
  const adminUser = login.body?.data?.user;
  assert(token && adminUser, 'Admin login did not return token and user.');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const existingOrders = await request(`${API_BASE}/admin/orders`, { headers: authHeaders });
  assert(existingOrders.response.ok, `Admin order fetch failed: ${JSON.stringify(existingOrders.body)}`);
  const existingActionableIds = existingOrders.body.data
    .filter((order) => ['pending_confirmation', 'pending_payment'].includes(order.status))
    .map((order) => order.id);

  const browser = await chromium.launch({
    headless: true,
    executablePath: findChromeExecutable(),
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

  await page.addInitScript(({ storedToken, storedUser, seenIds }) => {
    window.localStorage.setItem('jd_admin_token', storedToken);
    window.localStorage.setItem('jd_admin_user', JSON.stringify(storedUser));
    window.localStorage.setItem('jd_admin_seen_order_ids', JSON.stringify(seenIds));
  }, {
    storedToken: token,
    storedUser: adminUser,
    seenIds: existingActionableIds,
  });

  await page.goto(`${APP_BASE}/admin/orders`, { waitUntil: 'networkidle' });
  await page.getByText('Incoming Orders').waitFor({ timeout: 10000 });

  const locations = await request(`${API_BASE}/locations`);
  assert(locations.response.ok, `Location lookup failed: ${JSON.stringify(locations.body)}`);
  const openLocation = locations.body.data.find((location) => location.status === 'open') || locations.body.data[0];
  assert(openLocation, 'No pickup location available for notification QA.');

  const menu = await request(`${API_BASE}/menu`);
  assert(menu.response.ok, `Menu lookup failed: ${JSON.stringify(menu.body)}`);
  const orderableItem = menu.body.data
    .filter((category) => !['add-ons', 'milk-options'].includes(category.id))
    .flatMap((category) => category.items || [])
    .find((item) => item.active);
  assert(orderableItem, 'No active menu item available for notification QA.');

  const order = await request(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_name: 'Notification QA Guest',
      customer_email: `notification-qa-${Date.now()}@example.com`,
      customer_phone: '5055550199',
      order_type: 'pickup',
      pickup_time: getValidPickupTime(openLocation),
      location_id: openLocation.id,
      payment_method: 'online',
      items: [{ id: orderableItem.id, quantity: 1, addons: [] }],
      notes: 'Temporary QA order used to validate admin notifications.',
    }),
  });

  assert(order.response.ok, `Order creation failed: ${JSON.stringify(order.body)}`);
  const createdOrderId = order.body.data.id;

  await page.getByText('New Pickup Alert').waitFor({ timeout: 22000 });
  const alertText = await page.locator('body').innerText();
  assert(alertText.includes(createdOrderId), `Notification banner did not include ${createdOrderId}.`);

  await browser.close();

  console.log(JSON.stringify({
    success: true,
    createdOrderId,
    check: 'admin_new_order_notification_banner',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
