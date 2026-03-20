"use strict";

const { createHealthController } = require("./healthController");
const { createLeadsController } = require("./leadsController");
const { createMediaController } = require("./mediaController");
const { createEventsController } = require("./eventsController");
const { createWebhookController } = require("./webhookController");
const { createAuthV1Controller } = require("./authV1Controller");
const { createConversationsV1Controller } = require("./conversationsV1Controller");
const { createTemplatesV1Controller } = require("./templatesV1Controller");
const { createEventsV1Controller } = require("./eventsV1Controller");
const { createProviderWebhooksV1Controller } = require("./providerWebhooksV1Controller");

function createControllers({ crm, v1Service, sseHub, twilioMediaProxy }) {
  return {
    healthController: createHealthController(),
    leadsController: createLeadsController({ crm }),
    mediaController: createMediaController({ twilioMediaProxy }),
    eventsController: createEventsController({ sseHub }),
    webhookController: createWebhookController({ crm, sseHub }),
    authV1Controller: createAuthV1Controller({ v1Service }),
    conversationsV1Controller: createConversationsV1Controller({ v1Service }),
    templatesV1Controller: createTemplatesV1Controller({ v1Service }),
    eventsV1Controller: createEventsV1Controller({ sseHub }),
    providerWebhooksV1Controller: createProviderWebhooksV1Controller({ crm, sseHub, v1Service })
  };
}

module.exports = {
  createControllers
};
