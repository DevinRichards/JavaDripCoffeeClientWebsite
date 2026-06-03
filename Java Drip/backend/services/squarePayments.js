const crypto = require('crypto');

const API_VERSION = process.env.SQUARE_API_VERSION || '2025-09-24';

function getSquareEnvironment() {
  return String(process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase() === 'production'
    ? 'production'
    : 'sandbox';
}

function getSquareApiBase() {
  return getSquareEnvironment() === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

function isSquareConfigured() {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

function dollarsToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function buildRedirectUrl(order) {
  const frontendUrl = String(process.env.FRONTEND_URL || 'http://localhost:5181').replace(/\/$/, '');
  return `${frontendUrl}/order/${encodeURIComponent(order.id)}?token=${encodeURIComponent(order.public_view_token || '')}`;
}

function buildLineItems(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const lineItems = items.map((item) => {
    const addonTotal = (item.addons || []).reduce((sum, addon) => (
      sum + (Number(addon.price || 0) * Number(addon.quantity || 1))
    ), 0);
    const itemPrice = Number(item.item_price || item.price || 0) + addonTotal;
    const addonNames = (item.addons || []).map((addon) => addon.name).join(', ');

    return {
      name: String(item.item_name || item.name || 'Java Drip item').slice(0, 120),
      quantity: String(Number(item.quantity) || 1),
      note: addonNames ? `Add-ons: ${addonNames}` : undefined,
      base_price_money: {
        amount: dollarsToCents(itemPrice),
        currency: 'USD',
      },
    };
  });

  if (Number(order.tax || 0) > 0) {
    lineItems.push({
      name: 'Estimated tax',
      quantity: '1',
      base_price_money: {
        amount: dollarsToCents(order.tax),
        currency: 'USD',
      },
    });
  }

  if (Number(order.fees || 0) > 0) {
    lineItems.push({
      name: 'Estimated fees',
      quantity: '1',
      base_price_money: {
        amount: dollarsToCents(order.fees),
        currency: 'USD',
      },
    });
  }

  return lineItems;
}

async function createSquarePaymentLink(order) {
  if (!isSquareConfigured()) {
    const error = new Error('Square online payments are not configured yet.');
    error.statusCode = 503;
    throw error;
  }

  const body = {
    idempotency_key: `java-drip-${order.id}`,
    description: `Java Drip Coffee pickup order ${order.id}`,
    order: {
      location_id: process.env.SQUARE_LOCATION_ID,
      reference_id: order.id,
      line_items: buildLineItems(order),
    },
    checkout_options: {
      redirect_url: buildRedirectUrl(order),
      ask_for_shipping_address: false,
    },
  };

  const response = await fetch(`${getSquareApiBase()}/v2/online-checkout/payment-links`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Square-Version': API_VERSION,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload.errors?.map((entry) => entry.detail || entry.code).filter(Boolean).join(' ') || 'Square checkout request failed.';
    const error = new Error(detail);
    error.statusCode = response.status;
    error.squarePayload = payload;
    throw error;
  }

  return {
    paymentLinkId: payload.payment_link?.id || null,
    paymentUrl: payload.payment_link?.url || null,
    squareOrderId: payload.payment_link?.order_id || payload.related_resources?.orders?.[0]?.id || null,
    raw: payload,
  };
}

function verifySquareWebhookSignature(rawBody, signature) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;

  if (!signatureKey || !notificationUrl) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', signatureKey);
  hmac.update(`${notificationUrl}${rawBody}`);
  const expected = hmac.digest('base64');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
  } catch {
    return false;
  }
}

module.exports = {
  createSquarePaymentLink,
  getSquareEnvironment,
  isSquareConfigured,
  verifySquareWebhookSignature,
};
