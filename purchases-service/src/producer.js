const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'purchases-service', brokers: [process.env.KAFKA_BROKER] });
const producer = kafka.producer();

let connected = false;
async function connect() {
  if (!connected) {
    await producer.connect();
    connected = true;
  }
}

async function sendPurchaseCreated(purchase) {
  await connect();
  await producer.send({
    topic: 'purchases',
    messages: [{ value: JSON.stringify({ type: 'purchase.created', ...purchase }) }],
  });
}

module.exports = { producer, connect, sendPurchaseCreated };
