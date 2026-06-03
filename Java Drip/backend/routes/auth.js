const express = require('express');
const { clerkClient, getAuth } = require('@clerk/express');
const { getDb } = require('../db/database');

const router = express.Router();

function getPrimaryEmail(user) {
  if (!user?.emailAddresses?.length) return null;
  const primary = user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId);
  return (primary || user.emailAddresses[0])?.emailAddress || null;
}

function getPrimaryPhone(user) {
  if (!user?.phoneNumbers?.length) return null;
  const primary = user.phoneNumbers.find((entry) => entry.id === user.primaryPhoneNumberId);
  return (primary || user.phoneNumbers[0])?.phoneNumber || null;
}

function getDisplayName(user, fallbackEmail) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  return fallbackEmail ? fallbackEmail.split('@')[0] : 'Java Drip Coffee Member';
}

function sanitizeCustomerProfile(profile) {
  return {
    id: profile.clerk_user_id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    favoriteOrder: profile.favorite_order || null,
    createdAt: profile.created_at,
  };
}

function fetchOrdersForCustomer(db, clerkUserId, email) {
  const rows = db.prepare(`
    SELECT *
    FROM orders
    WHERE (customer_clerk_id = ?)
       OR (customer_clerk_id IS NULL AND lower(customer_email) = lower(?))
    ORDER BY datetime(created_at) DESC
    LIMIT 50
  `).all(clerkUserId, email);

  if (rows.length === 0) return [];

  // Only load order items that belong to this customer's orders — not the full table.
  const placeholders = rows.map(() => '?').join(', ');
  const orderIds = rows.map((r) => r.id);
  const orderItems = db.prepare(
    `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id`
  ).all(...orderIds);

  const groupedItems = new Map();

  for (const item of orderItems) {
    const current = groupedItems.get(item.order_id) || [];
    current.push({
      ...item,
      addons: item.addons_json ? JSON.parse(item.addons_json) : [],
    });
    groupedItems.set(item.order_id, current);
  }

  return rows.map((order) => ({
    ...order,
    items: groupedItems.get(order.id) || [],
  }));
}

function upsertCustomerProfile(db, clerkUserId, email, name, phone) {
  const existing = db.prepare('SELECT * FROM customer_profiles WHERE clerk_user_id = ? OR lower(email) = lower(?)').get(clerkUserId, email);

  if (existing) {
    db.prepare(`
      UPDATE customer_profiles
      SET clerk_user_id = ?, email = ?, name = ?, phone = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(clerkUserId, email, name, phone, existing.id);

    return db.prepare('SELECT * FROM customer_profiles WHERE id = ?').get(existing.id);
  }

  const result = db.prepare(`
    INSERT INTO customer_profiles (clerk_user_id, email, name, phone, reward_points, tier)
    VALUES (?, ?, ?, ?, 0, 'Pulse Member')
  `).run(clerkUserId, email, name, phone);

  return db.prepare('SELECT * FROM customer_profiles WHERE id = ?').get(result.lastInsertRowid);
}

router.get('/session', async (req, res) => {
  try {
    if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) {
      return res.status(503).json({ success: false, message: 'Clerk auth is not configured on the server yet.' });
    }

    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Customer authentication required.' });
    }

    const clerkUser = await clerkClient.users.getUser(userId);
    const email = getPrimaryEmail(clerkUser);

    if (!email) {
      return res.status(400).json({ success: false, message: 'Your Clerk account does not have a primary email address yet.' });
    }

    const phone = getPrimaryPhone(clerkUser);
    const name = getDisplayName(clerkUser, email);
    const db = getDb();
    const profile = upsertCustomerProfile(db, userId, email, name, phone);
    const orders = fetchOrdersForCustomer(db, userId, email);

    return res.json({
      success: true,
      data: {
        user: sanitizeCustomerProfile(profile),
        orders,
      },
    });
  } catch (err) {
    console.error('Customer session lookup failed:', err.message);
    return res.status(500).json({ success: false, message: 'Could not load the customer account right now.' });
  }
});

module.exports = router;
module.exports.__test = {
  fetchOrdersForCustomer,
  sanitizeCustomerProfile,
  upsertCustomerProfile,
};
