const crypto = require('crypto');
const { getSetting, setSetting, db } = require('./db');

const COOKIE_NAME = 'wedding_gantt_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Hash a passphrase using scrypt with random salt
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

// Verify passphrase against stored salt:hash
function verifyPassword(password, storedHash) {
  if (!storedHash || !password) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(key, 'hex'));
}

// Check if authentication has been configured
function isConfigured() {
  if (process.env.APP_PASSWORD && process.env.APP_PASSWORD.trim().length > 0) {
    return true;
  }
  const stored = getSetting('password_hash');
  return Boolean(stored && stored.length > 0);
}

// Verify given password against env var or database
function authenticate(password) {
  if (!password) return false;
  
  // 1. Check APP_PASSWORD env var if set
  if (process.env.APP_PASSWORD && process.env.APP_PASSWORD.trim().length > 0) {
    if (password === process.env.APP_PASSWORD.trim()) {
      return true;
    }
  }

  // 2. Check stored database password hash
  const stored = getSetting('password_hash');
  if (stored) {
    return verifyPassword(password, stored);
  }

  return false;
}

// Set up initial password
function setupPassword(password) {
  if (!password || password.length < 3) {
    throw new Error('Passphrase must be at least 3 characters.');
  }
  const hashed = hashPassword(password);
  setSetting('password_hash', hashed);
  return true;
}

// Create a session token
function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  const stmt = db.prepare('INSERT INTO sessions (token, created_at, expires_at) VALUES (?, ?, ?)');
  stmt.run(token, now, expiresAt);

  return { token, expiresAt };
}

// Verify a session token
function validateSession(token) {
  if (!token) return false;
  const now = Date.now();
  const row = db.prepare('SELECT expires_at FROM sessions WHERE token = ?').get(token);
  if (!row) return false;
  if (row.expires_at < now) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return false;
  }
  return true;
}

// Delete session
function destroySession(token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// Clean up expired sessions periodically
function cleanExpiredSessions() {
  try {
    const now = Date.now();
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  } catch (e) {
    console.error('Session cleanup error:', e.message);
  }
}
setInterval(cleanExpiredSessions, 1000 * 60 * 60); // Every hour

// Auth middleware for Express
function requireAuth(req, res, next) {
  // If no auth is configured anywhere, require setup first
  if (!isConfigured()) {
    return res.status(401).json({ error: 'Setup required', needsSetup: true });
  }

  // Check header or cookie
  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  }

  if (validateSession(token)) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized', authenticated: false });
}

module.exports = {
  COOKIE_NAME,
  SESSION_TTL_MS,
  isConfigured,
  authenticate,
  setupPassword,
  createSession,
  validateSession,
  destroySession,
  requireAuth
};
