"use strict";

function createProviderWebhooksCore({ crm, sseHub, conversationsCore }) {
  async function inbound(payload) {
    const result = await crm.processInboundWebhook(payload || {});

    if (result.shouldAnalyze) {
      crm.queueLeadAnalysis(result.leadId, result.triggerReason);
    }

    const lead = await crm.fetchLeadViewById(result.leadId);
    if (lead) {
      sseHub.broadcast({ type: "lead.updated", lead });
    }

    const conversation = await conversationsCore.getConversationByLeadId(result.leadId);
    if (conversation) {
      sseHub.broadcast({ type: "conversation.updated", data: conversation });
    }
  }

  async function status(payload) {
    await conversationsCore.updateMessageDeliveryFromProvider(payload || {});
  }

  return {
    inbound,
    status
  };
}

module.exports = {
  createProviderWebhooksCore
};
