const express = require('express');
const db = require('./db');

const router = express.Router();

router.get('/health', (req, res) => res.sendStatus(200));

router.get('/deliveries/:customerId', async (req, res) => {
  const deliveries = await db.getDeliveriesByCustomer(req.params.customerId);
  res.json(deliveries);
});

module.exports = router;
