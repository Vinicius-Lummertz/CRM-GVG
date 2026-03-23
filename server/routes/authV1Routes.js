"use strict";

const { registerAuthRoutes } = require("./auth");

function registerAuthV1Routes(app, controllers, middlewares) {
  registerAuthRoutes(app, controllers, middlewares);
}

module.exports = {
  registerAuthV1Routes,
  registerAuthRoutes
};
