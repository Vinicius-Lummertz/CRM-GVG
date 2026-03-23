"use strict";

const { registerTemplatesRoutes } = require("./templates");

function registerTemplatesV1Routes(app, controllers, middlewares) {
  registerTemplatesRoutes(app, controllers, middlewares);
}

module.exports = {
  registerTemplatesV1Routes,
  registerTemplatesRoutes
};
