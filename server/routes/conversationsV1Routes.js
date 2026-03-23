"use strict";

const { registerConversationsRoutes } = require("./conversations");

function registerConversationsV1Routes(app, controllers, middlewares) {
  registerConversationsRoutes(app, controllers, middlewares);
}

module.exports = {
  registerConversationsV1Routes,
  registerConversationsRoutes
};
