const path = require('path');
const Database = require(path.join(__dirname, '..', 'Java Drip', 'backend', 'node_modules', 'better-sqlite3'));
const authRoute = require(path.join(__dirname, '..', 'Java Drip', 'backend', 'routes', 'auth'));

const DB_PATH = path.join(__dirname, '..', 'Java Drip', 'backend', 'data', 'javadrip.db');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function insertLinkedOrder(db, order) {
  db.prepare(`
    INSERT INTO orders (
      id, public_view_token, customer_clerk_id, customer_name, customer_email, customer_phone,
      order_type, pickup_time, location_id, status, payment_status, payment_method, subtotal, tax, fees, total, notes
    )
    VALUES (?, ?, ?, ?, ?, ?, 'pickup', 'ASAP', ?, 'confirmed', 'unpaid', 'pay_at_pickup', 4, 0.34, 0, 4.34, ?)
  `).run(
    order.id,
    order.publicViewToken,
    order.clerkUserId,
    order.customerName,
    order.customerEmail,
    order.customerPhone,
    order.locationId,
    order.notes
  );

  db.prepare(`
    INSERT INTO order_items (order_id, item_id, item_name, item_price, quantity, addons_json)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(order.id, order.itemId, order.itemName, 4, JSON.stringify([]));
}

function main() {
  const helpers = authRoute.__test;
  assert(helpers?.upsertCustomerProfile, 'Customer auth test helpers were not exported.');

  const db = new Database(DB_PATH);
  const timestamp = Date.now();
  const clerkUserId = `user_qa_${timestamp}`;
  const customerEmail = `customer-flow-${timestamp}@javadrip.test`;
  const customerName = 'QA Created Customer';
  const customerPhone = '505-555-0198';
  const legacyOrderId = `JD-QA${String(timestamp).slice(-6)}`;
  const signedInOrderId = `JD-QB${String(timestamp).slice(-6)}`;

  try {
    const location = db.prepare('SELECT id FROM locations ORDER BY id LIMIT 1').get();
    assert(location?.id, 'No location available for customer flow QA.');

    const item = db.prepare(`
      SELECT menu_items.id, menu_items.name
      FROM menu_items
      LEFT JOIN menu_categories ON menu_categories.id = menu_items.category_id
      WHERE menu_items.active = 1
        AND lower(menu_categories.name) NOT IN ('add ons', 'milk options')
      ORDER BY menu_items.id
      LIMIT 1
    `).get();
    assert(item?.id, 'No active orderable menu item available for customer flow QA.');

    insertLinkedOrder(db, {
      id: legacyOrderId,
      publicViewToken: `legacy-token-${timestamp}`,
      clerkUserId: null,
      customerName,
      customerEmail,
      customerPhone,
      locationId: location.id,
      itemId: item.id,
      itemName: item.name,
      notes: 'Customer QA legacy guest order',
    });

    const createdProfile = helpers.upsertCustomerProfile(db, clerkUserId, customerEmail, customerName, customerPhone);
    const sanitizedProfile = helpers.sanitizeCustomerProfile(createdProfile);

    assert(sanitizedProfile.id === clerkUserId, 'Created customer profile did not use the Clerk user id.');
    assert(sanitizedProfile.email === customerEmail, 'Created customer profile email did not match.');
    assert(sanitizedProfile.name === customerName, 'Created customer profile name did not match.');

    const legacyOrders = helpers.fetchOrdersForCustomer(db, clerkUserId, customerEmail);
    assert(
      legacyOrders.some((order) => order.id === legacyOrderId && order.items?.length === 1),
      'Customer profile did not attach existing guest order history by email.'
    );

    const updatedName = 'QA Updated Customer';
    const updatedPhone = '505-555-0199';
    const updatedProfile = helpers.upsertCustomerProfile(db, clerkUserId, customerEmail, updatedName, updatedPhone);
    const profileRows = db.prepare('SELECT COUNT(*) AS count FROM customer_profiles WHERE clerk_user_id = ?').get(clerkUserId);

    assert(profileRows.count === 1, 'Customer upsert created duplicate profiles for the same Clerk user.');
    assert(updatedProfile.name === updatedName, 'Customer upsert did not refresh the profile name.');
    assert(updatedProfile.phone === updatedPhone, 'Customer upsert did not refresh the profile phone.');

    insertLinkedOrder(db, {
      id: signedInOrderId,
      publicViewToken: `signed-in-token-${timestamp}`,
      clerkUserId,
      customerName: updatedName,
      customerEmail,
      customerPhone: updatedPhone,
      locationId: location.id,
      itemId: item.id,
      itemName: item.name,
      notes: 'Customer QA signed-in order',
    });

    const linkedOrders = helpers.fetchOrdersForCustomer(db, clerkUserId, customerEmail);
    assert(linkedOrders.some((order) => order.id === legacyOrderId), 'Legacy guest order disappeared from customer history.');
    assert(linkedOrders.some((order) => order.id === signedInOrderId), 'Signed-in order was not included in customer history.');

    console.log(JSON.stringify({
      success: true,
      clerkUserId,
      customerEmail,
      createdOrderIds: [legacyOrderId, signedInOrderId],
      checks: [
        'customer_profile_create',
        'customer_profile_update_without_duplicate',
        'guest_order_history_linked_by_email',
        'signed_in_order_history_linked_by_clerk_id',
      ],
    }, null, 2));
  } finally {
    db.prepare('DELETE FROM order_items WHERE order_id IN (?, ?)').run(legacyOrderId, signedInOrderId);
    db.prepare('DELETE FROM orders WHERE id IN (?, ?)').run(legacyOrderId, signedInOrderId);
    db.prepare('DELETE FROM customer_profiles WHERE clerk_user_id = ? OR lower(email) = lower(?)').run(clerkUserId, customerEmail);
    db.close();
  }
}

main();
