const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'purchases-service', brokers: [process.env.KAFKA_BROKER] });
const producer = kafka.producer();

let connectPromise = null;
function connect() {
  if (!connectPromise) connectPromise = producer.connect();
  return connectPromise;
}

async function sendPurchaseCreated(purchase) {
  await connect();
  await producer.send({
    topic: 'purchases',
    messages: [{ value: JSON.stringify({ type: 'purchase.created', ...purchase }) }],
  });
}

module.exports = { producer, connect, sendPurchaseCreated };
