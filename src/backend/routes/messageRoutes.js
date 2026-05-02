'use strict';

const express = require('express');
const { Message, User } = require('../database');
const asyncRoute = require('../middleware/asyncRoute');
const { serializeMessage } = require('../serializers/chatSerializers');
const {
  findOrCreateUser,
  findRoomByName,
  ensureRoomMember,
} = require('../services/chatService');
const { normalizeRoomName } = require('../utils/names');

const router = express.Router({ mergeParams: true });

router.get(
  '/',
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

router.post(
  '/',
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

    await ensureRoomMember(room, user);

    const message = await Message.create({
      roomId: room.id,
      userId: user.id,
      body,
    });

    message.author = user;

    return res.status(201).json(serializeMessage(message));
  }),
);

module.exports = router;
