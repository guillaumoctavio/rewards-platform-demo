process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://postgres:demo@localhost:5433/rewards_demo';

const db = require('../../src/db');

describe('db (integration, requires Postgres via docker compose up -d postgres)', () => {
  beforeAll(() => db.ensureSchema());

  afterAll(async () => {
    await db.pool.query("DELETE FROM deliveries WHERE customer_id = 'integration-test'");
    await db.pool.end();
  });

  it('persists and retrieves a delivery', async () => {
    await db.insertDelivery({
      purchaseId: 999,
      customerId: 'integration-test',
      rewardType: 'cashback_5pct',
    });

    const deliveries = await db.getDeliveriesByCustomer('integration-test');

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({
      purchase_id: 999,
      customer_id: 'integration-test',
      reward_type: 'cashback_5pct',
    });
  });
});
