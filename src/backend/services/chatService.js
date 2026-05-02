'use strict';

const { UniqueConstraintError } = require('sequelize');
const { User, Room, RoomMember } = require('../database');
const { getRoomKey, getUsernameKey } = require('../utils/names');

async function findOrCreateUser(username) {
  const usernameKey = getUsernameKey(username);
  const [user] = await User.findOrCreate({
    where: { usernameKey },
    defaults: { username, usernameKey },
  });

  return user;
}

async function findUserByUsername(username) {
  if (!username) {
    return null;
  }

  return User.findOne({
    where: {
      usernameKey: getUsernameKey(username),
    },
  });
}

async function findRoomByName(name) {
  return Room.findOne({
    where: {
      roomKey: getRoomKey(name),
    },
  });
}

async function isRoomCreator(room, username) {
  const user = await findUserByUsername(username);

  return Boolean(
    user &&
      (room.ownerUserId === user.id ||
        (room.creatorUsernameKey &&
          room.creatorUsernameKey === user.usernameKey)),
  );
}

async function ensureRoomMember(room, user) {
  try {
    await RoomMember.findOrCreate({
      where: {
        roomId: room.id,
        userId: user.id,
      },
    });
  } catch (error) {
    if (!(error instanceof UniqueConstraintError)) {
      throw error;
    }
  }
}

module.exports = {
  findOrCreateUser,
  findUserByUsername,
  findRoomByName,
  isRoomCreator,
  ensureRoomMember,
};
