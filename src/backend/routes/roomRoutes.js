'use strict';

const express = require('express');
const { UniqueConstraintError } = require('sequelize');
const { Room } = require('../database');
const asyncRoute = require('../middleware/asyncRoute');
const { serializeRoom } = require('../serializers/chatSerializers');
const {
  findOrCreateUser,
  findUserByUsername,
  findRoomByName,
  isRoomCreator,
  ensureRoomMember,
} = require('../services/chatService');
const { normalizeRoomName, getRoomKey } = require('../utils/names');
const { getRequestUsername, getQueryUsername } = require('../utils/request');

const router = express.Router();

function sendRoomCreatorRequired(res) {
  return res.status(403).json({
    message: 'Only the room creator can change that room.',
  });
}

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const viewer = await findUserByUsername(getQueryUsername(req));
    const rooms = await Room.findAll({
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    const serializedRooms = await Promise.all(
      rooms.map((room) => serializeRoom(room, viewer)),
    );

    return res.json(serializedRooms);
  }),
);

router.post(
  '/',
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
        ownerUserId: user.id,
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return res.status(409).json({
          message: 'A room with that name already exists.',
        });
      }

      throw error;
    }

    await ensureRoomMember(room, user);

    return res.status(201).json(await serializeRoom(room, user));
  }),
);

router.patch(
  '/:roomName',
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

    if (!(await isRoomCreator(room, username))) {
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

    const viewer = await findUserByUsername(username);

    return res.json(await serializeRoom(room, viewer));
  }),
);

router.delete(
  '/:roomName',
  asyncRoute(async (req, res) => {
    const name = normalizeRoomName(req.params.roomName);
    const username = getRequestUsername(req);
    const room = await findRoomByName(name);

    if (!room) {
      return res.status(404).json({
        message: 'Room not found.',
      });
    }

    if (!(await isRoomCreator(room, username))) {
      return sendRoomCreatorRequired(res);
    }

    await room.setMembers([]);
    await room.destroy();

    return res.status(204).send();
  }),
);

router.post(
  '/:roomName/members',
  asyncRoute(async (req, res) => {
    const name = normalizeRoomName(req.params.roomName);
    const username = getRequestUsername(req);
    const room = await findRoomByName(name);

    if (!room) {
      return res.status(404).json({
        message: 'Room not found.',
      });
    }

    if (!username) {
      return res.status(400).json({
        message: 'Username is required.',
      });
    }

    const user = await findOrCreateUser(username);

    await ensureRoomMember(room, user);

    return res.json(await serializeRoom(room, user));
  }),
);

router.delete(
  '/:roomName/members',
  asyncRoute(async (req, res) => {
    const name = normalizeRoomName(req.params.roomName);
    const username = getRequestUsername(req);
    const room = await findRoomByName(name);

    if (!room) {
      return res.status(404).json({
        message: 'Room not found.',
      });
    }

    const user = await findUserByUsername(username);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    await room.removeMember(user);

    return res.json(await serializeRoom(room, user));
  }),
);

module.exports = router;
