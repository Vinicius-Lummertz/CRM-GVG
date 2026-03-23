"use strict";

const { STATUS_VALUES } = require("../../domain/classificationConstants");
const { encodeCursor, decodeCursor } = require("../../domain/cursor");
const { getPipelinePosition } = require("../../domain/pipelineRules");

const STATUS_SET = new Set(STATUS_VALUES);

function mapConversationRow(row) {
  return {
    id: row.conversation_id,
    leadId: row.id,
    externalKey: row.external_key,
    contact: {
      name: row.name,
      phone: row.phone,
      waId: row.wa_id,
      whatsappFrom: row.whatsapp_from,
      avatarUrl: row.avatar_url
    },
    pipeline: {
      status: row.status,
      temperature: row.temperature,
      priorityScore: Number(row.priority_score || 0),
      ownerId: row.conversation_owner_id || row.owner_id || null,
      ownerName: row.conversation_owner_name || row.owner_name || null,
      attentionRequired: Boolean(row.attention_required || 0)
    },
    lastMessage: {
      preview: row.last_message_preview || "Sem mensagem",
      at: row.last_message_at || null
    },
    counters: {
      unreadCount: Number(row.unread_count || 0),
      messageCountTotal: Number(row.message_count_total || 0),
      inboundCount: Number(row.inbound_count || 0),
      outboundCount: Number(row.outbound_count || 0)
    },
    insights: {
      summary: row.ai_summary || null,
      shortSummary: row.ai_short_summary || null,
      reason: row.ai_last_reason || null,
      confidence: Number(row.ai_last_confidence || 0),
      sentiment: row.sentiment || "neutral",
      interestLevel: row.interest_level || "unknown",
      riskLevel: row.risk_level || "low",
      nextAction: row.next_action || null,
      budgetText: row.budget_text || "Nao informado.",
      updatedAt: row.insights_updated_at || null
    },
    updatedAt: row.updated_at
  };
}

function renderTemplateBody(body, variables) {
  return String(body || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_full, key) => {
    const value = variables && Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : "";
    return String(value || "");
  });
}

function mapProviderStatus(rawStatus) {
  const status = String(rawStatus || "").toLowerCase();
  if (status === "queued") return "queued";
  if (status === "accepted" || status === "sending") return "sending";
  if (status === "sent") return "sent";
  if (status === "delivered") return "delivered";
  if (status === "read") return "read";
  if (status === "failed" || status === "undelivered") return "failed";
  return "sent";
}

function createConversationsCore({ repositories, generateId, nowIso, whatsappProvider, crm, sseHub }) {
  async function ensureConversationExistsByLead(lead) {
    return repositories.conversations.ensureForLead({
      id: generateId("convbox"),
      leadId: lead.id,
      ownerId: lead.owner_id || null,
      ownerName: lead.owner_name || null,
      archived: lead.archived || 0,
      createdAt: lead.created_at || nowIso(),
      updatedAt: lead.updated_at || nowIso()
    });
  }

  function emit(type, data) {
    sseHub.broadcast({ type, data });
  }

  async function listConversations(input) {
    const cursor = decodeCursor(input.cursor);
    const limit = Math.max(1, Math.min(100, Number(input.limit || 20)));

    const rows = await repositories.conversations.listInbox({
      status: input.status || null,
      temperature: input.temperature || null,
      ownerId: input.ownerId || null,
      attentionRequired: typeof input.attentionRequired === "boolean" ? input.attentionRequired : null,
      query: input.query || null,
      cursorUpdatedAt: cursor?.updatedAt || null,
      cursorLeadId: cursor?.leadId || null,
      limit
    });

    const hasMore = rows.length > limit;
    const selected = hasMore ? rows.slice(0, limit) : rows;
    const items = selected.map(mapConversationRow);

    const lastRow = selected[selected.length - 1];
    const nextCursor = hasMore
      ? encodeCursor({
          updatedAt: lastRow.updated_at,
          leadId: lastRow.id
        })
      : null;

    return {
      items,
      nextCursor
    };
  }

  async function getConversation(conversationId) {
    const row = await repositories.conversations.findDetailById(conversationId);
    if (!row) return null;
    return mapConversationRow(row);
  }

  async function getConversationByLeadId(leadId) {
    const row = await repositories.conversations.findDetailByLeadId(leadId);
    if (!row) return null;
    return mapConversationRow(row);
  }

  async function listConversationMessages(input) {
    const conversation = await repositories.conversations.findById(input.conversationId);
    if (!conversation) return null;

    const cursor = decodeCursor(input.cursor);
    const limit = Math.max(1, Math.min(100, Number(input.limit || 30)));

    const rows = await repositories.messages.listByLeadDescCursor(
      conversation.lead_id,
      limit + 1,
      cursor?.createdAt || null,
      cursor?.messageId || null
    );

    const hasMore = rows.length > limit;
    const selected = hasMore ? rows.slice(0, limit) : rows;

    const messages = [];
    for (const row of selected.reverse()) {
      const mediaRows = await repositories.messageMedia.listByMessageId(row.id);
      const deliveryHistory = await repositories.messageDelivery.listByMessageId(row.id);
      messages.push({
        id: row.id,
        providerMessageId: row.provider_message_id || row.message_sid || null,
        direction: row.direction,
        type: row.message_type,
        body: row.body || "",
        preview: row.preview,
        mode: row.mode || "real",
        deliveryStatus: row.delivery_status || "received",
        timestamps: {
          queuedAt: row.queued_at || null,
          sendingAt: row.sending_at || null,
          sentAt: row.sent_at || null,
          deliveredAt: row.delivered_at || null,
          readAt: row.read_at || null,
          failedAt: row.failed_at || null,
          createdAt: row.created_at
        },
        failedReason: row.failed_reason || null,
        templateId: row.template_id || null,
        media: mediaRows.map((item) => ({
          id: item.id,
          index: item.media_index,
          url: item.media_url,
          contentType: item.content_type
        })),
        deliveryHistory: deliveryHistory.map((item) => ({
          id: item.id,
          status: item.delivery_status,
          createdAt: item.created_at
        }))
      });
    }

    const lastRow = selected[selected.length - 1];
    const nextCursor = hasMore
      ? encodeCursor({
          createdAt: lastRow.created_at,
          messageId: lastRow.id
        })
      : null;

    return {
      items: messages,
      nextCursor
    };
  }

  async function updateConversationStatus(input) {
    if (!STATUS_SET.has(input.status)) {
      throw new Error("Invalid status.");
    }

    const detail = await repositories.conversations.findDetailById(input.conversationId);
    if (!detail) return null;

    const timestamp = nowIso();
    await repositories.leads.updateManualStatus({
      id: detail.id,
      status: input.status,
      pipelinePosition: getPipelinePosition(input.status),
      updatedAt: timestamp
    });
    await repositories.conversationState.updateCurrentStatus({
      leadId: detail.id,
      currentStatus: input.status,
      updatedAt: timestamp
    });

    const lead = await crm.fetchLeadViewById(detail.id);
    emit("conversation.updated", {
      conversationId: input.conversationId,
      leadId: detail.id,
      status: input.status,
      reason: input.reason || null
    });
    if (lead) sseHub.broadcast({ type: "lead.updated", lead });

    return getConversation(input.conversationId);
  }

  async function updateConversationOwner(input) {
    const conversation = await repositories.conversations.findById(input.conversationId);
    if (!conversation) return null;

    let owner = null;
    if (input.ownerId) {
      owner = await repositories.auth.findOperatorById(input.ownerId);
      if (!owner) throw new Error("Owner not found.");
    }

    const timestamp = nowIso();
    await repositories.conversations.updateOwner({
      id: conversation.id,
      ownerId: owner?.id || null,
      ownerName: owner?.name || null,
      updatedAt: timestamp
    });

    await repositories.leads.updateOwner({
      id: conversation.lead_id,
      ownerId: owner?.id || null,
      ownerName: owner?.name || null,
      updatedAt: timestamp
    });

    emit("conversation.updated", {
      conversationId: input.conversationId,
      leadId: conversation.lead_id,
      ownerId: owner?.id || null,
      ownerName: owner?.name || null
    });

    return getConversation(input.conversationId);
  }

  async function getInsights(conversationId) {
    const row = await repositories.conversations.findDetailById(conversationId);
    if (!row) return null;

    return {
      summary: row.ai_summary || null,
      shortSummary: row.ai_short_summary || null,
      reason: row.ai_last_reason || null,
      confidence: Number(row.ai_last_confidence || 0),
      status: row.status,
      temperature: row.temperature,
      sentiment: row.sentiment || "neutral",
      interestLevel: row.interest_level || "unknown",
      riskLevel: row.risk_level || "low",
      nextAction: row.next_action || null,
      budgetText: row.budget_text || "Nao informado.",
      updatedAt: row.insights_updated_at || null
    };
  }

  async function trackDelivery(messageId, deliveryStatus, providerPayload, timestamp) {
    await repositories.messageDelivery.insertEvent({
      id: generateId("msg-delivery"),
      messageId,
      deliveryStatus,
      providerPayloadJson: providerPayload ? JSON.stringify(providerPayload) : null,
      createdAt: timestamp
    });
  }

  async function finalizeSimulated(messageId, leadId, timestamp) {
    for (const status of ["sending", "sent", "delivered"]) {
      await repositories.messages.updateDeliveryStatusById({
        id: messageId,
        deliveryStatus: status,
        failedReason: null,
        timestamp
      });
      await trackDelivery(messageId, status, null, timestamp);
    }

    emit("message.delivery_updated", {
      messageId,
      leadId,
      status: "delivered",
      at: timestamp
    });
  }

  async function sendMessage(input) {
    const detail = await repositories.conversations.findDetailById(input.conversationId);
    if (!detail) {
      throw new Error("Conversation not found.");
    }

    const lead = await repositories.leads.findById(detail.id);
    await ensureConversationExistsByLead(lead);

    const idempotencyKey = input.idempotencyKey ? String(input.idempotencyKey).trim() : null;
    if (idempotencyKey) {
      const existing = await repositories.messages.findByLeadAndIdempotencyKey(lead.id, idempotencyKey);
      if (existing) {
        return getMessageById(existing.id);
      }
    }

    let messageBody = "";
    let preview = "";
    let messageType = input.type || "text";
    let templateId = null;

    if (messageType === "template") {
      if (!input.templateId) throw new Error("template_id is required for template message.");
      const template = await repositories.templates.findById(input.templateId);
      if (!template || !template.is_active) throw new Error("Template not found or inactive.");
      const variables = input.variables || {};
      messageBody = renderTemplateBody(template.body, variables);
      preview = messageBody || `Template ${template.name}`;
      templateId = template.id;
    } else {
      messageBody = String(input.body || "").trim();
      if (!messageBody) throw new Error("body is required for text message.");
      preview = messageBody;
      messageType = "text";
    }

    const timestamp = nowIso();
    const mode = input.mode === "simulated" ? "simulated" : "real";

    const messageId = generateId("msg");
    await repositories.messages.insertOutboundMessage({
      id: messageId,
      leadId: lead.id,
      messageSid: null,
      providerMessageId: null,
      body: messageBody,
      preview,
      messageType,
      mediaCount: 0,
      rawPayloadJson: JSON.stringify({
        type: messageType,
        templateId,
        variables: input.variables || null,
        source: "api_v1"
      }),
      deliveryStatus: "queued",
      mode,
      idempotencyKey,
      templateId,
      queuedAt: timestamp,
      createdAt: timestamp
    });

    await trackDelivery(messageId, "queued", null, timestamp);
    await repositories.leads.updateOutboundCounters({
      id: lead.id,
      preview,
      timestamp
    });

    emit("message.outbound", {
      messageId,
      leadId: lead.id,
      conversationId: input.conversationId,
      status: "queued"
    });

    if (mode === "simulated") {
      await finalizeSimulated(messageId, lead.id, timestamp);
      crm.queueLeadAnalysis(lead.id, "outbound_message");
      return getMessageById(messageId);
    }

    await repositories.messages.updateDeliveryStatusById({
      id: messageId,
      deliveryStatus: "sending",
      failedReason: null,
      timestamp
    });
    await trackDelivery(messageId, "sending", null, timestamp);

    try {
      const sendResult = await whatsappProvider.sendTextMessage({
        to: lead.whatsapp_from || lead.phone,
        body: messageBody
      });

      await repositories.messages.updateProviderMessageId({
        id: messageId,
        providerMessageId: sendResult.providerMessageId
      });
      await repositories.messages.updateDeliveryStatusById({
        id: messageId,
        deliveryStatus: "sent",
        failedReason: null,
        timestamp: nowIso()
      });
      await trackDelivery(messageId, "sent", sendResult.providerPayload, nowIso());

      emit("message.delivery_updated", {
        messageId,
        leadId: lead.id,
        conversationId: input.conversationId,
        status: "sent",
        providerMessageId: sendResult.providerMessageId
      });
    } catch (err) {
      await repositories.messages.updateDeliveryStatusById({
        id: messageId,
        deliveryStatus: "failed",
        failedReason: err.message,
        timestamp: nowIso()
      });
      await trackDelivery(messageId, "failed", { error: err.message }, nowIso());

      emit("message.delivery_updated", {
        messageId,
        leadId: lead.id,
        conversationId: input.conversationId,
        status: "failed",
        error: err.message
      });
    }

    crm.queueLeadAnalysis(lead.id, "outbound_message");
    return getMessageById(messageId);
  }

  async function updateMessageDeliveryFromProvider(payload) {
    const providerMessageId = String(payload.MessageSid || payload.SmsSid || payload.message_sid || payload.id || "").trim();
    if (!providerMessageId) return null;

    const status = mapProviderStatus(payload.MessageStatus || payload.SmsStatus || payload.status);
    const timestamp = nowIso();

    const messageId = await repositories.messages.updateDeliveryStatusByProviderMessageId({
      providerMessageId,
      deliveryStatus: status,
      failedReason: payload.ErrorMessage || null,
      timestamp
    });

    if (!messageId) return null;

    await trackDelivery(messageId, status, payload, timestamp);

    const message = await repositories.messages.findById(messageId);
    if (!message) return null;

    emit("message.delivery_updated", {
      messageId,
      leadId: message.lead_id,
      providerMessageId,
      status
    });

    return message;
  }

  async function getMessageById(messageId) {
    const row = await repositories.messages.findById(messageId);
    if (!row) return null;

    const mediaRows = await repositories.messageMedia.listByMessageId(row.id);
    const deliveryHistory = await repositories.messageDelivery.listByMessageId(row.id);

    let conversation = await repositories.conversations.findByLeadId(row.lead_id);
    if (!conversation) {
      const lead = await repositories.leads.findById(row.lead_id);
      if (lead) conversation = await ensureConversationExistsByLead(lead);
    }

    return {
      id: row.id,
      conversationId: conversation?.id || null,
      leadId: row.lead_id,
      providerMessageId: row.provider_message_id || row.message_sid || null,
      direction: row.direction,
      type: row.message_type,
      body: row.body || "",
      preview: row.preview,
      mode: row.mode || "real",
      deliveryStatus: row.delivery_status || "received",
      failedReason: row.failed_reason || null,
      templateId: row.template_id || null,
      timestamps: {
        queuedAt: row.queued_at || null,
        sendingAt: row.sending_at || null,
        sentAt: row.sent_at || null,
        deliveredAt: row.delivered_at || null,
        readAt: row.read_at || null,
        failedAt: row.failed_at || null,
        createdAt: row.created_at
      },
      media: mediaRows.map((item) => ({
        id: item.id,
        index: item.media_index,
        url: item.media_url,
        contentType: item.content_type
      })),
      deliveryHistory: deliveryHistory.map((item) => ({
        id: item.id,
        status: item.delivery_status,
        createdAt: item.created_at
      }))
    };
  }

  async function getDashboardMetrics(input) {
    const summary = await repositories.leads.metricsSummary({
      ownerId: input.ownerId || null,
      from: input.from || null,
      to: input.to || null
    });

    return {
      ...summary,
      generatedAt: nowIso()
    };
  }

  return {
    listConversations,
    getConversation,
    getConversationByLeadId,
    listConversationMessages,
    updateConversationStatus,
    updateConversationOwner,
    getInsights,
    sendMessage,
    updateMessageDeliveryFromProvider,
    getMessageById,
    getDashboardMetrics
  };
}

module.exports = {
  createConversationsCore
};
