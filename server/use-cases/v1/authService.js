"use strict";

const { createAuthCore } = require("../../core/auth/core");

function createAuthService(deps) {
  return createAuthCore(deps);
}

module.exports = {
  createAuthService
};
