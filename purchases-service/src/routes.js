const express = require('express');
const db = require('./db');
const producer = require('./producer');

const router = express.Router();

router.get('/health', (req, res) => res.sendStatus(200));

router.post('/purchases', async (req, res) => {
  const { customerId, amount } = req.body;
  if (typeof customerId !== 'string' || !customerId || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'customerId (string) and amount (positive number) are required' });
  }

  const purchase = await db.insertPurchase({ customerId, amount });
  await producer.sendPurchaseCreated({
    purchaseId: purchase.id,
    customerId: purchase.customer_id,
    amount: Number(purchase.amount),
  });

  res.status(201).json(purchase);
});

router.get('/purchases/:id', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  const purchase = await db.getPurchase(req.params.id);
  if (!purchase) return res.status(404).json({ error: 'not found' });
  res.json(purchase);
});

module.exports = router;
