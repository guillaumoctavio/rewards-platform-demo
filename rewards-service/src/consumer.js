const { Kafka } = require('kafkajs');
const { isEligible } = require('./rules');
const db = require('./db');
const { sendRewardEvent } = require('./producer');

const kafka = new Kafka({ clientId: 'rewards-service', brokers: [process.env.KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: 'rewards-service' });

async function handleMessage({ message }) {
  let event;
  try {
    event = JSON.parse(message.value.toString());
  } catch (err) {
    console.error('skipping unparseable message', err);
    return;
  }
  if (event.type !== 'purchase.created') return;

  const eligible = isEligible(event.amount);
  const reward = {
    purchaseId: event.purchaseId,
    customerId: event.customerId,
    rewardType: eligible ? 'cashback_5pct' : null,
    status: eligible ? 'issued' : 'denied',
  };

  const inserted = await db.insertReward(reward);
  if (!inserted) return; // already processed this purchaseId

  await sendRewardEvent({
    type: eligible ? 'reward.issued' : 'reward.denied',
    purchaseId: reward.purchaseId,
    customerId: reward.customerId,
    rewardType: reward.rewardType,
  });
}

async function start() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'purchases', fromBeginning: true });
  await consumer.run({ eachMessage: handleMessage });
}

module.exports = { start, handleMessage };
