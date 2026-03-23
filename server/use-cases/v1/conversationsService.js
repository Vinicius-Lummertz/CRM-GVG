"use strict";

const { createConversationsCore } = require("../../core/conversations/core");

function createConversationsService(deps) {
  return createConversationsCore(deps);
}

module.exports = {
  createConversationsService
};
