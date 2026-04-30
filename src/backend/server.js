'use strict';

const express = require('express');
const { UniqueConstraintError } = require('sequelize');
const { connectDatabase, User, Room, Message } = require('./database');

const app = express();
const port = process.env.PORT || 3001;

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

function getUsernameKey(username) {
  return username.toLowerCase();
}

function formatMessageTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

function serializeMessage(message) {
  return {
    id: message.id,
    author: message.author.username,
    time: formatMessageTime(message.createdAt),
    body: message.body,
  };
}

async function findOrCreateUser(username) {
  const usernameKey = getUsernameKey(username);
  const [user] = await User.findOrCreate({
    where: { usernameKey },
    defaults: { username, usernameKey },
  });

  return user;
}

async function findRoomByName(name) {
  return Room.findOne({
    where: {
      roomKey: getRoomKey(name),
    },
  });
}

function getRequestUsername(req) {
  return String(req.body.username || '').trim();
}

function isRoomCreator(room, username) {
  return Boolean(
    username &&
      room.creatorUsernameKey &&
      room.creatorUsernameKey === getUsernameKey(username),
  );
}

function sendRoomCreatorRequired(res) {
  return res.status(403).json({
    message: 'Only the room creator can change that room.',
  });
}

async function serializeRoom(room) {
  const [lastMessage, members] = await Promise.all([
    Message.findOne({
      where: {
        roomId: room.id,
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['username'],
        },
      ],
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    }),
    room.countMembers(),
  ]);

  return {
    name: room.name,
    creatorUsername: room.creatorUsername || '',
    creatorUsernameKey: room.creatorUsernameKey || '',
    members,
    preview: lastMessage
      ? `${lastMessage.author.username}: ${lastMessage.body}`
      : '',
    time: lastMessage ? formatMessageTime(lastMessage.createdAt) : '',
    unread: 0,
    joined: true,
  };
}

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

app.post(
  '/api/login',
  asyncRoute(async (req, res) => {
    const username = String(req.body.username || '').trim();

    if (!username) {
      return res.status(400).json({
        message: 'Username is required.',
      });
    }

    try {
      await User.create({
        username,
        usernameKey: getUsernameKey(username),
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return res.status(409).json({
          message: 'That name is already in use. Try another.',
        });
      }

      throw error;
    }

    return res.status(201).json({ username });
  }),
);

app.get(
  '/api/rooms',
  asyncRoute(async (req, res) => {
    const rooms = await Room.findAll({
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    const serializedRooms = await Promise.all(rooms.map(serializeRoom));

    return res.json(serializedRooms);
  }),
);

app.post(
  '/api/rooms',
  asyncRoute(async (req, res) => {
    const name = normalizeRoomName(req.body.name);
    const username = getRequestUsername(req);

    if (!name) {
      return res.status(400).json({
        message: 'Room name is required.',
      });
    }

    if (!username) {
      return res.status(400).json({
        message: 'Room creator is required.',
      });
    }

    const user = await findOrCreateUser(username);
    let room;

    try {
      room = await Room.create({
        name,
        roomKey: getRoomKey(name),
        creatorUsername: user.username,
        creatorUsernameKey: user.usernameKey,
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return res.status(409).json({
          message: 'A room with that name already exists.',
        });
      }

      throw error;
    }

    await room.addMember(user);

    return res.status(201).json(await serializeRoom(room));
  }),
);

app.patch(
  '/api/rooms/:roomName',
  asyncRoute(async (req, res) => {
    const name = normalizeRoomName(req.params.roomName);
    const nextName = normalizeRoomName(req.body.name);
    const username = getRequestUsername(req);
    const room = await findRoomByName(name);

    if (!room) {
      return res.status(404).json({
        message: 'Room not found.',
      });
    }

    if (!isRoomCreator(room, username)) {
      return sendRoomCreatorRequired(res);
    }

    if (!nextName) {
      return res.status(400).json({
        message: 'Room name is required.',
      });
    }

    room.name = nextName;
    room.roomKey = getRoomKey(nextName);

    try {
      await room.save();
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return res.status(409).json({
          message: 'A room with that name already exists.',
        });
      }

      throw error;
    }

    return res.json(await serializeRoom(room));
  }),
);

app.delete(
  '/api/rooms/:roomName',
  asyncRoute(async (req, res) => {
    const name = normalizeRoomName(req.params.roomName);
    const username = getRequestUsername(req);
    const room = await findRoomByName(name);

    if (!room) {
      return res.status(404).json({
        message: 'Room not found.',
      });
    }

    if (!isRoomCreator(room, username)) {
      return sendRoomCreatorRequired(res);
    }

    await room.destroy();

    return res.status(204).send();
  }),
);

app.get(
  '/api/rooms/:roomName/messages',
  asyncRoute(async (req, res) => {
    const name = normalizeRoomName(req.params.roomName);
    const room = await findRoomByName(name);

    if (!room) {
      return res.status(404).json({
        message: 'Room not found.',
      });
    }

    const messages = await Message.findAll({
      where: {
        roomId: room.id,
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['username'],
        },
      ],
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    });

    return res.json(messages.map(serializeMessage));
  }),
);

app.post(
  '/api/rooms/:roomName/messages',
  asyncRoute(async (req, res) => {
    const name = normalizeRoomName(req.params.roomName);
    const room = await findRoomByName(name);
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

    const user = await findOrCreateUser(author);

    await room.addMember(user);

    const message = await Message.create({
      roomId: room.id,
      userId: user.id,
      body,
    });

    message.author = user;

    return res.status(201).json(serializeMessage(message));
  }),
);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  // eslint-disable-next-line no-console
  console.error(error);

  return res.status(500).json({
    message: 'Internal server error.',
  });
});

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
