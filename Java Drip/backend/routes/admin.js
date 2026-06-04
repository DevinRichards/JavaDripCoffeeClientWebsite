const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const {
  createAdminToken,
  getAdminAuthStatus,
  isAdminSessionConfigured,
  requireAdmin,
  sanitizeAdminUser,
  usesDefaultBootstrapPassword,
  verifyPassword,
} = require('../services/adminAuth');
const {
  sendPickupOrderCanceledEmail,
  sendPickupOrderConfirmedEmail,
} = require('../services/orderEmail');
const { createRateLimiter } = require('../middleware/security');

const adminLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Too many staff sign-in attempts were made from this connection. Please wait before trying again.',
});

function slugifyCategoryName(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function nextCategoryId(db, baseName) {
  const base = slugifyCategoryName(baseName) || 'menu-category';
  let candidate = base;
  let counter = 2;

  while (db.prepare('SELECT 1 FROM menu_categories WHERE id = ?').get(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
}

function nextCategorySortOrder(db) {
  const row = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS maxSort FROM menu_categories').get();
  return (row?.maxSort || 0) + 10;
}

function nextItemSortOrder(db, categoryId) {
  const row = db.prepare(
    'SELECT COALESCE(MAX(sort_order), 0) AS maxSort FROM menu_items WHERE category_id = ?'
  ).get(categoryId);
  return (row?.maxSort || 0) + 10;
}

function normalizePrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error('Price must be a valid positive number.');
  }

  return Number(price.toFixed(2));
}

function validateGalleryDataUrl(value, mediaType) {
  const mediaUrl = String(value || '').trim();
  if (!mediaUrl) {
    throw new Error(mediaType === 'video' ? 'Gallery video is required.' : 'Gallery image is required.');
  }

  const isValidPhoto = /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(mediaUrl);
  const isValidVideo = /^data:video\/(mp4|webm|ogg|quicktime);base64,/i.test(mediaUrl);

  if (mediaType === 'video') {
    if (!isValidVideo) {
      throw new Error('Upload an MP4, WEBM, MOV, or OGG video.');
    }
    if (mediaUrl.length > 8_500_000) {
      throw new Error('Please choose a video under 6 MB.');
    }
    return mediaUrl;
  }

  if (!isValidPhoto) {
    throw new Error('Upload a JPG, PNG, WEBP, or GIF image.');
  }

  if (mediaUrl.length > 3_000_000) {
    throw new Error('Please choose an image under 2 MB.');
  }

  return mediaUrl;
}

function getGalleryPayload(db, includeInactive = false) {
  const where = includeInactive ? '' : 'WHERE active = 1';
  const items = db.prepare(`
    SELECT *
    FROM gallery_items
    ${where}
    ORDER BY sort_order, datetime(created_at) DESC, id DESC
  `).all();
  const categories = db.prepare(`
    SELECT *
    FROM gallery_categories
    ORDER BY sort_order, name
  `).all();

  return { categories, items };
}

function normalizeGalleryCategory(value) {
  const category = String(value || 'Photos').trim();
  return category || 'Photos';
}

function ensureGalleryCategoryExists(db, categoryName) {
  const category = normalizeGalleryCategory(categoryName);
  const exists = db.prepare('SELECT 1 FROM gallery_categories WHERE name = ?').get(category);
  if (!exists) {
    throw new Error('Choose an existing gallery category or create it first.');
  }
  return category;
}

function normalizeGalleryMediaType(value) {
  const mediaType = String(value || 'photo').trim().toLowerCase();
  return mediaType === 'video' ? 'video' : 'photo';
}

function getAdminMenuPayload(db) {
  const categories = db.prepare('SELECT * FROM menu_categories ORDER BY sort_order, name').all();
  const items = db.prepare('SELECT * FROM menu_items ORDER BY category_id, sort_order, name').all();

  return categories.map((category) => ({
    ...category,
    items: items.filter((item) => item.category_id === category.id),
  }));
}

function getAdminOrdersPayload(db) {
  const orders = db.prepare(`
    SELECT orders.*, locations.name AS location_name
    FROM orders
    LEFT JOIN locations ON locations.id = orders.location_id
    ORDER BY
      CASE orders.status
        WHEN 'pending_payment' THEN 0
        WHEN 'pending_confirmation' THEN 0
        WHEN 'confirmed' THEN 1
        WHEN 'canceled' THEN 2
        ELSE 2
      END,
      datetime(orders.created_at) DESC
    LIMIT 100
  `).all();

  if (orders.length === 0) return [];

  // Only load order items for the returned orders — not the full table.
  const placeholders = orders.map(() => '?').join(', ');
  const orderIds = orders.map((o) => o.id);
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

  return orders.map((order) => ({
    ...order,
    items: groupedItems.get(order.id) || [],
  }));
}

router.post('/login', adminLoginLimiter, (req, res) => {
  try {
    if (!isAdminSessionConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Staff authentication is not configured on the server yet.',
      });
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM admin_users WHERE email = ? AND active = 1').get(email);

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ success: false, message: 'Invalid staff credentials.' });
    }

    return res.json({
      success: true,
      data: {
        token: createAdminToken(user),
        user: sanitizeAdminUser(user),
        passwordResetRecommended: usesDefaultBootstrapPassword(),
      },
    });
  } catch (err) {
    console.error('Admin login failed:', err.message);
    return res.status(500).json({ success: false, message: 'Could not sign in right now.' });
  }
});

router.get('/session', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM admin_users WHERE id = ? AND active = 1').get(req.admin.sub);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Admin session is no longer valid.' });
    }

    return res.json({
      success: true,
      data: {
        user: sanitizeAdminUser(user),
        passwordResetRecommended: usesDefaultBootstrapPassword(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Could not verify the admin session.' });
  }
});

router.get('/status', (req, res) => {
  return res.json({
    success: true,
    data: getAdminAuthStatus(),
  });
});

router.get('/menu', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    res.json({ success: true, data: getAdminMenuPayload(db) });
  } catch (err) {
    console.error('Admin menu fetch failed:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch admin menu.' });
  }
});

router.post('/categories', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const name = String(req.body.name || '').trim();
    const subtitle = String(req.body.subtitle || '').trim() || null;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const id = nextCategoryId(db, name);
    const sortOrder = Number.isFinite(Number(req.body.sort_order))
      ? Number(req.body.sort_order)
      : nextCategorySortOrder(db);

    db.prepare(`
      INSERT INTO menu_categories (id, name, subtitle, sort_order)
      VALUES (?, ?, ?, ?)
    `).run(id, name, subtitle, sortOrder);

    res.status(201).json({ success: true, data: getAdminMenuPayload(db) });
  } catch (err) {
    console.error('Category creation failed:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to create category.' });
  }
});

router.put('/categories/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const current = db.prepare('SELECT * FROM menu_categories WHERE id = ?').get(req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const name = String(req.body.name || current.name).trim();
    const subtitle = req.body.subtitle === undefined
      ? current.subtitle
      : (String(req.body.subtitle || '').trim() || null);
    const sortOrder = Number.isFinite(Number(req.body.sort_order))
      ? Number(req.body.sort_order)
      : current.sort_order;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    db.prepare(`
      UPDATE menu_categories
      SET name = ?, subtitle = ?, sort_order = ?
      WHERE id = ?
    `).run(name, subtitle, sortOrder, req.params.id);

    res.json({ success: true, data: getAdminMenuPayload(db) });
  } catch (err) {
    console.error('Category update failed:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to update category.' });
  }
});

router.post('/items', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const categoryId = String(req.body.category_id || '').trim();
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim() || null;
    const imageUrl = String(req.body.image_url || '').trim() || null;
    const badge = String(req.body.badge || '').trim() || null;
    const active = req.body.active === undefined ? 1 : (req.body.active ? 1 : 0);

    if (!categoryId || !db.prepare('SELECT 1 FROM menu_categories WHERE id = ?').get(categoryId)) {
      return res.status(400).json({ success: false, message: 'Choose a valid category.' });
    }
    if (!name) {
      return res.status(400).json({ success: false, message: 'Item name is required.' });
    }

    const price = normalizePrice(req.body.price);
    const sortOrder = Number.isFinite(Number(req.body.sort_order))
      ? Number(req.body.sort_order)
      : nextItemSortOrder(db, categoryId);

    db.prepare(`
      INSERT INTO menu_items (category_id, name, description, price, image_url, badge, active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(categoryId, name, description, price, imageUrl, badge, active, sortOrder);

    res.status(201).json({ success: true, data: getAdminMenuPayload(db) });
  } catch (err) {
    console.error('Item creation failed:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to create item.' });
  }
});

router.put('/items/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const current = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const categoryId = String(req.body.category_id || current.category_id).trim();
    if (!db.prepare('SELECT 1 FROM menu_categories WHERE id = ?').get(categoryId)) {
      return res.status(400).json({ success: false, message: 'Choose a valid category.' });
    }

    const name = String(req.body.name || current.name).trim();
    const description = req.body.description === undefined
      ? current.description
      : (String(req.body.description || '').trim() || null);
    const imageUrl = req.body.image_url === undefined
      ? current.image_url
      : (String(req.body.image_url || '').trim() || null);
    const badge = req.body.badge === undefined
      ? current.badge
      : (String(req.body.badge || '').trim() || null);
    const active = req.body.active === undefined ? current.active : (req.body.active ? 1 : 0);
    const sortOrder = Number.isFinite(Number(req.body.sort_order))
      ? Number(req.body.sort_order)
      : current.sort_order;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Item name is required.' });
    }

    const price = req.body.price === undefined ? Number(current.price) : normalizePrice(req.body.price);

    db.prepare(`
      UPDATE menu_items
      SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?, badge = ?, active = ?, sort_order = ?
      WHERE id = ?
    `).run(categoryId, name, description, price, imageUrl, badge, active, sortOrder, req.params.id);

    res.json({ success: true, data: getAdminMenuPayload(db) });
  } catch (err) {
    console.error('Item update failed:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to update item.' });
  }
});

router.get('/gallery', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    res.json({ success: true, data: getGalleryPayload(db, true) });
  } catch (err) {
    console.error('Admin gallery fetch failed:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch gallery media.' });
  }
});

router.post('/gallery/categories', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const name = normalizeGalleryCategory(req.body.name);
    const sortOrder = Number.isFinite(Number(req.body.sort_order)) ? Number(req.body.sort_order) : 100;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    db.prepare(`
      INSERT INTO gallery_categories (name, sort_order)
      VALUES (?, ?)
    `).run(name, sortOrder);

    res.status(201).json({ success: true, data: getGalleryPayload(db, true) });
  } catch (err) {
    const isDuplicate = /UNIQUE/i.test(err.message);
    console.error('Gallery category creation failed:', err.message);
    res.status(isDuplicate ? 400 : 500).json({
      success: false,
      message: isDuplicate ? 'That gallery category already exists.' : (err.message || 'Failed to create gallery category.'),
    });
  }
});

router.delete('/gallery/categories/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const category = db.prepare('SELECT * FROM gallery_categories WHERE id = ?').get(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Gallery category not found.' });
    }
    if (category.name === 'Photos') {
      return res.status(400).json({ success: false, message: 'The Photos category cannot be deleted.' });
    }

    const fallback = db.prepare('SELECT 1 FROM gallery_categories WHERE name = ?').get('Photos');
    if (!fallback) {
      db.prepare('INSERT INTO gallery_categories (name, sort_order) VALUES (?, ?)').run('Photos', 10);
    }

    const deleteCategory = db.transaction(() => {
      db.prepare('UPDATE gallery_items SET category = ?, updated_at = datetime(\'now\') WHERE category = ?').run('Photos', category.name);
      db.prepare('DELETE FROM gallery_categories WHERE id = ?').run(category.id);
    });
    deleteCategory();

    res.json({ success: true, data: getGalleryPayload(db, true) });
  } catch (err) {
    console.error('Gallery category delete failed:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete gallery category.' });
  }
});

router.post('/gallery', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const title = String(req.body.title || '').trim();
    const caption = String(req.body.caption || '').trim() || null;
    const category = ensureGalleryCategoryExists(db, req.body.category);
    const mediaType = normalizeGalleryMediaType(req.body.media_type);
    const imageUrl = validateGalleryDataUrl(req.body.image_url, mediaType);
    const active = req.body.active === undefined ? 1 : (req.body.active ? 1 : 0);
    const sortOrder = Number.isFinite(Number(req.body.sort_order)) ? Number(req.body.sort_order) : 0;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Gallery title is required.' });
    }

    db.prepare(`
      INSERT INTO gallery_items (title, category, media_type, image_url, caption, active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, category, mediaType, imageUrl, caption, active, sortOrder);

    res.status(201).json({ success: true, data: getGalleryPayload(db, true) });
  } catch (err) {
    console.error('Gallery item creation failed:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to create gallery item.' });
  }
});

router.put('/gallery/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const current = db.prepare('SELECT * FROM gallery_items WHERE id = ?').get(req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Gallery item not found.' });
    }

    const title = String(req.body.title ?? current.title).trim();
    const caption = req.body.caption === undefined ? current.caption : (String(req.body.caption || '').trim() || null);
    const category = req.body.category === undefined ? current.category : ensureGalleryCategoryExists(db, req.body.category);
    const mediaType = req.body.media_type === undefined ? current.media_type : normalizeGalleryMediaType(req.body.media_type);
    const imageUrl = req.body.image_url === undefined ? current.image_url : validateGalleryDataUrl(req.body.image_url, mediaType);
    const active = req.body.active === undefined ? current.active : (req.body.active ? 1 : 0);
    const sortOrder = Number.isFinite(Number(req.body.sort_order)) ? Number(req.body.sort_order) : current.sort_order;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Gallery title is required.' });
    }

    db.prepare(`
      UPDATE gallery_items
      SET title = ?, category = ?, media_type = ?, image_url = ?, caption = ?, active = ?, sort_order = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(title, category, mediaType, imageUrl, caption, active, sortOrder, req.params.id);

    res.json({ success: true, data: getGalleryPayload(db, true) });
  } catch (err) {
    console.error('Gallery item update failed:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to update gallery item.' });
  }
});

router.delete('/gallery/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM gallery_items WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Gallery item not found.' });
    }

    res.json({ success: true, data: getGalleryPayload(db, true) });
  } catch (err) {
    console.error('Gallery item delete failed:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete gallery item.' });
  }
});

router.get('/orders', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    res.json({ success: true, data: getAdminOrdersPayload(db) });
  } catch (err) {
    console.error('Admin orders fetch failed:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch pickup orders.' });
  }
});

router.post('/orders/:id/confirm', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.status === 'canceled') {
      return res.status(400).json({ success: false, message: 'Canceled orders cannot be confirmed.' });
    }

    if (order.payment_method === 'online' && order.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Online payment must be completed before confirming this order.' });
    }

    const pickupTime = String(req.body.pickup_time || '').trim();
    const adminNotes = String(req.body.admin_notes || '').trim() || null;

    if (!pickupTime) {
      return res.status(400).json({ success: false, message: 'Pickup time is required to confirm the order.' });
    }

    db.prepare(`
      UPDATE orders
      SET status = 'confirmed',
          confirmation_pickup_time = ?,
          admin_notes = ?,
          confirmed_at = datetime('now')
      WHERE id = ?
    `).run(pickupTime, adminNotes, req.params.id);

    let refreshedOrders = getAdminOrdersPayload(db);
    const refreshedOrder = refreshedOrders.find((entry) => entry.id === req.params.id);
    let emailSent = false;
    let emailWarning = '';

    try {
      emailSent = await sendPickupOrderConfirmedEmail(refreshedOrder);
      if (emailSent) {
        db.prepare('UPDATE orders SET customer_notified_at = datetime(\'now\') WHERE id = ?').run(req.params.id);
        refreshedOrders = getAdminOrdersPayload(db);
      } else {
        emailWarning = ' Customer email was not sent because email delivery is not configured.';
      }
    } catch (mailErr) {
      emailWarning = ' Customer email failed to send. Check the email provider settings and server logs.';
      console.error(`Pickup confirmation email failed for ${req.params.id}:`, mailErr.message);
    }

    res.json({
      success: true,
      data: refreshedOrders,
      emailSent,
      message: `Order ${req.params.id} confirmed for ${pickupTime}.${emailWarning}`,
    });
  } catch (err) {
    console.error('Admin order confirmation failed:', err.message);
    res.status(500).json({ success: false, message: 'Failed to confirm the pickup order.' });
  }
});

router.post('/orders/:id/cancel', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.status === 'canceled') {
      return res.status(400).json({ success: false, message: 'Order is already canceled.' });
    }

    const adminNotes = String(req.body.admin_notes || '').trim() || 'Order canceled by Java Drip Coffee staff.';

    db.prepare(`
      UPDATE orders
      SET status = 'canceled',
          admin_notes = ?,
          customer_notified_at = datetime('now')
      WHERE id = ?
    `).run(adminNotes, req.params.id);

    let refreshedOrders = getAdminOrdersPayload(db);
    const refreshedOrder = refreshedOrders.find((entry) => entry.id === req.params.id);
    let emailSent = false;
    let emailWarning = '';

    try {
      emailSent = await sendPickupOrderCanceledEmail(refreshedOrder);
      if (emailSent) {
        db.prepare('UPDATE orders SET customer_notified_at = datetime(\'now\') WHERE id = ?').run(req.params.id);
        refreshedOrders = getAdminOrdersPayload(db);
      } else {
        emailWarning = ' Customer email was not sent because email delivery is not configured.';
      }
    } catch (mailErr) {
      emailWarning = ' Customer email failed to send. Check the email provider settings and server logs.';
      console.error(`Pickup cancellation email failed for ${req.params.id}:`, mailErr.message);
    }

    res.json({
      success: true,
      data: refreshedOrders,
      emailSent,
      message: `Order ${req.params.id} canceled.${emailWarning}`,
    });
  } catch (err) {
    console.error('Admin order cancellation failed:', err.message);
    res.status(500).json({ success: false, message: 'Failed to cancel the pickup order.' });
  }
});

module.exports = router;
