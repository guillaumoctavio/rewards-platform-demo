const db = require('./db');
const consumer = require('./consumer');

if (require.main === module) {
  db.ensureSchema()
    .then(() => consumer.start())
    .then(() => console.log('rewards-service consuming purchases'))
    .catch((err) => {
      console.error('failed to start', err);
      process.exit(1);
    });
}

module.exports = { start: consumer.start };
