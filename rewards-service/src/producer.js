const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'rewards-service', brokers: [process.env.KAFKA_BROKER] });
const producer = kafka.producer();

let connected = false;
async function connect() {
  if (!connected) {
    await producer.connect();
    connected = true;
  }
}

async function sendRewardEvent(event) {
  await connect();
  await producer.send({ topic: 'rewards', messages: [{ value: JSON.stringify(event) }] });
}

module.exports = { producer, connect, sendRewardEvent };
