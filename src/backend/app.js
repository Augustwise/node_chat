'use strict';

const express = require('express');
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const messageRoutes = require('./routes/messageRoutes');
const errorHandler = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/api', authRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/rooms/:roomName/messages', messageRoutes);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
