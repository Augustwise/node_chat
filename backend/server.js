'use strict';

const express = require('express');

const app = express();
const port = process.env.PORT || 3001;
const usernames = new Map();

app.use(express.json());

app.post('/api/login', (req, res) => {
  const username = String(req.body.username || '').trim();

  if (!username) {
    return res.status(400).json({
      message: 'Username is required.',
    });
  }

  const usernameKey = username.toLowerCase();

  if (usernames.has(usernameKey)) {
    return res.status(409).json({
      message: 'That name is already in use. Try another.',
    });
  }

  usernames.set(usernameKey, username);

  return res.status(201).json({ username });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Chat backend is listening on port ${port}`);
});
