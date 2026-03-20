"use strict";

const { initDb } = require("../db/initDb");
const { createHttpApp } = require("./http/createApp");
const { createRequireAuth } = require("./http/authMiddleware");
const { createControllers } = require("./controllers");
const { createSseHub } = require("./events/sseHub");
const { createTwilioMediaProxy } = require("./integrations/twilioMediaProxy");
const { createWhatsappProvider } = require("./integrations/whatsappProvider");
const { createCrmService } = require("./use-cases/crm/createCrmService");
const { createV1Service } = require("./use-cases/v1/createV1Service");

async function startServer(config) {
  const db = await initDb(config.db.connectionString);
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

  const controllers = createControllers({ crm, v1Service, sseHub, twilioMediaProxy });
  const middlewares = {
    requireAuth: createRequireAuth(v1Service)
  };
  const app = createHttpApp({
    publicDir: config.app.publicDir,
    controllers,
    middlewares
  });

  app.listen(config.app.port, () => {
    console.log("[db] Postgres/Supabase inicializado");
    console.log(`Servidor ativo em http://localhost:${config.app.port}`);
    if (twilioMediaProxy.hasCredentials) console.log("[env] Secrets da env lidos corretamente");
    if (whatsappProvider.hasCredentials) console.log("[env] WhatsApp outbound provider configurado");
    if (config.ai.hasLegacyTypoKey) {
      console.log("[env] Aviso: ONPENAI_API_KEY encontrado, prefira GEMINI_API_KEY.");
    }
    if (config.ai.apiKey) console.log(`[env] AI configurada com modelo ${config.ai.model}`);
  });
}

module.exports = {
  startServer
};
