"use strict";

function createLeadsController({ crm }) {
  return {
    async listLeads(req, res) {
      try {
        const filters = {
          status: req.query.status ? String(req.query.status).trim() : null,
          temperature: req.query.temperature ? String(req.query.temperature).trim() : null,
          attentionRequired:
            req.query.attention_required === undefined
              ? null
              : req.query.attention_required === "1" || req.query.attention_required === "true"
        };

        const leads = await crm.listLeadViews(filters);
        res.json({ leads });
      } catch (err) {
        console.error("[api/leads] erro:", err.message);
        res.status(500).json({ error: "Falha ao carregar leads." });
      }
    },

    async getLeadMessages(req, res) {
      try {
        const limit = Number.parseInt(String(req.query.limit || "100"), 10);
        const messages = await crm.getLeadMessages(String(req.params.leadId), limit);
        res.json({ messages });
      } catch (err) {
        console.error("[api/leads/:leadId/messages] erro:", err.message);
        res.status(500).json({ error: "Falha ao carregar mensagens." });
      }
    }
  };
}

module.exports = {
  createLeadsController
};
