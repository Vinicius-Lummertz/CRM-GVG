"use strict";

const { createHealthController } = require("./healthController");
const { createLeadsController } = require("./leadsController");
const { createMediaController } = require("./mediaController");
const { createEventsController } = require("./eventsController");
const { createWebhookController } = require("./webhookController");

function createControllers({ crm, sseHub, twilioMediaProxy }) {
  return {
    healthController: createHealthController(),
    leadsController: createLeadsController({ crm }),
    mediaController: createMediaController({ twilioMediaProxy }),
    eventsController: createEventsController({ sseHub }),
    webhookController: createWebhookController({ crm, sseHub })
  };
}

module.exports = {
  createControllers
};
