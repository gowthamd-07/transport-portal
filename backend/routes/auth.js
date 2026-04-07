const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../database');
const { generateToken, authenticate } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.is_active !== 1) {
      return res.status(403).json({ error: 'Account is deactivated. Contact administrator.' });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { full_name, email, current_password, new_password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    if (new_password) {
      if (!current_password || !bcrypt.compareSync(current_password, user.password)) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      const hash = bcrypt.hashSync(new_password, 10);
      await db.query('UPDATE users SET password = $1 WHERE id = $2', [hash, req.user.id]);
    }

    if (full_name) await db.query('UPDATE users SET full_name = $1 WHERE id = $2', [full_name, req.user.id]);
    if (email !== undefined) await db.query('UPDATE users SET email = $1 WHERE id = $2', [email, req.user.id]);

    const updatedResult = await db.query('SELECT id, username, full_name, email, role, is_active FROM users WHERE id = $1', [req.user.id]);
    res.json(updatedResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
