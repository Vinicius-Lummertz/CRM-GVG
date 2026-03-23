"use strict";

const crypto = require("crypto");

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function verifySha256Hash(rawValue, storedHash) {
  const normalizedStored = String(storedHash || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalizedStored)) return false;
  const computed = sha256(rawValue);
  const left = Buffer.from(computed, "hex");
  const right = Buffer.from(normalizedStored, "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
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
  verifySha256Hash,
  randomCode,
  randomToken,
  toIsoAfterMinutes,
  isExpired
};
