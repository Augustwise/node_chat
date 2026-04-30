/* eslint-disable indent */
'use strict';

const path = require('path');
const fs = require('fs');
const { Sequelize, DataTypes } = require('sequelize');

const envPath =
  [
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '..', 'server', '.env'),
    path.resolve(__dirname, '..', '..', 'server', '.env'),
  ].find((filePath) => fs.existsSync(filePath)) ||
  path.resolve(__dirname, '.env');

require('dotenv').config({
  path: envPath,
  quiet: true,
});

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://localhost:5432/node_chat';

const shouldUseSsl =
  databaseUrl.includes('sslmode=require') || databaseUrl.includes('neon.tech');

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
  define: {
    underscored: true,
  },
  dialectOptions: shouldUseSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
});

const User = sequelize.define(
  'User',
  {
    username: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    usernameKey: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: 'users',
  },
);

const Room = sequelize.define(
  'Room',
  {
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    roomKey: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
    },
    creatorUsername: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    creatorUsernameKey: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
  },
  {
    tableName: 'rooms',
  },
);

const Message = sequelize.define(
  'Message',
  {
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: 'messages',
  },
);

const RoomMember = sequelize.define(
  'RoomMember',
  {},
  {
    tableName: 'room_members',
  },
);

Room.belongsToMany(User, {
  through: RoomMember,
  as: 'members',
  foreignKey: 'roomId',
  otherKey: 'userId',
});

User.belongsToMany(Room, {
  through: RoomMember,
  as: 'rooms',
  foreignKey: 'userId',
  otherKey: 'roomId',
});

Room.hasMany(Message, {
  as: 'messages',
  foreignKey: {
    allowNull: false,
    name: 'roomId',
  },
  onDelete: 'CASCADE',
});

Message.belongsTo(Room, {
  as: 'room',
  foreignKey: {
    allowNull: false,
    name: 'roomId',
  },
});

User.hasMany(Message, {
  as: 'messages',
  foreignKey: {
    allowNull: false,
    name: 'userId',
  },
  onDelete: 'CASCADE',
});

Message.belongsTo(User, {
  as: 'author',
  foreignKey: {
    allowNull: false,
    name: 'userId',
  },
});

async function connectDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      [
        'DATABASE_URL is required in src/backend/.env',
        'src/server/.env',
        'or server/.env',
      ].join(', '),
    );
  }

  await sequelize.authenticate();
  await sequelize.sync();

  // interact with the database schema
  const queryInterface = sequelize.getQueryInterface();

  const roomColumns = await queryInterface.describeTable('rooms');

  // Add creator_username column if it doesn't exist
  if (!roomColumns.creator_username) {
    await queryInterface.addColumn('rooms', 'creator_username', {
      type: DataTypes.STRING(80),
      allowNull: true,
    });
  }

  // Add creator_username_key column if it doesn't exist
  if (!roomColumns.creator_username_key) {
    await queryInterface.addColumn('rooms', 'creator_username_key', {
      type: DataTypes.STRING(80),
      allowNull: true,
    });
  }
}

module.exports = {
  connectDatabase,
  sequelize,
  User,
  Room,
  Message,
  RoomMember,
};
