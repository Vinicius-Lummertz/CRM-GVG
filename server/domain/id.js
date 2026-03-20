"use strict";

const crypto = require("crypto");

function generateId(prefix) {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

module.exports = {
  generateId
};
