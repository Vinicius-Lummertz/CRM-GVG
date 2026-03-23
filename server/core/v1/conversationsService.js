"use strict";

const { createConversationsCore } = require("../conversations/core");

function createConversationsService(deps) {
  return createConversationsCore(deps);
}

module.exports = {
  createConversationsService
};
