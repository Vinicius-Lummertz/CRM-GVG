"use strict";

const { registerHealthRoutes } = require("./healthRoutes");
const { registerLeadsRoutes } = require("./leadsRoutes");
const { registerMediaRoutes } = require("./mediaRoutes");
const { registerEventsRoutes } = require("./eventsRoutes");
const { registerWebhookRoutes } = require("./webhookRoutes");
const { registerAuthRoutes } = require("./auth");
const { registerConversationsRoutes } = require("./conversations");
const { registerTemplatesRoutes } = require("./templates");
const { registerEventsRoutesV1 } = require("./events");
const { registerProviderWebhooksRoutes } = require("./providerWebhooks");

function registerRoutes(app, controllers, middlewares) {
  registerHealthRoutes(app, controllers);
  registerLeadsRoutes(app, controllers);
  registerMediaRoutes(app, controllers);
  registerEventsRoutes(app, controllers);
  registerWebhookRoutes(app, controllers);
  registerAuthRoutes(app, controllers, middlewares);
  registerConversationsRoutes(app, controllers, middlewares);
  registerTemplatesRoutes(app, controllers, middlewares);
  registerEventsRoutesV1(app, controllers, middlewares);
  registerProviderWebhooksRoutes(app, controllers);
}

module.exports = {
  registerRoutes
};
