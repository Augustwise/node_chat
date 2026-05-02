'use strict';

function getRequestUsername(req) {
  return String(req.body.username || '').trim();
}

function getQueryUsername(req) {
  return String(req.query.username || '').trim();
}

module.exports = {
  getRequestUsername,
  getQueryUsername,
};
