"use strict";

function assertNoError(error) {
  if (error) throw error;
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

module.exports = {
  assertNoError,
  toInt
};
