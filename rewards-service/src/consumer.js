const { Kafka } = require('kafkajs');
const { isEligible } = require('./rules');
const db = require('./db');
const { sendRewardEvent } = require('./producer');

const kafka = new Kafka({ clientId: 'rewards-service', brokers: [process.env.KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: 'rewards-service' });

async function handleMessage({ message }) {
  const event = JSON.parse(message.value.toString());
  if (event.type !== 'purchase.created') return;

  const eligible = isEligible(event.amount);
  const reward = {
    purchaseId: event.purchaseId,
    customerId: event.customerId,
    rewardType: eligible ? 'cashback_5pct' : null,
    status: eligible ? 'issued' : 'denied',
  };

  await db.insertReward(reward);
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
