"use strict";

function registerProviderWebhooksRoutes(app, { providerWebhooksV1Controller }) {
  app.post("/api/v1/providers/whatsapp/webhooks/inbound", providerWebhooksV1Controller.inbound);
  app.post("/api/v1/providers/whatsapp/webhooks/status", providerWebhooksV1Controller.status);
}

module.exports = {
  registerProviderWebhooksRoutes
};
