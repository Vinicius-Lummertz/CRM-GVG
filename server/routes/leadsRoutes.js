"use strict";

function registerLeadsRoutes(app, { leadsController }) {
  app.get("/api/leads", leadsController.listLeads);
  app.get("/api/leads/:leadId/messages", leadsController.getLeadMessages);
}

module.exports = {
  registerLeadsRoutes
};
