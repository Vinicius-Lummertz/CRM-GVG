"use strict";

function registerProviderWebhooksV1Routes(app, { providerWebhooksV1Controller }) {
  app.post("/api/v1/providers/whatsapp/webhooks/inbound", providerWebhooksV1Controller.inbound);
  app.post("/api/v1/providers/whatsapp/webhooks/status", providerWebhooksV1Controller.status);
}

module.exports = {
  registerProviderWebhooksV1Routes
};
