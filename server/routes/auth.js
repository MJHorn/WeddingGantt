const express = require('express');
const {
  isConfigured,
  authenticate,
  setupPassword,
  createSession,
  validateSession,
  destroySession,
  COOKIE_NAME,
  SESSION_TTL_MS
} = require('../auth');

const router = express.Router();

// Get auth status
router.get('/status', (req, res) => {
  const configured = isConfigured();
  let authenticated = false;

  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  }

  if (token && validateSession(token)) {
    authenticated = true;
  }

  res.json({
    configured,
    authenticated
  });
});

// Setup initial password
router.post('/setup', (req, res) => {
  if (isConfigured()) {
    return res.status(400).json({ error: 'App passphrase has already been configured.' });
  }

  const { password } = req.body;
  if (!password || password.trim().length < 3) {
    return res.status(400).json({ error: 'Passphrase must be at least 3 characters long.' });
  }

  try {
    setupPassword(password.trim());
    const session = createSession();

    res.cookie(COOKIE_NAME, session.token, {
      maxAge: SESSION_TTL_MS,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    res.json({
      success: true,
      token: session.token,
      expiresAt: session.expiresAt
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Please enter your wedding passphrase.' });
  }

  const isValid = authenticate(password.trim());
  if (!isValid) {
    return res.status(401).json({ error: 'Incorrect passphrase. Please try again.' });
  }

  const session = createSession();

  res.cookie(COOKIE_NAME, session.token, {
    maxAge: SESSION_TTL_MS,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  res.json({
    success: true,
    token: session.token,
    expiresAt: session.expiresAt
  });
});

// Logout
router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  }

  if (token) {
    destroySession(token);
  }

  res.clearCookie(COOKIE_NAME);
  res.json({ success: true });
});

module.exports = router;
