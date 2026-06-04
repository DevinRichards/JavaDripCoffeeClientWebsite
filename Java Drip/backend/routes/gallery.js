const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const items = db.prepare(`
      SELECT id, title, category, media_type, image_url, caption, sort_order, created_at
      FROM gallery_items
      WHERE active = 1
      ORDER BY sort_order, datetime(created_at) DESC, id DESC
    `).all();
    const categories = db.prepare(`
      SELECT id, name, sort_order
      FROM gallery_categories
      ORDER BY sort_order, name
    `).all();

    res.json({ success: true, data: { categories, items } });
  } catch (err) {
    console.error('Gallery fetch failed:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load gallery.' });
  }
});

module.exports = router;
