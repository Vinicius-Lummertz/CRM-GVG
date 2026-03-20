"use strict";

const crypto = require("crypto");

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function randomCode(length = 6) {
  const max = 10 ** length;
  const min = 10 ** (length - 1);
  const n = Math.floor(Math.random() * (max - min)) + min;
  return String(n);
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function toIsoAfterMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function isExpired(iso) {
  if (!iso) return true;
  return new Date(iso).getTime() <= Date.now();
}

module.exports = {
  sha256,
  randomCode,
  randomToken,
  toIsoAfterMinutes,
  isExpired
};
