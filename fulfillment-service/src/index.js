const express = require('express');
const routes = require('./routes');
const db = require('./db');
const consumer = require('./consumer');

const app = express();
app.use(routes);
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  db.ensureSchema()
    .then(() => consumer.start())
    .then(() => app.listen(port, () => console.log(`fulfillment-service listening on ${port}`)))
    .catch((err) => {
      console.error('failed to start', err);
      process.exit(1);
    });
}

module.exports = app;
