const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
  CREATE TABLE IF NOT EXISTS servers (
    name TEXT PRIMARY KEY,
    ip TEXT NOT NULL,
    port INTEGER NOT NULL,
    token TEXT NOT NULL,
    last_heartbeat BIGINT NOT NULL
  )
`).then(() => console.log('Database ready'));

app.post('/register', async (req, res) => {
  const { name, ip, port, token } = req.body;
  if (!name || !ip || !port || !token)
    return res.status(400).json({ error: 'Missing fields' });
  if (!/^[a-z0-9-]{3,32}$/.test(name))
    return res.status(400).json({ error: 'Invalid name format' });
  try {
    const existing = await pool.query('SELECT token FROM servers WHERE name=$1', [name]);
    if (existing.rows.length > 0 && existing.rows[0].token !== token)
      return res.status(409).json({ error: 'Name already taken' });
    await pool.query(`
      INSERT INTO servers (name, ip, port, token, last_heartbeat)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (name) DO UPDATE SET ip=$2, port=$3, last_heartbeat=$5
    `, [name, ip, port, token, Date.now()]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/resolve/:name', async (req, res) => {
  try {
    const result = await pool.query('SELECT ip, port, last_heartbeat FROM servers WHERE name=$1', [req.params.name]);
    if (result.rows.length === 0)
      return
