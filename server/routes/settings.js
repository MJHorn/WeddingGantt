const express = require('express');
const { requireAuth, setupPassword, authenticate } = require('../auth');
const { getAllSettings, setSetting } = require('../db');

const router = express.Router();

router.use(requireAuth);

// Get current settings
router.get('/', (req, res) => {
  const settings = getAllSettings();
  delete settings.password_hash; // Never expose password hash
  res.json(settings);
});

// Update settings
router.put('/', (req, res) => {
  const allowedKeys = [
    'partner1_name',
    'partner1_color',
    'partner2_name',
    'partner2_color',
    'wedding_title',
    'wedding_date',
    'budget_total',
    'currency_symbol'
  ];

  const updates = req.body;
  for (const key of allowedKeys) {
    if (updates[key] !== undefined) {
      setSetting(key, String(updates[key]));
    }
  }

  // Optional: update password if requested
  if (updates.new_password && updates.new_password.trim().length >= 3) {
    if (!updates.current_password || !authenticate(updates.current_password)) {
      return res.status(400).json({ error: 'Current password is required and must be correct to change passphrase.' });
    }
    setupPassword(updates.new_password.trim());
  }

  const updatedSettings = getAllSettings();
  delete updatedSettings.password_hash;
  res.json({ success: true, settings: updatedSettings });
});

module.exports = router;
