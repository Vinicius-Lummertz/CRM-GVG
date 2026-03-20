"use strict";

const { registerHealthRoutes } = require("./healthRoutes");
const { registerLeadsRoutes } = require("./leadsRoutes");
const { registerMediaRoutes } = require("./mediaRoutes");
const { registerEventsRoutes } = require("./eventsRoutes");
const { registerWebhookRoutes } = require("./webhookRoutes");
const { registerAuthV1Routes } = require("./authV1Routes");
const { registerConversationsV1Routes } = require("./conversationsV1Routes");
const { registerTemplatesV1Routes } = require("./templatesV1Routes");
const { registerEventsV1Routes } = require("./eventsV1Routes");
const { registerProviderWebhooksV1Routes } = require("./providerWebhooksV1Routes");

function registerRoutes(app, controllers, middlewares) {
  registerHealthRoutes(app, controllers);
  registerLeadsRoutes(app, controllers);
  registerMediaRoutes(app, controllers);
  registerEventsRoutes(app, controllers);
  registerWebhookRoutes(app, controllers);
  registerAuthV1Routes(app, controllers, middlewares);
  registerConversationsV1Routes(app, controllers, middlewares);
  registerTemplatesV1Routes(app, controllers, middlewares);
  registerEventsV1Routes(app, controllers, middlewares);
  registerProviderWebhooksV1Routes(app, controllers);
}

module.exports = {
  registerRoutes
};
