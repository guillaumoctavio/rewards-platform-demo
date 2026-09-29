const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rewards (
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER NOT NULL,
      customer_id TEXT NOT NULL,
      reward_type TEXT,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function insertReward({ purchaseId, customerId, rewardType, status }) {
  const { rows } = await pool.query(
    'INSERT INTO rewards (purchase_id, customer_id, reward_type, status) VALUES ($1, $2, $3, $4) RETURNING *',
    [purchaseId, customerId, rewardType, status]
  );
  return rows[0];
}

module.exports = { pool, ensureSchema, insertReward };
