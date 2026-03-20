"use strict";

function createInboundWebhookUseCases({
  repositories,
  ensureConversationState,
  ensureConversationRecord,
  generateId,
  nowIso,
  extractLeadIdentity,
  extractIncomingMedia,
  buildMessagePreview,
  inferMessageType,
  detectStrongTrigger,
  computePriorityScore,
  computeTemperatureFromScore,
  getPipelinePosition
}) {
  async function upsertLeadFromWebhook(identity, timestamp) {
    let lead = await repositories.leads.findByExternalKey(identity.externalKey);

    if (!lead) {
      const leadId = generateId("lead");
      await repositories.leads.insertLead({
        id: leadId,
        externalKey: identity.externalKey,
        phone: identity.phone || "",
        whatsappFrom: identity.whatsappFrom || null,
        waId: identity.waId,
        name: identity.name || "Sem nome",
        source: "whatsapp",
        status: "lead",
        pipelinePosition: 0,
        priorityScore: 0,
        temperature: "cold",
        lastMessage: "Sem mensagem",
        lastMessagePreview: "Sem mensagem",
        unreadCount: 0,
        messageCountTotal: 0,
        inboundCount: 0,
        outboundCount: 0,
        mediaCount: 0,
        messagesAfterLastResume: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      });
      lead = await repositories.leads.findById(leadId);
      await ensureConversationState(leadId, lead);
      await ensureConversationRecord(lead, timestamp);
      return lead;
    }

    await repositories.leads.updateIdentity({
      id: lead.id,
      phone: identity.phone || lead.phone,
      whatsappFrom: identity.whatsappFrom || lead.whatsapp_from,
      waId: identity.waId || lead.wa_id,
      name: identity.name || lead.name || "Sem nome",
      updatedAt: timestamp
    });

    lead = await repositories.leads.findById(lead.id);
    await ensureConversationState(lead.id, lead);
    await ensureConversationRecord(lead, timestamp);
    return lead;
  }

  async function saveInboundMessage(input) {
    if (input.messageSid) {
      const existingBySid = await repositories.messages.findByLeadAndMessageSid(input.leadId, input.messageSid);
      if (existingBySid) return { inserted: false, messageId: existingBySid.id, mediaCount: 0 };
    }

    const existingById = await repositories.messages.findById(input.messageId);
    if (existingById) return { inserted: false, messageId: existingById.id, mediaCount: 0 };

    const firstMedia = input.mediaItems[0] || null;
    await repositories.messages.insertInboundMessage({
      id: input.messageId,
      leadId: input.leadId,
      messageSid: input.messageSid || null,
      body: input.rawBody || "",
      preview: input.preview,
      messageType: input.messageType,
      mediaCount: input.mediaItems.length,
      firstMediaUrl: firstMedia ? firstMedia.url : null,
      firstMediaContentType: firstMedia ? firstMedia.contentType : null,
      rawPayloadJson: JSON.stringify(input.rawPayload || {}),
      createdAt: input.timestamp
    });

    await repositories.messageMedia.insertMany({
      messageId: input.messageId,
      leadId: input.leadId,
      mediaItems: input.mediaItems,
      createdAt: input.timestamp,
      generateId
    });

    return { inserted: true, messageId: input.messageId, mediaCount: input.mediaItems.length };
  }

  async function applyInboundLeadCounters(lead, context) {
    const nextMessageCountTotal = (lead.message_count_total || 0) + 1;
    const nextPriority = computePriorityScore({
      status: lead.status || "lead",
      messageCountTotal: nextMessageCountTotal,
      lastMessageAt: context.timestamp,
      strongTriggerDetected: context.strongTriggerDetected
    });

    await repositories.leads.updateInboundCounters({
      id: lead.id,
      preview: context.preview,
      timestamp: context.timestamp,
      mediaCount: context.mediaCount,
      priorityScore: nextPriority,
      temperature: computeTemperatureFromScore(nextPriority),
      pipelinePosition: getPipelinePosition(lead.status || "lead")
    });

    await ensureConversationState(lead.id, lead);
    await repositories.conversationState.updateAfterInbound({
      leadId: lead.id,
      currentStatus: lead.status || "lead",
      updatedAt: context.timestamp
    });
  }

  async function processInboundWebhook(payload) {
    const timestamp = nowIso();
    const identity = extractLeadIdentity(payload, generateId);
    const rawBody = payload.Body ? String(payload.Body) : "";
    const messageSid = payload.MessageSid ? String(payload.MessageSid).trim() : "";
    const mediaItems = extractIncomingMedia(payload);
    const messagePreview = buildMessagePreview(payload, mediaItems);
    const messageType = inferMessageType(rawBody, mediaItems);
    const strongTriggerDetected = detectStrongTrigger(rawBody || messagePreview);

    const lead = await upsertLeadFromWebhook(identity, timestamp);
    const savedMessage = await saveInboundMessage({
      leadId: lead.id,
      messageId: messageSid || generateId("msg"),
      messageSid,
      rawBody,
      preview: messagePreview,
      messageType,
      mediaItems,
      rawPayload: payload,
      timestamp
    });

    if (savedMessage.inserted) {
      await applyInboundLeadCounters(lead, {
        preview: messagePreview,
        timestamp,
        mediaCount: savedMessage.mediaCount,
        strongTriggerDetected
      });
    }

    const state = await ensureConversationState(lead.id, lead);
    const triggerReason = strongTriggerDetected
      ? "strong_trigger"
      : Number(state.messages_after_last_resume || 0) >= 10
      ? "batch_10_messages"
      : null;

    if (triggerReason) {
      console.log(`[analysis] trigger detected lead=${lead.id} reason=${triggerReason}`);
    }

    return {
      leadId: lead.id,
      shouldAnalyze: savedMessage.inserted && Boolean(triggerReason),
      triggerReason
    };
  }

  return {
    upsertLeadFromWebhook,
    saveInboundMessage,
    applyInboundLeadCounters,
    processInboundWebhook
  };
}

module.exports = {
  createInboundWebhookUseCases
};
