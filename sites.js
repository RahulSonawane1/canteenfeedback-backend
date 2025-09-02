import express from 'express';
import mysql from 'mysql2/promise';
const router = express.Router();

// Get all sites with location, branch_location, created_at, and id
router.get('/', async (req, res) => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    const [rows] = await conn.execute('SELECT id, location, branch_location, created_at FROM sites');
    await conn.end();
    res.json({ sites: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Add a new site with location, branch_location, and created_at
router.post('/', async (req, res) => {
  const { location, branch_location } = req.body;
  if (!location || !branch_location) return res.status(400).json({ error: 'Missing fields' });
  let conn;
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    await conn.execute('INSERT INTO sites (location, branch_location, created_at) VALUES (?, ?, NOW())', [location, branch_location]);

    // Get an existing site (other than the new one)
    const [existingSites] = await conn.execute('SELECT location FROM sites WHERE location != ? LIMIT 1', [location]);
    if (existingSites.length > 0) {
      const existingSite = existingSites[0].location;
      // Copy questions from existing site
      const [questions] = await conn.execute('SELECT question_text, emoji FROM questions WHERE site = ?', [existingSite]);
      for (const q of questions) {
        await conn.execute('INSERT INTO questions (site, question_text, emoji) VALUES (?, ?, ?)', [location, q.question_text, q.emoji || null]);
      }
    }

    await conn.end();
    res.json({ success: true });
  } catch (err) {
    if (conn) await conn.end();
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Update a site (by id)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { location, branch_location } = req.body;
  if (!location || !branch_location) return res.status(400).json({ error: 'Missing fields' });
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    await conn.execute('UPDATE sites SET location = ?, branch_location = ? WHERE id = ?', [location, branch_location, id]);
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Delete a site (by id)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    await conn.execute('DELETE FROM sites WHERE id = ?', [id]);
    await conn.end();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;
