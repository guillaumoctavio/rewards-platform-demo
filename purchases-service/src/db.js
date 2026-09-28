const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchases (
      id SERIAL PRIMARY KEY,
      customer_id TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function insertPurchase({ customerId, amount }) {
  const { rows } = await pool.query(
    'INSERT INTO purchases (customer_id, amount) VALUES ($1, $2) RETURNING id, customer_id, amount, created_at',
    [customerId, amount]
  );
  return rows[0];
}

async function getPurchase(id) {
  const { rows } = await pool.query('SELECT * FROM purchases WHERE id = $1', [id]);
  return rows[0];
}

module.exports = { pool, ensureSchema, insertPurchase, getPurchase };
