jest.mock('../src/db');
jest.mock('../src/producer');

const request = require('supertest');
const db = require('../src/db');
const producer = require('../src/producer');
const app = require('../src/index');

describe('POST /purchases', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a purchase and publishes purchase.created', async () => {
    db.insertPurchase.mockResolvedValue({
      id: 1,
      customer_id: 'c1',
      amount: '80',
      created_at: '2024-01-01T00:00:00.000Z',
    });
    producer.sendPurchaseCreated.mockResolvedValue();

    const res = await request(app)
      .post('/purchases')
      .send({ customerId: 'c1', amount: 80 });

    expect(res.status).toBe(201);
    expect(producer.sendPurchaseCreated).toHaveBeenCalledWith({
      purchaseId: 1,
      customerId: 'c1',
      amount: 80,
    });
  });

  it('rejects a request without amount', async () => {
    const res = await request(app).post('/purchases').send({ customerId: 'c1' });
    expect(res.status).toBe(400);
    expect(producer.sendPurchaseCreated).not.toHaveBeenCalled();
  });
});

describe('GET /purchases/:id', () => {
  it('returns the purchase when found', async () => {
    db.getPurchase.mockResolvedValue({ id: 1, customer_id: 'c1', amount: '80' });
    const res = await request(app).get('/purchases/1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, customer_id: 'c1', amount: '80' });
  });

  it('returns 404 when not found', async () => {
    db.getPurchase.mockResolvedValue(undefined);
    const res = await request(app).get('/purchases/999');
    expect(res.status).toBe(404);
  });
});
