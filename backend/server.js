'use strict';

const express = require('express');

const app = express();
const port = process.env.PORT || 3001;
const usernames = new Map();
const rooms = new Map();
let nextMessageId = 1;

app.use(express.json());

function normalizeRoomName(value) {
  return String(value || '')
    .trim()
    .replace(/^#+/, '')
    .trim();
}

function getRoomKey(name) {
  return name.toLowerCase();
}

function formatMessageTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

function serializeRoom(room) {
  const lastMessage = room.messages[room.messages.length - 1];

  return {
    name: room.name,
    members: room.members.size,
    preview: lastMessage ? `${lastMessage.author}: ${lastMessage.body}` : '',
    time: lastMessage ? lastMessage.time : '',
    unread: 0,
    joined: true,
  };
}

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

app.get('/api/rooms', (req, res) => {
  return res.json([...rooms.values()].map(serializeRoom));
});

app.post('/api/rooms', (req, res) => {
  const name = normalizeRoomName(req.body.name);
  const username = String(req.body.username || '').trim();

  if (!name) {
    return res.status(400).json({
      message: 'Room name is required.',
    });
  }

  const roomKey = getRoomKey(name);

  if (rooms.has(roomKey)) {
    return res.status(409).json({
      message: 'A room with that name already exists.',
    });
  }

  const room = {
    name,
    members: new Set(username ? [username] : []),
    messages: [],
  };

  rooms.set(roomKey, room);

  return res.status(201).json(serializeRoom(room));
});

app.delete('/api/rooms/:roomName', (req, res) => {
  const name = normalizeRoomName(req.params.roomName);
  const roomKey = getRoomKey(name);

  if (!rooms.has(roomKey)) {
    return res.status(404).json({
      message: 'Room not found.',
    });
  }

  rooms.delete(roomKey);

  return res.status(204).send();
});

app.get('/api/rooms/:roomName/messages', (req, res) => {
  const name = normalizeRoomName(req.params.roomName);
  const room = rooms.get(getRoomKey(name));

  if (!room) {
    return res.status(404).json({
      message: 'Room not found.',
    });
  }

  return res.json(room.messages);
});

app.post('/api/rooms/:roomName/messages', (req, res) => {
  const name = normalizeRoomName(req.params.roomName);
  const room = rooms.get(getRoomKey(name));
  const author = String(req.body.author || '').trim();
  const body = String(req.body.body || '').trim();

  if (!room) {
    return res.status(404).json({
      message: 'Room not found.',
    });
  }

  if (!author) {
    return res.status(400).json({
      message: 'Message author is required.',
    });
  }

  if (!body) {
    return res.status(400).json({
      message: 'Message text is required.',
    });
  }

  room.members.add(author);

  const message = {
    id: nextMessageId,
    author,
    time: formatMessageTime(new Date()),
    body,
  };

  nextMessageId += 1;
  room.messages.push(message);

  return res.status(201).json(message);
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Chat backend is listening on port ${port}`);
});
