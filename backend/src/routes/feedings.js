const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all feedings (last 100)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, p.name AS pet_name, p.emoji AS pet_emoji,
              m.name AS member_name
       FROM feedings f
       JOIN pets p ON f.pet_id = p.id
       LEFT JOIN family_members m ON f.member_id = m.id
       ORDER BY f.fed_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET feedings for a specific pet (last 20)
router.get('/pet/:petId', async (req, res) => {
  const { petId } = req.params;
  try {
    const result = await pool.query(
      `SELECT f.*, p.name AS pet_name, p.emoji AS pet_emoji,
              m.name AS member_name
       FROM feedings f
       JOIN pets p ON f.pet_id = p.id
       LEFT JOIN family_members m ON f.member_id = m.id
       WHERE f.pet_id = $1
       ORDER BY f.fed_at DESC
       LIMIT 20`,
      [petId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new feeding
router.post('/', async (req, res) => {
  const { pet_id, member_id, notes, event_type } = req.body;
  if (!pet_id) return res.status(400).json({ error: 'pet_id is required' });
  try {
    const result = await pool.query(
      `INSERT INTO feedings (pet_id, member_id, notes, event_type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [pet_id, member_id || null, notes || null, event_type || 'feeding']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE feeding
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM feedings WHERE id=$1', [id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
