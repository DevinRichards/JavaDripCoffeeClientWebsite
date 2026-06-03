const http = require('http');
const https = require('https');

const DEFAULT_BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:3201';

function joinUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

async function requestJson(baseUrl, path, options = {}) {
  const url = new URL(joinUrl(baseUrl, path));
  const client = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        text += chunk;
      });
      res.on('end', () => {
        let body = null;
        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = text;
        }

        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function findOrderCandidate(menu) {
  const visibleCategory = menu.find((category) => !['add-ons', 'milk-options'].includes(category.id) && category.items?.length);
  const addonCategory = menu.find((category) => category.id === 'add-ons' && category.items?.length);

  if (!visibleCategory?.items?.length) {
    throw new Error('Could not find a sellable menu item for the smoke order.');
  }

  const item = visibleCategory.items[0];
  const addon = addonCategory?.items?.[0];

  return {
    item,
    addon,
  };
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

function roundUpToInterval(totalMinutes, interval) {
  return Math.ceil(totalMinutes / interval) * interval;
}

function getValidSmokePickupTime(location) {
  const isWeekend = [0, 6].includes(new Date().getDay());
  const hoursText = isWeekend ? location?.hours_weekend : location?.hours_weekday;
  const matches = String(hoursText || '').match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];

  if (matches.length < 2) return 'ASAP';

  const openMinutes = parseClockTime(matches[0]);
  const closeMinutes = parseClockTime(matches[1]);
  if (openMinutes == null || closeMinutes == null) return 'ASAP';

  const now = new Date();
  const currentMinutes = (now.getHours() * 60) + now.getMinutes();

  if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
    return 'ASAP';
  }

  const earliestLaterMinutes = roundUpToInterval(currentMinutes + 15, 15);
  const nextValidMinutes = Math.max(openMinutes, earliestLaterMinutes);

  if (nextValidMinutes <= closeMinutes) {
    return formatMinutesAsLabel(nextValidMinutes);
  }

  return formatMinutesAsLabel(openMinutes);
}

async function main() {
  const baseUrl = DEFAULT_BASE_URL;
  const warnings = [];
  const checks = [];

  const health = await requestJson(baseUrl, '/api/health');
  assert(health.ok, `Health check failed with status ${health.status}`);
  assert(health.body?.status === 'ok', 'Health endpoint did not return ok status');
  checks.push('health');

  const menu = await requestJson(baseUrl, '/api/menu');
  assert(menu.ok, `Menu request failed with status ${menu.status}`);
  assert(Array.isArray(menu.body?.data) && menu.body.data.length > 0, 'Menu endpoint returned no categories');
  checks.push('menu');

  const locations = await requestJson(baseUrl, '/api/locations');
  assert(locations.ok, `Locations request failed with status ${locations.status}`);
  assert(Array.isArray(locations.body?.data) && locations.body.data.length > 0, 'Locations endpoint returned no locations');
  checks.push('locations');

  const adminStatus = await requestJson(baseUrl, '/api/admin/status');
  assert(adminStatus.ok, `Admin status request failed with status ${adminStatus.status}`);
  checks.push('admin-status');

  if (!adminStatus.body?.data?.sessionConfigured) {
    warnings.push('Admin session auth is not configured yet (set ADMIN_SESSION_SECRET).');
  }
  if (!adminStatus.body?.data?.bootstrapConfigured) {
    warnings.push('No bootstrap staff account is configured yet (set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD).');
  }
  const contactValidation = await requestJson(baseUrl, '/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert(contactValidation.status === 400, `Contact validation expected 400, received ${contactValidation.status}`);
  checks.push('contact-validation');

  const { item, addon } = findOrderCandidate(menu.body.data);
  const primaryLocation = locations.body.data.find((location) => location.status === 'open') || locations.body.data[0];

  const smokeOrderPayload = {
    customer_name: 'Smoke Test Customer',
    customer_email: `smoke+${Date.now()}@javadrip.coffee`,
    customer_phone: '505-000-0000',
    order_type: 'pickup',
    payment_method: 'online',
    pickup_time: getValidSmokePickupTime(primaryLocation),
    location_id: primaryLocation?.id,
    notes: '[SMOKE TEST] Created by qa-smoke.cjs',
    items: [
      {
        id: item.id,
        quantity: 1,
        addons: addon
          ? [{ id: addon.id, quantity: 1 }]
          : [],
      },
    ],
  };

  const createOrder = await requestJson(baseUrl, '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(smokeOrderPayload),
  });
  assert(createOrder.status === 201, `Order creation expected 201, received ${createOrder.status}`);
  assert(createOrder.body?.data?.id, 'Order creation did not return an order id');
  assert(createOrder.body?.data?.public_view_token, 'Order creation did not return a public view token');
  assert(createOrder.body?.data?.status === 'pending_payment', 'Smoke order was not created in pending_payment state');
  assert(Number(createOrder.body?.data?.total) > 0, 'Smoke order total was not greater than zero');
  checks.push('order-create');

  const orderId = createOrder.body.data.id;
  const fetchOrder = await requestJson(
    baseUrl,
    `/api/orders/${orderId}?token=${encodeURIComponent(createOrder.body.data.public_view_token)}`
  );
  assert(fetchOrder.ok, `Fetching smoke order failed with status ${fetchOrder.status}`);
  assert(fetchOrder.body?.data?.id === orderId, 'Fetched smoke order id did not match created order');
  assert(Array.isArray(fetchOrder.body?.data?.items) && fetchOrder.body.data.items.length > 0, 'Fetched smoke order had no line items');
  checks.push('order-fetch');

  process.stdout.write(`Smoke checks passed: ${checks.join(', ')}\n`);
  process.stdout.write(`Smoke order created: ${orderId}\n`);

  if (warnings.length) {
    process.stdout.write(`Warnings:\n- ${warnings.join('\n- ')}\n`);
  }
}

main().catch((error) => {
  console.error(`Smoke test failed: ${error.message}`);
  process.exit(1);
});
