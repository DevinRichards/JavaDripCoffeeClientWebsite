const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/locations
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const locations = db.prepare('SELECT * FROM locations ORDER BY id').all();
    res.json({ success: true, data: locations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch locations' });
  }
});

// GET /api/locations/:id
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
    if (!location) return res.status(404).json({ success: false, message: 'Location not found' });
    res.json({ success: true, data: location });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch location' });
  }
});

module.exports = router;
