const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER NOT NULL,
      customer_id TEXT NOT NULL,
      reward_type TEXT NOT NULL,
      delivered_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function insertDelivery({ purchaseId, customerId, rewardType }) {
  const { rows } = await pool.query(
    'INSERT INTO deliveries (purchase_id, customer_id, reward_type) VALUES ($1, $2, $3) RETURNING *',
    [purchaseId, customerId, rewardType]
  );
  return rows[0];
}

async function getDeliveriesByCustomer(customerId) {
  const { rows } = await pool.query(
    'SELECT * FROM deliveries WHERE customer_id = $1 ORDER BY delivered_at DESC',
    [customerId]
  );
  return rows;
}

module.exports = { pool, ensureSchema, insertDelivery, getDeliveriesByCustomer };
