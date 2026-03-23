"use strict";

function registerTemplatesRoutes(app, { templatesV1Controller }, { requireAuth }) {
  app.get("/api/v1/templates", requireAuth, templatesV1Controller.listTemplates);
  app.post("/api/v1/templates", requireAuth, templatesV1Controller.createTemplate);
  app.patch("/api/v1/templates/:templateId", requireAuth, templatesV1Controller.updateTemplate);
  app.post("/api/v1/templates/:templateId/send", requireAuth, templatesV1Controller.sendTemplate);
}

module.exports = {
  registerTemplatesRoutes
};
