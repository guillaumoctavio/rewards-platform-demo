jest.mock('../src/db');

const request = require('supertest');
const db = require('../src/db');
const app = require('../src/index');

describe('GET /deliveries/:customerId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the deliveries for a customer', async () => {
    db.getDeliveriesByCustomer.mockResolvedValue([
      { id: 1, customer_id: 'c1', reward_type: 'cashback_5pct' },
    ]);

    const res = await request(app).get('/deliveries/c1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, customer_id: 'c1', reward_type: 'cashback_5pct' }]);
  });

  it('returns an empty array when there are none', async () => {
    db.getDeliveriesByCustomer.mockResolvedValue([]);

    const res = await request(app).get('/deliveries/c2');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
