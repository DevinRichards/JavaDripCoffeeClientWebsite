const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getAuth } = require('@clerk/express');
const { getDb } = require('../db/database');
const { sendPickupOrderReceivedEmail } = require('../services/orderEmail');
const { createRateLimiter } = require('../middleware/security');
const { cleanText, isValidEmail } = require('../services/validation');

const router = express.Router();
const orderCreationLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 12,
  message: 'Too many pickup orders were submitted from this connection. Please wait a few minutes before trying again.',
});

const GRT_RATE = 0.084375;
const ESTIMATED_FEES = 0;
const VALID_ORDER_TYPES = new Set(['pickup']);
const VALID_PAYMENT_METHODS = new Set(['online']);
const ADDON_CATEGORY_NAMES = new Set(['add ons', 'milk options']);
const PICKUP_SLOT_INTERVAL_MINUTES = 15;

function formatMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function getOptionalClerkUserId(req) {
  if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) {
    return null;
  }

  try {
    return getAuth(req)?.userId || null;
  } catch {
    return null;
  }
}

function parseOrderItems(orderId, rows) {
  return rows.map((row) => ({
    ...row,
    addons: row.addons_json ? JSON.parse(row.addons_json) : [],
  }));
}

function buildOrderPayload(db, order) {
  const items = parseOrderItems(
    order.id,
    db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(order.id)
  );

  return {
    ...order,
    items,
  };
}

function generatePublicViewToken() {
  return crypto.randomBytes(24).toString('hex');
}

function isAuthorizedForOrder(req, order) {
  const providedToken = String(req.query.token || '').trim();
  if (providedToken && providedToken === order.public_view_token) {
    return true;
  }

  const signedInCustomerId = getOptionalClerkUserId(req);
  return Boolean(signedInCustomerId && order.customer_clerk_id && signedInCustomerId === order.customer_clerk_id);
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

function getLocationHoursForToday(location, now = new Date()) {
  if (!location) return null;

  const day = now.getDay();
  const hoursText = day === 0
    ? (location.hours_sunday || location.hours_weekend)
    : day === 6
      ? (location.hours_saturday || location.hours_weekend)
      : location.hours_weekday;
  const matches = String(hoursText || '').match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];

  if (matches.length < 2) return null;

  const openMinutes = parseClockTime(matches[0]);
  const closeMinutes = parseClockTime(matches[1]);

  if (openMinutes == null || closeMinutes == null) return null;

  return {
    openMinutes,
    closeMinutes,
  };
}

function roundUpToInterval(totalMinutes, interval) {
  return Math.ceil(totalMinutes / interval) * interval;
}

function getCurrentMinutes(now = new Date()) {
  return (now.getHours() * 60) + now.getMinutes();
}

function isValidPickupTime(pickupTime, location) {
  const normalizedPickupTime = String(pickupTime || '').trim();
  if (!normalizedPickupTime) {
    return {
      valid: false,
      message: 'Please choose a pickup time.',
    };
  }

  const hours = getLocationHoursForToday(location);
  if (!hours) {
    return { valid: true };
  }

  const now = new Date();
  const currentMinutes = getCurrentMinutes(now);

  if (normalizedPickupTime.toUpperCase() === 'ASAP') {
    if (currentMinutes < hours.openMinutes || currentMinutes > hours.closeMinutes) {
      return {
        valid: false,
        message: 'Pickup ASAP is only available during current store hours.',
      };
    }

    return { valid: true };
  }

  const selectedMinutes = parseClockTime(normalizedPickupTime);
  if (selectedMinutes == null) {
    return {
      valid: false,
      message: 'Please choose a valid pickup time from the available list.',
    };
  }

  const earliestLaterMinutes = roundUpToInterval(currentMinutes + PICKUP_SLOT_INTERVAL_MINUTES, PICKUP_SLOT_INTERVAL_MINUTES);
  const firstSlotMinutes = Math.max(hours.openMinutes, earliestLaterMinutes);

  if (selectedMinutes < firstSlotMinutes || selectedMinutes > hours.closeMinutes) {
    return {
      valid: false,
      message: 'That pickup time is no longer available. Please choose a new time.',
    };
  }

  if (selectedMinutes % PICKUP_SLOT_INTERVAL_MINUTES !== 0) {
    return {
      valid: false,
      message: 'Pickup later times must be selected in 15-minute increments.',
    };
  }

  return { valid: true };
}

function normalizeAddons(rawAddons, getMenuItem) {
  if (!Array.isArray(rawAddons) || rawAddons.length === 0) {
    return [];
  }

  return rawAddons.map((addon) => {
    const addonId = Number(addon.id);
    const quantity = Number.isInteger(Number(addon.quantity)) ? Number(addon.quantity) : 1;

    if (!Number.isInteger(addonId) || addonId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Each add-on must include a valid item id and quantity');
    }

    const menuAddon = getMenuItem.get(addonId);
    if (!menuAddon || !menuAddon.active) {
      throw new Error('One or more selected add-ons are unavailable');
    }

    if (!ADDON_CATEGORY_NAMES.has(String(menuAddon.category_name || '').toLowerCase())) {
      throw new Error(`${menuAddon.name} is not available as an add-on`);
    }

    return {
      id: menuAddon.id,
      name: menuAddon.name,
      price: Number(menuAddon.price),
      quantity,
    };
  });
}

function normalizeOrderItems(items, getMenuItem) {
  return items.map((item) => {
    const quantity = Number(item.quantity);
    const itemId = Number(item.id);

    if (!Number.isInteger(itemId) || itemId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Each order item must include a valid item id and quantity');
    }

    const menuItem = getMenuItem.get(itemId);
    if (!menuItem || !menuItem.active) {
      throw new Error('One or more selected items are unavailable');
    }

    if (ADDON_CATEGORY_NAMES.has(String(menuItem.category_name || '').toLowerCase())) {
      throw new Error(`${menuItem.name} must be added through the add-on picker`);
    }

    const addons = normalizeAddons(item.addons, getMenuItem);
    const addonsPerItem = addons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);
    const lineTotal = formatMoney((Number(menuItem.price) + addonsPerItem) * quantity);

    return {
      id: menuItem.id,
      name: menuItem.name,
      price: Number(menuItem.price),
      quantity,
      addons,
      line_total: lineTotal,
    };
  });
}

router.post('/', orderCreationLimiter, async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      order_type = 'pickup',
      pickup_time,
      location_id,
      items,
      notes,
      payment_method = 'online',
    } = req.body;

    const normalizedName = cleanText(customer_name);
    const normalizedEmail = cleanText(customer_email).toLowerCase();
    const normalizedPhone = cleanText(customer_phone);
    const normalizedPickupTime = cleanText(pickup_time);
    const normalizedNotes = cleanText(notes);

    if (!normalizedName || !normalizedEmail || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customer_name, customer_email, items',
      });
    }

    if (normalizedName.length > 120) {
      return res.status(400).json({ success: false, message: 'Customer name must be 120 characters or fewer.' });
    }

    if (!isValidEmail(normalizedEmail) || normalizedEmail.length > 160) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (normalizedPhone && normalizedPhone.length > 40) {
      return res.status(400).json({ success: false, message: 'Phone number must be 40 characters or fewer.' });
    }

    if (normalizedPickupTime && normalizedPickupTime.length > 80) {
      return res.status(400).json({ success: false, message: 'Pickup time must be 80 characters or fewer.' });
    }

    if (normalizedNotes && normalizedNotes.length > 500) {
      return res.status(400).json({ success: false, message: 'Special instructions must be 500 characters or fewer.' });
    }

    if (!VALID_ORDER_TYPES.has(order_type)) {
      return res.status(400).json({
        success: false,
        message: 'Only pickup orders are supported through the website checkout flow',
      });
    }

    if (!VALID_PAYMENT_METHODS.has(payment_method)) {
      return res.status(400).json({
        success: false,
        message: 'Online payment is required for pickup orders.',
      });
    }

    const db = getDb();
    const customerClerkId = getOptionalClerkUserId(req);
    const location = location_id
      ? db.prepare('SELECT id, status, hours_weekday, hours_weekend, hours_saturday, hours_sunday FROM locations WHERE id = ?').get(location_id)
      : db.prepare("SELECT id, status, hours_weekday, hours_weekend, hours_saturday, hours_sunday FROM locations WHERE status = 'open' ORDER BY id LIMIT 1").get();

    if (!location || location.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Please choose an available pickup location',
      });
    }

    const pickupTimeValidation = isValidPickupTime(normalizedPickupTime, location);
    if (!pickupTimeValidation.valid) {
      return res.status(400).json({
        success: false,
        message: pickupTimeValidation.message,
      });
    }

    const getMenuItem = db.prepare(`
      SELECT menu_items.id, menu_items.name, menu_items.price, menu_items.active, menu_items.category_id, menu_categories.name AS category_name
      FROM menu_items
      LEFT JOIN menu_categories ON menu_categories.id = menu_items.category_id
      WHERE menu_items.id = ?
    `);

    const normalizedItems = normalizeOrderItems(items, getMenuItem);
    const subtotal = formatMoney(normalizedItems.reduce((sum, item) => sum + item.line_total, 0));
    const tax = formatMoney(subtotal * GRT_RATE);
    const fees = formatMoney(ESTIMATED_FEES);
    const total = formatMoney(subtotal + tax + fees);

    const orderId = `JD-${uuidv4().slice(0, 8).toUpperCase()}`;
    const publicViewToken = generatePublicViewToken();

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, public_view_token, customer_clerk_id, customer_name, customer_email, customer_phone, order_type,
        pickup_time, location_id, status, payment_status, payment_method, payment_provider, subtotal, tax, fees, total, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (order_id, item_id, item_name, item_price, quantity, addons_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const createOrder = db.transaction(() => {
      insertOrder.run(
        orderId,
        publicViewToken,
        customerClerkId,
        normalizedName,
        normalizedEmail,
        normalizedPhone || null,
        order_type,
        normalizedPickupTime || null,
        location.id,
        'pending_payment',
        'pending',
        payment_method,
        'square',
        subtotal,
        tax,
        fees,
        total,
        normalizedNotes || null
      );

      for (const item of normalizedItems) {
        insertOrderItem.run(
          orderId,
          item.id,
          item.name,
          item.price,
          item.quantity,
          JSON.stringify(item.addons || [])
        );
      }
    });

    createOrder();

    const orderPayload = buildOrderPayload(db, db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId));

    sendPickupOrderReceivedEmail(orderPayload).catch((mailErr) => {
      console.error(`Pickup request notification failed for ${orderId}:`, mailErr.message);
    });

    res.status(201).json({
      success: true,
      data: orderPayload,
      message: 'Pickup order received. The store will confirm it shortly by email.',
    });
  } catch (err) {
    console.error('Order creation error:', err);
    const isValidationError = [
      'Each order item must include a valid item id and quantity',
      'Each add-on must include a valid item id and quantity',
      'One or more selected items are unavailable',
      'One or more selected add-ons are unavailable',
    ].includes(err.message) || err.message?.includes('is not available as an add-on') || err.message?.includes('must be added through the add-on picker');

    res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: isValidationError ? err.message : 'Failed to place order. Please try again.',
    });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!isAuthorizedForOrder(req, order)) {
      return res.status(403).json({ success: false, message: 'Order access is not available for this request.' });
    }

    return res.json({ success: true, data: buildOrderPayload(db, order) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
});

router.get('/', (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Public order listing is not available.',
  });
});

module.exports = router;
