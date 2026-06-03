const path = require('path');
const Database = require(path.join(__dirname, '..', 'Java Drip', 'backend', 'node_modules', 'better-sqlite3'));

const API_BASE = 'http://127.0.0.1:3201/api';
const DB_PATH = path.join(__dirname, '..', 'Java Drip', 'backend', 'data', 'javadrip.db');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

function getTodayHours(location, now = new Date()) {
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const hoursText = isWeekend ? location.hours_weekend : location.hours_weekday;
  const matches = String(hoursText || '').match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];

  if (matches.length < 2) return null;

  return {
    openMinutes: parseClockTime(matches[0]),
    closeMinutes: parseClockTime(matches[1]),
  };
}

function roundUpToInterval(totalMinutes, interval) {
  return Math.ceil(totalMinutes / interval) * interval;
}

function toLabel(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${meridiem}`;
}

function getValidPickupTime(location, now = new Date()) {
  const hours = getTodayHours(location, now);
  if (!hours) return 'ASAP';

  const currentMinutes = (now.getHours() * 60) + now.getMinutes();

  if (currentMinutes >= hours.openMinutes && currentMinutes <= hours.closeMinutes) {
    return 'ASAP';
  }

  const earliest = roundUpToInterval(currentMinutes + 15, 15);
  const firstSlot = Math.max(hours.openMinutes, earliest);

  if (firstSlot > hours.closeMinutes) {
    throw new Error('No valid pickup slots remain today for QA order creation.');
  }

  return toLabel(firstSlot);
}

function getValidLaterPickupTime(location, now = new Date()) {
  const hours = getTodayHours(location, now);
  if (!hours) return null;

  const currentMinutes = (now.getHours() * 60) + now.getMinutes();
  const earliest = roundUpToInterval(currentMinutes + 15, 15);
  const firstSlot = Math.max(hours.openMinutes, earliest);

  if (firstSlot > hours.closeMinutes) {
    return null;
  }

  return toLabel(firstSlot);
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  return { response, body };
}

async function main() {
  const created = {
    categoryId: null,
    itemId: null,
    orderIds: [],
  };

  const db = new Database(DB_PATH);

  try {
    const loginResult = await request(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staff@javadrip.coffee',
        password: 'JavaDripAdmin!2026',
      }),
    });

    assert(loginResult.response.ok, `Admin login failed: ${JSON.stringify(loginResult.body)}`);
    const token = loginResult.body?.data?.token;
    assert(token, 'Admin token was not returned.');

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const categoryName = `QA Specials ${Date.now()}`;
    const categoryResult = await request(`${API_BASE}/admin/categories`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: categoryName,
        subtitle: 'Temporary QA category for launch validation',
      }),
    });

    assert(categoryResult.response.ok, `Category creation failed: ${JSON.stringify(categoryResult.body)}`);
    const category = categoryResult.body.data.find((entry) => entry.name === categoryName);
    assert(category, 'Created category was not returned from admin payload.');
    created.categoryId = category.id;

    const itemName = `QA Drink ${Date.now()}`;
    const itemResult = await request(`${API_BASE}/admin/items`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        category_id: created.categoryId,
        name: itemName,
        description: 'Temporary QA item used to validate create/update/archive flows.',
        price: 4.75,
        image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80&fit=crop',
        active: true,
      }),
    });

    assert(itemResult.response.ok, `Item creation failed: ${JSON.stringify(itemResult.body)}`);
    const qaCategoryAfterCreate = itemResult.body.data.find((entry) => entry.id === created.categoryId);
    const qaItem = qaCategoryAfterCreate?.items?.find((entry) => entry.name === itemName);
    assert(qaItem, 'Created item was not returned from admin payload.');
    created.itemId = qaItem.id;

    const updatedName = `${itemName} Updated`;
    const updateResult = await request(`${API_BASE}/admin/items/${created.itemId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        name: updatedName,
        price: 5.25,
        description: 'Updated during QA to confirm admin edit functionality.',
        image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80&fit=crop',
        active: true,
      }),
    });

    assert(updateResult.response.ok, `Item update failed: ${JSON.stringify(updateResult.body)}`);
    const qaCategoryAfterUpdate = updateResult.body.data.find((entry) => entry.id === created.categoryId);
    const updatedItem = qaCategoryAfterUpdate?.items?.find((entry) => entry.id === created.itemId);
    assert(updatedItem?.name === updatedName, 'Updated item name was not persisted.');
    assert(Number(updatedItem?.price) === 5.25, 'Updated item price was not persisted.');

    const archiveResult = await request(`${API_BASE}/admin/items/${created.itemId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ active: false }),
    });

    assert(archiveResult.response.ok, `Item archive failed: ${JSON.stringify(archiveResult.body)}`);
    const archivedItem = archiveResult.body.data
      .find((entry) => entry.id === created.categoryId)
      ?.items?.find((entry) => entry.id === created.itemId);
    assert(Number(archivedItem?.active) === 0, 'Archived item did not become inactive.');

    const restoreResult = await request(`${API_BASE}/admin/items/${created.itemId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ active: true }),
    });

    assert(restoreResult.response.ok, `Item restore failed: ${JSON.stringify(restoreResult.body)}`);
    const restoredItem = restoreResult.body.data
      .find((entry) => entry.id === created.categoryId)
      ?.items?.find((entry) => entry.id === created.itemId);
    assert(Number(restoredItem?.active) === 1, 'Restored item did not become active again.');

    const locationsResult = await request(`${API_BASE}/locations`);
    assert(locationsResult.response.ok, `Location lookup failed: ${JSON.stringify(locationsResult.body)}`);
    const openLocation = locationsResult.body?.data?.find((entry) => entry.status === 'open') || locationsResult.body?.data?.[0];
    assert(openLocation, 'No pickup location available for QA.');

    const menuResult = await request(`${API_BASE}/menu`);
    assert(menuResult.response.ok, `Menu lookup failed: ${JSON.stringify(menuResult.body)}`);
    const firstOrderable = menuResult.body.data
      .filter((category) => !['add-ons', 'milk-options'].includes(category.id))
      .flatMap((category) => category.items || [])
      .find((item) => item.active);
    const firstAddon = menuResult.body.data
      .filter((category) => ['add-ons', 'milk-options'].includes(category.id))
      .flatMap((category) => category.items || [])
      .find((item) => item.active);
    assert(firstOrderable, 'No active menu item available for order QA.');
    assert(firstAddon, 'No active add-on available for order QA.');

    const pickupTime = getValidPickupTime(openLocation);
    const orderResult = await request(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'QA Guest Customer',
        customer_email: 'qa-guest@javadrip.test',
        customer_phone: '505-555-0100',
        order_type: 'pickup',
        payment_method: 'online',
        pickup_time: pickupTime,
        location_id: openLocation.id,
        notes: 'Launch QA guest order',
        items: [
          {
            id: firstOrderable.id,
            quantity: 1,
            addons: [
              {
                id: firstAddon.id,
                quantity: 1,
              },
            ],
          },
        ],
      }),
    });

    assert(orderResult.response.status === 201, `Guest order creation failed: ${JSON.stringify(orderResult.body)}`);
    created.orderIds.push(orderResult.body?.data?.id);
    const orderToken = orderResult.body?.data?.public_view_token;
    assert(created.orderIds[0] && orderToken, 'Order tokenized payload was not returned.');
    assert(orderResult.body?.data?.items?.[0]?.addons?.length === 1, 'Selected add-on was not persisted on the guest order.');

    const adminOrdersResult = await request(`${API_BASE}/admin/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(adminOrdersResult.response.ok, `Admin orders lookup failed: ${JSON.stringify(adminOrdersResult.body)}`);
    const pendingOrder = adminOrdersResult.body.data.find((entry) => entry.id === created.orderIds[0]);
    assert(pendingOrder, 'Created pickup order did not appear in admin queue.');
    assert(pendingOrder.status === 'pending_payment', 'Created pickup order should wait for online payment before confirmation.');

    db.prepare(`
      UPDATE orders
      SET payment_status = 'paid',
          payment_method = 'online',
          payment_provider = 'square',
          status = 'pending_confirmation',
          square_payment_id = ?
      WHERE id = ?
    `).run(`qa-square-payment-${Date.now()}`, created.orderIds[0]);

    const confirmationTime = pickupTime === 'ASAP' ? '15 minutes' : pickupTime;
    const confirmResult = await request(`${API_BASE}/admin/orders/${created.orderIds[0]}/confirm`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        pickup_time: confirmationTime,
        admin_notes: 'QA confirmation complete',
      }),
    });

    assert(confirmResult.response.ok, `Order confirmation failed: ${JSON.stringify(confirmResult.body)}`);
    const confirmedOrder = confirmResult.body.data.find((entry) => entry.id === created.orderIds[0]);
    assert(confirmedOrder?.status === 'confirmed', 'Order did not transition to confirmed status.');
    assert(confirmedOrder?.confirmation_pickup_time === confirmationTime, 'Confirmed pickup time was not persisted.');

    const publicOrderResult = await request(`${API_BASE}/orders/${created.orderIds[0]}?token=${orderToken}`);
    assert(publicOrderResult.response.ok, `Public order lookup failed: ${JSON.stringify(publicOrderResult.body)}`);
    assert(publicOrderResult.body?.data?.confirmation_pickup_time === confirmationTime, 'Customer-facing order page data did not reflect the confirmed pickup time.');

    const cancelOrderResult = await request(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'QA Cancel Customer',
        customer_email: 'qa-cancel@javadrip.test',
        customer_phone: '505-555-0103',
        order_type: 'pickup',
        payment_method: 'online',
        pickup_time: pickupTime,
        location_id: openLocation.id,
        notes: 'Launch QA cancel order',
        items: [
          {
            id: firstOrderable.id,
            quantity: 1,
            addons: [],
          },
        ],
      }),
    });

    assert(cancelOrderResult.response.status === 201, `Cancel order creation failed: ${JSON.stringify(cancelOrderResult.body)}`);
    const cancelOrderId = cancelOrderResult.body?.data?.id;
    const cancelOrderToken = cancelOrderResult.body?.data?.public_view_token;
    created.orderIds.push(cancelOrderId);

    const cancelResult = await request(`${API_BASE}/admin/orders/${cancelOrderId}/cancel`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        admin_notes: 'QA cancellation complete',
      }),
    });

    assert(cancelResult.response.ok, `Order cancellation failed: ${JSON.stringify(cancelResult.body)}`);
    const canceledOrder = cancelResult.body.data.find((entry) => entry.id === cancelOrderId);
    assert(canceledOrder?.status === 'canceled', 'Order did not transition to canceled status.');
    assert(canceledOrder?.admin_notes === 'QA cancellation complete', 'Cancellation note was not persisted.');

    const publicCanceledOrderResult = await request(`${API_BASE}/orders/${cancelOrderId}?token=${cancelOrderToken}`);
    assert(publicCanceledOrderResult.response.ok, `Public canceled order lookup failed: ${JSON.stringify(publicCanceledOrderResult.body)}`);
    assert(publicCanceledOrderResult.body?.data?.status === 'canceled', 'Customer-facing order page data did not reflect the canceled status.');

    const laterPickupTime = getValidLaterPickupTime(openLocation);
    if (laterPickupTime) {
      const laterOrderResult = await request(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'QA Later Customer',
          customer_email: 'qa-later@javadrip.test',
          customer_phone: '505-555-0101',
          order_type: 'pickup',
          payment_method: 'online',
          pickup_time: laterPickupTime,
          location_id: openLocation.id,
          notes: 'Launch QA later-slot order',
          items: [
            {
              id: firstOrderable.id,
              quantity: 1,
              addons: [],
            },
          ],
        }),
      });

      assert(laterOrderResult.response.status === 201, `Pickup Later order failed: ${JSON.stringify(laterOrderResult.body)}`);
      created.orderIds.push(laterOrderResult.body?.data?.id);
    }

    const invalidPickupResult = await request(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'QA Invalid Customer',
        customer_email: 'qa-invalid@javadrip.test',
        customer_phone: '505-555-0102',
        order_type: 'pickup',
        pickup_time: '12:00 AM',
        location_id: openLocation.id,
        notes: 'Launch QA invalid pickup time order',
        items: [
          {
            id: firstOrderable.id,
            quantity: 1,
            addons: [],
          },
        ],
      }),
    });

    assert(invalidPickupResult.response.status === 400, `Invalid pickup time was unexpectedly accepted: ${JSON.stringify(invalidPickupResult.body)}`);

    console.log(JSON.stringify({
      success: true,
      createdCategoryId: created.categoryId,
      createdItemId: created.itemId,
      createdOrderIds: created.orderIds,
      pickupTime,
      confirmationTime,
      laterPickupTime,
      checks: [
        'admin_login',
        'create_category',
        'create_item',
        'update_item',
        'archive_item',
        'restore_item',
        'guest_pickup_order_with_addon',
        'pickup_later_valid_slot',
        'pickup_time_rejection',
        'admin_order_queue',
        'confirm_order',
        'cancel_order',
        'public_confirmation_view',
        'public_cancellation_view',
      ],
    }, null, 2));
  } finally {
    for (const orderId of created.orderIds) {
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(orderId);
      db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
    }

    if (created.itemId) {
      db.prepare('DELETE FROM menu_items WHERE id = ?').run(created.itemId);
    }

    if (created.categoryId) {
      db.prepare('DELETE FROM menu_categories WHERE id = ?').run(created.categoryId);
    }

    db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
