"use strict";

function mapLeadView(lead, state, latestMessage) {
  const aiShortSummary = state?.ai_short_summary || (lead.ai_summary ? String(lead.ai_summary).slice(0, 140) : null);
  return {
    id: lead.id,
    externalKey: lead.external_key,
    phone: lead.phone,
    whatsappFrom: lead.whatsapp_from,
    waId: lead.wa_id,
    name: lead.name,
    avatarUrl: lead.avatar_url,
    status: lead.status,
    temperature: lead.temperature || "cold",
    priorityScore: Number(lead.priority_score || 0),
    pipelinePosition: lead.pipeline_position || 0,
    aiSummary: lead.ai_summary || null,
    aiShortSummary: aiShortSummary || null,
    aiLastReason: state?.ai_last_reason || lead.ai_last_reason || null,
    aiLastConfidence: Number(state?.ai_last_confidence ?? lead.ai_last_confidence ?? 0),
    lastMessagePreview: lead.last_message_preview || "Sem mensagem",
    lastMessageAt: lead.last_message_at || null,
    messageCountTotal: lead.message_count_total || 0,
    unreadCount: lead.unread_count || 0,
    mediaCount: lead.media_count || 0,
    messagesAfterLastResume: state?.messages_after_last_resume ?? lead.messages_after_last_resume ?? 0,
    attentionRequired: Boolean(state?.attention_required || 0),
    sentiment: state?.sentiment || "neutral",
    interestLevel: state?.interest_level || "unknown",
    riskLevel: state?.risk_level || "low",
    nextAction: state?.next_action || null,
    messages: latestMessage ? [latestMessage] : [],
    key: lead.external_key,
    lastMessage: lead.last_message_preview || "Sem mensagem"
  };
}

module.exports = {
  mapLeadView
};
