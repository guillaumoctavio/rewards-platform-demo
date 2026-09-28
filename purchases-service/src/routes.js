const express = require('express');
const db = require('./db');
const producer = require('./producer');

const router = express.Router();

router.post('/purchases', async (req, res) => {
  const { customerId, amount } = req.body;
  if (!customerId || typeof amount !== 'number') {
    return res.status(400).json({ error: 'customerId and numeric amount are required' });
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
  const purchase = await db.getPurchase(req.params.id);
  if (!purchase) return res.status(404).json({ error: 'not found' });
  res.json(purchase);
});

module.exports = router;
