const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'rewards-service', brokers: [process.env.KAFKA_BROKER] });
const producer = kafka.producer();

let connectPromise = null;
function connect() {
  if (!connectPromise) connectPromise = producer.connect();
  return connectPromise;
}

async function sendRewardEvent(event) {
  await connect();
  await producer.send({ topic: 'rewards', messages: [{ value: JSON.stringify(event) }] });
}

module.exports = { producer, connect, sendRewardEvent };
