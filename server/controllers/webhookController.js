"use strict";

function createWebhookController({ crm, sseHub }) {
  return {
    async receiveWhatsappWebhook(req, res) {
      try {
        const result = await crm.processInboundWebhook(req.body || {});
        res.status(200).type("text/plain").send("ok");

        if (result.shouldAnalyze) {
          crm.queueLeadAnalysis(result.leadId, result.triggerReason);
        }

        const lead = await crm.fetchLeadViewById(result.leadId);
        if (lead) {
          sseHub.broadcast({ type: "lead.updated", lead });
        }
      } catch (err) {
        console.error("[webhook] erro:", err.message);
        res.status(200).type("text/plain").send("ok");
      }
    }
  };
}

module.exports = {
  createWebhookController
};
