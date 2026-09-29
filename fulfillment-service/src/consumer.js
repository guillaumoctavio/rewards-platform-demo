const { Kafka } = require('kafkajs');
const db = require('./db');

const kafka = new Kafka({ clientId: 'fulfillment-service', brokers: [process.env.KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: 'fulfillment-service' });

async function handleMessage({ message }) {
  const event = JSON.parse(message.value.toString());
  if (event.type !== 'reward.issued') return;

  await db.insertDelivery({
    purchaseId: event.purchaseId,
    customerId: event.customerId,
    rewardType: event.rewardType,
  });
}

async function start() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'rewards', fromBeginning: true });
  await consumer.run({ eachMessage: handleMessage });
}

module.exports = { start, handleMessage };
