require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { authenticate } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trips');
const masterRoutes = require('./routes/masters');
const downloadRoutes = require('./routes/downloads');
const userRoutes = require('./routes/users');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:80', 'http://localhost'];

if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}
if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
}

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.disable('x-powered-by');

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', app: 'TransFleet Pro', timestamp: new Date().toISOString() });
  } catch (_err) {
    console.error('Health check db error:', _err);
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/trips', authenticate, tripRoutes);
app.use('/api/masters', authenticate, masterRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/users', userRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

if (process.env.VERCEL !== '1') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`TransFleet Pro API running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  function shutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      try { await db.pool.end(); } catch (_e) { /* ignore */ }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
