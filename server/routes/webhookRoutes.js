"use strict";

function registerWebhookRoutes(app, { webhookController }) {
  app.post("/api/whatsapp/webhook", webhookController.receiveWhatsappWebhook);
}

module.exports = {
  registerWebhookRoutes
};
