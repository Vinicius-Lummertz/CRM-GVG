"use strict";

function createEnsureConversationState({ repositories, generateId, nowIso }) {
  return async function ensureConversationState(leadId, leadRow = null) {
    let state = await repositories.conversationState.findByLeadId(leadId);
    if (state) return state;

    const lead = leadRow || (await repositories.leads.findById(leadId));
    const timestamp = nowIso();

    await repositories.conversationState.insertState({
      id: generateId("conv"),
      leadId,
      currentStatus: lead?.status || "lead",
      currentStageLabel: lead?.status || "lead",
      aiSummary: lead?.ai_summary || null,
      aiShortSummary: lead?.ai_summary || null,
      aiLastReason: lead?.ai_last_reason || null,
      aiLastConfidence: lead?.ai_last_confidence || 0,
      budgetText: "Nao informado.",
      messagesAfterLastResume: lead?.messages_after_last_resume || 0,
      attentionRequired: 0,
      sentiment: "neutral",
      interestLevel: "unknown",
      riskLevel: "low",
      createdAt: timestamp,
      updatedAt: timestamp
    });

    state = await repositories.conversationState.findByLeadId(leadId);
    return state;
  };
}

module.exports = {
  createEnsureConversationState
};
