'use strict';

const { createApp } = require('./app');
const { connectDatabase } = require('./database');

const app = createApp();
const port = process.env.PORT || 3001;

async function start() {
  try {
    await connectDatabase();

    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Chat backend is listening on port ${port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to start chat backend:', error);
    process.exit(1);
  }
}

start();

module.exports = {
  app,
  start,
};
