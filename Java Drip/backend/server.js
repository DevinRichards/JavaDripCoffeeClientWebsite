require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { clerkMiddleware } = require('@clerk/express');

const { initializeDatabase } = require('./db/database');
const { getAdminAuthStatus, isAdminSessionConfigured } = require('./services/adminAuth');
const { createRateLimiter, parseAllowedOrigins, securityHeaders } = require('./middleware/security');

const app  = express();
const PORT = process.env.PORT || 3201;
const allowedOrigins = parseAllowedOrigins(process.env.FRONTEND_URL);

function parseTrustProxySetting(value) {
  if (value === undefined || value === null || value === '') return false;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  const numeric = Number(normalized);
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : false;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

app.set('trust proxy', parseTrustProxySetting(process.env.TRUST_PROXY));
function getRequestOrigin(req) {
  const protocol = req.protocol || 'https';
  const host = req.get('host');
  return host ? `${protocol}://${host}` : '';
}

function corsMiddleware(req, res, next) {
  return cors({
    origin(origin, callback) {
      const requestOrigin = getRequestOrigin(req);
      if (!origin || origin === requestOrigin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin is not allowed by CORS.'));
    },
    credentials: true,
  })(req, res, next);
}

app.use('/api', corsMiddleware);
app.use(securityHeaders);
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));
app.use('/api', createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'The server is receiving too many requests from this connection. Please try again shortly.',
  skip: (req) => req.method === 'OPTIONS',
}));

if (process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY) {
  app.use('/api', clerkMiddleware());
}

// ─── Database ────────────────────────────────────────────────────────────────

initializeDatabase();

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/menu',    require('./routes/menu'));
app.use('/api/orders',  require('./routes/orders'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/customer', require('./routes/auth'));
app.use('/api/payments', require('./routes/payments'));

// Health check
app.get('/api/health', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.json({
      status: 'ok',
      message: '☕ Java Drip API is running',
    });
  }

  const adminAuth = getAdminAuthStatus();

  return res.json({
    status: 'ok',
    message: '☕ Java Drip API is running',
    auth: {
      clerkConfigured: Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY),
      adminSessionConfigured: adminAuth.sessionConfigured,
      adminBootstrapConfigured: adminAuth.bootstrapConfigured,
      adminUsingDefaultBootstrapPassword: adminAuth.usingDefaultBootstrapPassword,
    },
    payments: {
      squareConfigured: Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID),
      squareEnvironment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
    }
  });
});

// ─── Production static serving ───────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`☕ Java Drip API running on http://localhost:${PORT}`);
  if (!isAdminSessionConfigured()) {
    console.warn('⚠️  Admin auth session secret is not configured. Staff login is disabled until ADMIN_SESSION_SECRET is set.');
  }
  if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) {
    console.warn('⚠️  Clerk auth is not configured. Customer social sign-in is disabled until Clerk keys are set.');
  }
  if (process.env.NODE_ENV === 'production') {
    console.log(`   Serving frontend from ./frontend/dist`);
  }
});
