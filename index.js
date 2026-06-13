const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('CREATE TABLE IF NOT EXISTS servers (name TEXT PRIMARY KEY, ip TEXT NOT NULL, port INTEGER NOT NULL, token TEXT NOT NULL, last_heartbeat BIGINT NOT NULL)').then(() => console.log('Database ready')).catch(console.error);

app.post('/register', async (req, res) => {
  const { name, ip, port, token } = req.body;
  if (!name || !ip || !port || !token) return res.status(400).json({ error: 'Missing fields' });
  if (!/^[a-z0-9-]{3,32}$/.test(name)) return res.status(400).json({ error: 'Invalid name' });
  try {
    const existing = await pool.query('SELECT token FROM servers WHERE name=$1', [name]);
    if (existing.rows.length > 0 && existing.rows[0].token !== token) return res.status(409).json({ error: 'Name taken' });
    await pool.query('INSERT INTO servers (name,ip,port,token,last_heartbeat) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (name) DO UPDATE SET ip=$2,port=$3,last_heartbeat=$5', [name, ip, port, token, Date.now()]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/resolve/:name', async (req, res) => {
  try {
    const result = await pool.query('SELECT ip, port, last_heartbeat FROM servers WHERE name=$1', [req.params.name]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (Date.now() - result.rows[0].last_heartbeat > 120000) return res.status(404).json({ error: 'Offline' });
    res.json({ ip: result.rows[0].ip, port: result.rows[0].port });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/heartbeat', async (req, res) => {
  const { name, token } = req.body;
  try {
    const r = await pool.query('UPDATE servers SET last_heartbeat=$1 WHERE name=$2 AND token=$3', [Date.now(), name, token]);
    if (r.rowCount === 0) return res.status(403).json({ error: 'Invalid' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('FriendConnect Registry running on port ' + PORT));
