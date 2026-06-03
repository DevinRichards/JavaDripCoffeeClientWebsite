const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/menu — all categories with their items
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const categories = db.prepare(
      'SELECT * FROM menu_categories ORDER BY sort_order'
    ).all();

    const getItems = db.prepare(
      'SELECT * FROM menu_items WHERE category_id = ? AND active = 1 ORDER BY sort_order'
    );

    const menu = categories.map(cat => ({
      ...cat,
      items: getItems.all(cat.id)
    }));

    res.json({ success: true, data: menu });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch menu' });
  }
});

// GET /api/menu/items/:id — single item
router.get('/items/:id', (req, res) => {
  try {
    const db = getDb();
    const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch item' });
  }
});

module.exports = router;
