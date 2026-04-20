const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'appdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Wait for DB to be ready, then seed
async function initDB() {
  let retries = 10;
  while (retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS jokes (
          id SERIAL PRIMARY KEY,
          joke TEXT NOT NULL
        );
      `);

      const { rows } = await pool.query('SELECT COUNT(*) FROM jokes');
      if (parseInt(rows[0].count) === 0) {
        await pool.query(`
          INSERT INTO jokes (joke) VALUES
          ('Why do Java developers wear glasses? Because they don''t C#.'),
          ('A SQL query walks into a bar, walks up to two tables and asks... "Can I join you?"'),
          ('Why do programmers prefer dark mode? Because light attracts bugs.'),
          ('There are only 10 kinds of people: those who understand binary, and those who don''t.'),
          ('Why was the JavaScript developer sad? Because they didn''t Node how to Express themselves.'),
          ('How many programmers does it take to change a lightbulb? None — that''s a hardware problem.'),
          ('Why did the developer go broke? Because he used up all his cache.'),
          ('I would tell you a joke about UDP, but you might not get it.'),
          ('A byte walks into a bar looking pale. The bartender asks: "What''s wrong?" The byte says: "I''ve got a bit flip."'),
          ('Why do Agile developers never look out the window? Because then they''d have nothing to do in the afternoon.');
        `);
        console.log('Database seeded with jokes.');
      }

      console.log('Database initialized.');
      return;
    } catch (err) {
      console.log(`DB not ready, retrying... (${retries} left)`);
      retries--;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('Could not connect to database.');
}

app.get('/joke', async (req, res) => {
  const query = 'SELECT * FROM jokes ORDER BY RANDOM() LIMIT 1';
  try {
    const result = await pool.query(query);
    res.json({
      query,
      result: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

initDB().then(() => {
  app.listen(3001, () => console.log('Backend running on port 3001'));
}).catch(err => {
  console.error(err);
  process.exit(1);
});
