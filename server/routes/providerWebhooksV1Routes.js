"use strict";

const { registerProviderWebhooksRoutes } = require("./providerWebhooks");

function registerProviderWebhooksV1Routes(app, controllers) {
  registerProviderWebhooksRoutes(app, controllers);
}

module.exports = {
  registerProviderWebhooksV1Routes,
  registerProviderWebhooksRoutes
};
