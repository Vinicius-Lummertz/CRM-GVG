"use strict";

const { createAuthCore } = require("../auth/core");

function createAuthService(deps) {
  return createAuthCore(deps);
}

module.exports = {
  createAuthService
};
