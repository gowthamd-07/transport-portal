const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../database');
const { authenticate, adminOnly } = require('../middleware/auth');

router.use(authenticate);
router.use(adminOnly);

router.get('/', async (req, res) => {
  try {
    const users = await db.query('SELECT id, username, full_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json(users.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, password, full_name, email, role } = req.body;
    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'Username, password, and full name are required' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = await db.query(
      'INSERT INTO users (username, password, full_name, email, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, email, role, is_active, created_at',
      [username, hash, full_name, email || '', role || 'user']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.message.includes('unique constraint') || err.message.includes('duplicate key')) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

const VALID_ROLES = ['admin', 'user'];

router.put('/:id', async (req, res) => {
  try {
    const targetResult = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const target = targetResult.rows[0];
    if (!target) return res.status(404).json({ error: 'User not found' });

    const { full_name, email, role, is_active, password } = req.body;

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
    }
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const updates = [];
    const vals = [];
    let idx = 1;
    if (full_name) { updates.push(`full_name = $${idx++}`); vals.push(full_name); }
    if (email !== undefined) { updates.push(`email = $${idx++}`); vals.push(email); }
    if (role) { updates.push(`role = $${idx++}`); vals.push(role); }
    if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); vals.push(is_active ? 1 : 0); }
    if (password) { updates.push(`password = $${idx++}`); vals.push(bcrypt.hashSync(password, 10)); }

    if (updates.length > 0) {
      vals.push(req.params.id);
      await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, vals);
    }

    const updated = await db.query('SELECT id, username, full_name, email, role, is_active, created_at FROM users WHERE id = $1', [req.params.id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const targetResult = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (targetResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    await db.query('UPDATE users SET is_active = 0 WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
