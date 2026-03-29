const express = require('express');
const cors = require('cors');
const pool = require('./db');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/pets', require('./routes/pets'));
app.use('/api/members', require('./routes/members'));
app.use('/api/feedings', require('./routes/feedings'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function initDb() {
  const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
  await pool.query(sql);
  console.log('Database initialized');
}

async function start() {
  let retries = 10;
  while (retries > 0) {
    try {
      await initDb();
      break;
    } catch (err) {
      retries--;
      console.log(`DB not ready, retrying... (${retries} left): ${err.message}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  app.listen(PORT, () => {
    console.log(`Pet Tracker API listening on port ${PORT}`);
  });
}

start();
