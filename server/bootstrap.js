"use strict";

const { initDb } = require("../db/initDb");
const { createHttpApp } = require("./http/createApp");
const { createControllers } = require("./controllers");
const { createSseHub } = require("./events/sseHub");
const { createTwilioMediaProxy } = require("./integrations/twilioMediaProxy");
const { createCrmService } = require("./use-cases/crm/createCrmService");

async function startServer(config) {
  const db = await initDb(config.db.filePath);
  const sseHub = createSseHub();
  const twilioMediaProxy = createTwilioMediaProxy({
    accountSid: config.twilio.accountSid,
    authToken: config.twilio.authToken,
    allowedHosts: config.twilio.mediaHosts
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

  const controllers = createControllers({ crm, sseHub, twilioMediaProxy });
  const app = createHttpApp({
    publicDir: config.app.publicDir,
    controllers
  });

  app.listen(config.app.port, () => {
    console.log(`[db] SQLite inicializado em ${config.db.filePath}`);
    console.log(`Servidor ativo em http://localhost:${config.app.port}`);
    if (twilioMediaProxy.hasCredentials) console.log("[env] Secrets da env lidos corretamente");
    if (config.ai.hasLegacyTypoKey) {
      console.log("[env] Aviso: ONPENAI_API_KEY encontrado, prefira GEMINI_API_KEY.");
    }
    if (config.ai.apiKey) console.log(`[env] AI configurada com modelo ${config.ai.model}`);
  });
}

module.exports = {
  startServer
};
