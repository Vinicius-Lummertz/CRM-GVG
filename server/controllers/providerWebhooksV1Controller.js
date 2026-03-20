"use strict";

function createProviderWebhooksV1Controller({ crm, sseHub, v1Service }) {
  return {
    async inbound(req, res) {
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

        const conversation = await v1Service.conversations.getConversationByLeadId(result.leadId);
        if (conversation) {
          sseHub.broadcast({ type: "conversation.updated", data: conversation });
        }
      } catch (err) {
        console.error("[v1 webhook inbound] erro:", err.message);
        res.status(200).type("text/plain").send("ok");
      }
    },

    async status(req, res) {
      try {
        await v1Service.conversations.updateMessageDeliveryFromProvider(req.body || {});
        res.status(200).type("text/plain").send("ok");
      } catch (err) {
        console.error("[v1 webhook status] erro:", err.message);
        res.status(200).type("text/plain").send("ok");
      }
    }
  };
}

module.exports = {
  createProviderWebhooksV1Controller
};
