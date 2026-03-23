"use strict";

const { registerEventsRoutesV1 } = require("./events");

function registerEventsV1Routes(app, controllers, middlewares) {
  registerEventsRoutesV1(app, controllers, middlewares);
}

module.exports = {
  registerEventsV1Routes,
  registerEventsRoutesV1
};
