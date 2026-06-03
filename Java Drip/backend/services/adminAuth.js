const {
  createSignedToken,
  getBearerToken,
  hashPassword,
  verifyPassword,
  verifySignedToken,
} = require('./tokenAuth');

const DEFAULT_SESSION_SECRET = 'java-drip-admin-session-secret';

function getConfiguredAdminName() {
  return String(process.env.ADMIN_BOOTSTRAP_NAME || 'Java Drip Admin').trim();
}

function getConfiguredAdminEmail() {
  const email = String(process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
  return email || null;
}

function getConfiguredAdminPassword() {
  const password = String(process.env.ADMIN_BOOTSTRAP_PASSWORD || '');
  return password || null;
}

function getSessionSecret() {
  const secret = String(process.env.ADMIN_SESSION_SECRET || '').trim();
  return secret || null;
}

function isAdminSessionConfigured() {
  const secret = getSessionSecret();
  return Boolean(secret && secret !== DEFAULT_SESSION_SECRET);
}

function isBootstrapAdminConfigured() {
  return Boolean(getConfiguredAdminEmail() && getConfiguredAdminPassword());
}

function getAdminAuthStatus() {
  return {
    sessionConfigured: isAdminSessionConfigured(),
    bootstrapConfigured: isBootstrapAdminConfigured(),
    usingDefaultBootstrapPassword: !getConfiguredAdminPassword(),
  };
}

function sanitizeAdminUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: Boolean(user.active),
  };
}

function createAdminToken(user) {
  const sessionSecret = getSessionSecret();

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 12),
  };

  return createSignedToken(payload, sessionSecret);
}

function verifyAdminToken(token) {
  const payload = verifySignedToken(token, getSessionSecret());
  if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function requireAdmin(req, res, next) {
  if (!isAdminSessionConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Admin authentication is not configured on the server yet.',
    });
  }

  const token = getBearerToken(req);
  const payload = verifyAdminToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, message: 'Admin authentication required.' });
  }

  req.admin = payload;
  next();
}

function ensureBootstrapAdmin(db) {
  if (!isBootstrapAdminConfigured()) return;

  const adminEmail = getConfiguredAdminEmail();
  const adminPassword = getConfiguredAdminPassword();
  const adminName = getConfiguredAdminName();

  const existing = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(adminEmail);
  if (existing) return;

  db.prepare(`
    INSERT INTO admin_users (name, email, password_hash, role, active)
    VALUES (?, ?, ?, 'manager', 1)
  `).run(
    adminName,
    adminEmail,
    hashPassword(adminPassword)
  );
}

function usesDefaultBootstrapPassword() {
  return !getConfiguredAdminPassword();
}

module.exports = {
  createAdminToken,
  ensureBootstrapAdmin,
  getAdminAuthStatus,
  hashPassword,
  isAdminSessionConfigured,
  requireAdmin,
  sanitizeAdminUser,
  usesDefaultBootstrapPassword,
  verifyAdminToken,
  verifyPassword,
};
