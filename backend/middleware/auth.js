const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'transfleet-pro-secret-key-2026';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[WARN] JWT_SECRET not set. Using default — this is insecure in production.');
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await db.query(
      'SELECT id, username, full_name, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    const user = result.rows[0];
    
    if (!user || user.is_active !== 1) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { generateToken, authenticate, adminOnly, JWT_SECRET };
