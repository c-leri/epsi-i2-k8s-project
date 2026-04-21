const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'appdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: !!process.env.DB_USE_SSL ?? false,
});

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

      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) NOT NULL UNIQUE
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS ratings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          joke_id INTEGER NOT NULL REFERENCES jokes(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          CONSTRAINT unique_user_joke_rating UNIQUE (user_id, joke_id)
        );
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_ratings_joke_id ON ratings(joke_id);
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_ratings_updated_at ON ratings(updated_at DESC);
      `);

      const jokesCountResult = await pool.query('SELECT COUNT(*) FROM jokes');
      const jokesCount = parseInt(jokesCountResult.rows[0].count, 10);

      if (jokesCount === 0) {
        await pool.query(`
          INSERT INTO jokes (joke) VALUES
          ('Why do Java developers wear glasses? Because they don''t C#.'),
          ('A SQL query walks into a bar, walks up to two tables and asks... "Can I join you?"'),
          ('Why do programmers prefer dark mode? Because light attracts bugs.'),
          ('There are only 10 kinds of people: those who understand binary, and those who don''t.'),
          ('Why was the JavaScript developer sad? Because they didn''t Node how to Express themselves.'),
          ('How many programmers does it take to change a lightbulb? None — that''s a hardware problem.'),
          ('I would tell you a joke about UDP, but you might not get it.'),
          ('A programmer''s partner says: ''Go to the store, get a gallon of milk, and if they have eggs, get a dozen.'' They come home with 12 gallons of milk.'),
          ('I tried to come up with a joke about recursion, but it just kept going.'),
          ('Why was the developer unhappy at their job? They wanted arrays.'),
          ('What''s a computer''s favorite snack? Microchips.'),
          ('Why do programmers hate nature? Too many bugs and no stack trace.'),
          ('A QA engineer walks into a bar. Orders 0 beers. Orders 999999999 beers. Orders -1 beers. Orders null beers. Orders asdfjkl; beers.'),
          ('There''s no place like 127.0.0.1.');
        `);
        console.log('Database seeded with jokes.');
      }

      const usersCountResult = await pool.query('SELECT COUNT(*) FROM users');
      const usersCount = parseInt(usersCountResult.rows[0].count, 10);

      if (usersCount === 0) {
        await pool.query(`
          INSERT INTO users (username) VALUES
          ('hugo'),
          ('alice'),
          ('bob'),
          ('charlie'),
          ('diana'),
          ('eve');
        `);
        console.log('Database seeded with users.');
      }

      console.log('Database initialized.');
      return;
    } catch (err) {
      console.log(`Encounted error while connecting to DB: ${err}`);
      console.log(`DB not ready, retrying... (${retries} left)`);
      retries--;
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  throw new Error('Could not connect to database.');
}

app.get('/user/random', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username
      FROM users
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No users found' });
    }

    res.json({
      currentUser: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/joke', async (req, res) => {
  const userId = parseInt(req.query.userId, 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'A valid userId query parameter is required' });
  }

  try {
    const userCheck = await pool.query(
      'SELECT id, username FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const jokeResult = await pool.query(`
      SELECT id, joke
      FROM jokes
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (jokeResult.rows.length === 0) {
      return res.status(404).json({ error: 'No jokes found' });
    }

    const joke = jokeResult.rows[0];

    const ratingSummaryResult = await pool.query(`
      SELECT
        joke_id,
        ROUND(AVG(rating)::numeric, 2)::float8 AS average_rating,
        COUNT(*)::int AS rating_count
      FROM ratings
      WHERE joke_id = $1
      GROUP BY joke_id
    `, [joke.id]);

    const userRatingResult = await pool.query(`
      SELECT rating, created_at, updated_at
      FROM ratings
      WHERE user_id = $1 AND joke_id = $2
      LIMIT 1
    `, [userId, joke.id]);

    const ratingSummary = ratingSummaryResult.rows[0] || null;
    const userRating = userRatingResult.rows[0] || null;

    res.json({
      query: 'SELECT id, joke FROM jokes ORDER BY RANDOM() LIMIT 1',
      currentUser: userCheck.rows[0],
      result: {
        id: joke.id,
        joke: joke.joke,
        averageRating: ratingSummary ? ratingSummary.average_rating : null,
        ratingCount: ratingSummary ? ratingSummary.rating_count : 0,
        userRating: userRating ? userRating.rating : null,
        hasUserRated: !!userRating
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/ratings', async (req, res) => {
  const userId = parseInt(req.body.userId, 10);
  const jokeId = parseInt(req.body.jokeId, 10);
  const rating = parseInt(req.body.rating, 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'A valid userId is required' });
  }

  if (!Number.isInteger(jokeId) || jokeId <= 0) {
    return res.status(400).json({ error: 'A valid jokeId is required' });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }

  try {
    const userCheck = await pool.query(
      'SELECT id, username FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const jokeCheck = await pool.query(
      'SELECT id, joke FROM jokes WHERE id = $1',
      [jokeId]
    );

    if (jokeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Joke not found' });
    }

    const upsertResult = await pool.query(`
      INSERT INTO ratings (user_id, joke_id, rating)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, joke_id)
      DO UPDATE SET
        rating = EXCLUDED.rating,
        updated_at = NOW()
      RETURNING
        id,
        user_id,
        joke_id,
        rating,
        created_at,
        updated_at,
        CASE
          WHEN created_at = updated_at THEN 'insert'
          ELSE 'update'
        END AS action
    `, [userId, jokeId, rating]);

    const savedRating = upsertResult.rows[0];

    res.json({
      message: savedRating.action === 'insert' ? 'Rating created' : 'Rating updated',
      action: savedRating.action,
      rating: savedRating
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/ratings/recent', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        r.rating,
        r.created_at,
        r.updated_at,
        CASE
          WHEN r.created_at = r.updated_at THEN 'insert'
          ELSE 'update'
        END AS action,
        u.id AS user_id,
        u.username,
        j.id AS joke_id,
        j.joke
      FROM ratings r
      JOIN users u ON u.id = r.user_id
      JOIN jokes j ON j.id = r.joke_id
      ORDER BY r.updated_at DESC
      LIMIT 4
    `);

    res.json({
      items: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

initDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
