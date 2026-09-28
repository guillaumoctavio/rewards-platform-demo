const express = require('express');
const routes = require('./routes');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(routes);

if (require.main === module) {
  const port = process.env.PORT || 3000;
  db.ensureSchema()
    .then(() => app.listen(port, () => console.log(`purchases-service listening on ${port}`)))
    .catch((err) => {
      console.error('failed to start', err);
      process.exit(1);
    });
}

module.exports = app;
