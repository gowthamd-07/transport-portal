const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/transport';

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') || connectionString.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
  max: process.env.VERCEL === '1' ? 1 : 10,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

const db = {
  query: (text, params) => pool.query(text, params),
  pool,
};

module.exports = db;
