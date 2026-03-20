"use strict";

function encodeCursor(payload) {
  if (!payload) return null;
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

function decodeCursor(rawCursor) {
  if (!rawCursor) return null;
  try {
    const json = Buffer.from(String(rawCursor), "base64url").toString("utf8");
    return JSON.parse(json);
  } catch (_err) {
    return null;
  }
}

module.exports = {
  encodeCursor,
  decodeCursor
};
