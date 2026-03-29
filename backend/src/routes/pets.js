const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all pets
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pets ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new pet
router.post('/', async (req, res) => {
  const { name, species, emoji, feeding_interval_hours } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await pool.query(
      `INSERT INTO pets (name, species, emoji, feeding_interval_hours)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, species || null, emoji || '🐾', feeding_interval_hours || 8]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update pet
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, species, emoji, feeding_interval_hours } = req.body;
  try {
    const result = await pool.query(
      `UPDATE pets SET name=$1, species=$2, emoji=$3, feeding_interval_hours=$4
       WHERE id=$5 RETURNING *`,
      [name, species || null, emoji || '🐾', feeding_interval_hours || 8, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE pet
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM pets WHERE id=$1', [id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
