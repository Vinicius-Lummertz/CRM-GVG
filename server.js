"use strict";

const express = require("express");
const cors = require("cors");

const { loadConfig } = require("./server/core/config");
const { initDb } = require("./server/core/database/initDb");
const { createSseHub } = require("./server/core/events/sseHub");
const { createCrmService } = require("./server/core/crm/createCrmService");
const { createV1Service } = require("./server/core/v1/createV1Service");
const { createTwilioMediaProxy } = require("./server/integrations/twilioMediaProxy");
const { createWhatsappProvider } = require("./server/integrations/whatsappProvider");
const { createControllers } = require("./server/routes/handlers");
const { createRequireAuth } = require("./server/routes/middleware/auth");
const { registerRoutes } = require("./server/routes");

async function main() {
  const config = loadConfig({ rootDir: __dirname });

  const db = await initDb(config.db);
  const sseHub = createSseHub();

  const twilioMediaProxy = createTwilioMediaProxy({
    accountSid: config.twilio.accountSid,
    authToken: config.twilio.authToken,
    allowedHosts: config.twilio.mediaHosts
  });

  const whatsappProvider = createWhatsappProvider({
    accountSid: config.twilio.accountSid,
    authToken: config.twilio.authToken,
    fromNumber: config.twilio.whatsappFrom,
    messagingServiceSid: config.twilio.messagingServiceSid,
    statusCallbackUrl: config.twilio.statusCallbackUrl
  });

  let crm;
  crm = createCrmService({
    db,
    openAiApiKey: config.ai.apiKey,
    openAiModel: config.ai.model,
    emitLeadUpdated: async (leadId) => {
      const lead = await crm.fetchLeadViewById(leadId);
      if (!lead) return;
      sseHub.broadcast({ type: "lead.updated", lead });
    }
  });

  const v1Service = createV1Service({
    db,
    crm,
    sseHub,
    whatsappProvider,
    config
  });

  const app = express();
  app.use(cors());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.static(config.app.publicDir));

  const controllers = createControllers({ crm, v1Service, sseHub, twilioMediaProxy });
  const middlewares = { requireAuth: createRequireAuth(v1Service) };
  registerRoutes(app, controllers, middlewares);

  app.listen(config.app.port, () => {
    console.log("[db] Supabase SDK inicializado");
    console.log(`Servidor ativo em http://localhost:${config.app.port}`);
    if (twilioMediaProxy.hasCredentials) console.log("[env] Secrets da env lidos corretamente");
    if (whatsappProvider.hasCredentials) console.log("[env] WhatsApp outbound provider configurado");
    if (config.ai.hasLegacyTypoKey) {
      console.log("[env] Aviso: ONPENAI_API_KEY encontrado, prefira GEMINI_API_KEY.");
    }
    if (config.ai.apiKey) console.log(`[env] AI configurada com modelo ${config.ai.model}`);
  });
}

main().catch((err) => {
  console.error("[startup] erro fatal:", err);
  process.exit(1);
});
