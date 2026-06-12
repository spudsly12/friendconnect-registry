const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create table on startup
pool.query(`
  CREATE TABLE IF NOT EXISTS servers (
    name TEXT PRIMARY KEY,
    ip TEXT NOT NULL,
    port INTEGER NOT NULL,
    token TEXT NOT NULL,
    last_heartbeat BIGINT NOT NULL
  )
`);

// Register or update a server name
app.post('/register', async (req, res) => {
  const { name, ip, port, token } = req.body;
  if (!name || !ip || !port || !token) 
    return res.status(400).json({ error: 'Missing fields' });
  
  // Name can only contain letters, numbers, hyphens
  if (!/^[a-z0-9-]{3,32}$/.test(name))
    return res.status(400).json({ error: 'Invalid name format' });

  try {
    const existing = await pool.query('SELECT * FROM servers WHERE name=$1', [name]);
    if (existing.rows.length > 0 && existing.rows[0].token !== token)
      return res.status(409).json({ error: 'Name already taken' });

    await pool.query(`
      INSERT INTO servers (name, ip, port, token, last_heartbeat)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (name) DO UPDATE
        SET ip=$2, port=$3, last_heartbeat=$5
    `, [name, ip, port, token, Date.now()]);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Resolve a name to an IP
app.get('/resolve/:name', async (req, res) => {
  try {
    const result = await pool.query('SELECT ip, port FROM servers WHERE name=$1', [req.params.name]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Name not found' });

    const server = result.rows[0];
    // Consider server dead if no heartbeat in 2 minutes
    if (Date.now() - server.last_heartbeat > 120000)
      return res.status(404).json({ error: 'Server is offline' });

    res.json({ ip: server.ip, port: server.port });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Heartbeat to keep name alive
app.post('/heartbeat', async (req, res) => {
  const { name, token } = req.body;
  try {
    const result = await pool.query(
      'UPDATE servers SET last_heartbeat=$1 WHERE name=$2 AND token=$3',
      [Date.now(), name, token]
    );
    if (result.rowCount === 0)
      return res.status(403).json({ error: 'Invalid name or token' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FriendConnect Registry running on port ${PORT}`));const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create table on startup
pool.query(`
  CREATE TABLE IF NOT EXISTS servers (
    name TEXT PRIMARY KEY,
    ip TEXT NOT NULL,
    port INTEGER NOT NULL,
    token TEXT NOT NULL,
    last_heartbeat BIGINT NOT NULL
  )
`);

// Register or update a server name
app.post('/register', async (req, res) => {
  const { name, ip, port, token } = req.body;
  if (!name || !ip || !port || !token) 
    return res.status(400).json({ error: 'Missing fields' });
  
  // Name can only contain letters, numbers, hyphens
  if (!/^[a-z0-9-]{3,32}$/.test(name))
    return res.status(400).json({ error: 'Invalid name format' });

  try {
    const existing = await pool.query('SELECT * FROM servers WHERE name=$1', [name]);
    if (existing.rows.length > 0 && existing.rows[0].token !== token)
      return res.status(409).json({ error: 'Name already taken' });

    await pool.query(`
      INSERT INTO servers (name, ip, port, token, last_heartbeat)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (name) DO UPDATE
        SET ip=$2, port=$3, last_heartbeat=$5
    `, [name, ip, port, token, Date.now()]);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Resolve a name to an IP
app.get('/resolve/:name', async (req, res) => {
  try {
    const result = await pool.query('SELECT ip, port FROM servers WHERE name=$1', [req.params.name]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Name not found' });

    const server = result.rows[0];
    // Consider server dead if no heartbeat in 2 minutes
    if (Date.now() - server.last_heartbeat > 120000)
      return res.status(404).json({ error: 'Server is offline' });

    res.json({ ip: server.ip, port: server.port });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Heartbeat to keep name alive
app.post('/heartbeat', async (req, res) => {
  const { name, token } = req.body;
  try {
    const result = await pool.query(
      'UPDATE servers SET last_heartbeat=$1 WHERE name=$2 AND token=$3',
      [Date.now(), name, token]
    );
    if (result.rowCount === 0)
      return res.status(403).json({ error: 'Invalid name or token' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FriendConnect Registry running on port ${PORT}`));
