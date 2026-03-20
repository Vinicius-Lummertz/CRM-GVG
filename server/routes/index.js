"use strict";

const { registerHealthRoutes } = require("./healthRoutes");
const { registerLeadsRoutes } = require("./leadsRoutes");
const { registerMediaRoutes } = require("./mediaRoutes");
const { registerEventsRoutes } = require("./eventsRoutes");
const { registerWebhookRoutes } = require("./webhookRoutes");

function registerRoutes(app, controllers) {
  registerHealthRoutes(app, controllers);
  registerLeadsRoutes(app, controllers);
  registerMediaRoutes(app, controllers);
  registerEventsRoutes(app, controllers);
  registerWebhookRoutes(app, controllers);
}

module.exports = {
  registerRoutes
};
