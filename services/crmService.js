"use strict";

const crypto = require("crypto");
const {
  STATUS_VALUES,
  EVENT_TYPE_VALUES,
  TEMPERATURE_VALUES,
  classifyConversationWithOpenAI
} = require("./openaiClassifier");

const STATUS_SET = new Set(STATUS_VALUES);
const EVENT_TYPE_SET = new Set(EVENT_TYPE_VALUES);
const TEMPERATURE_SET = new Set(TEMPERATURE_VALUES);

const STRONG_TRIGGER_TERMS = [
  "aceito",
  "fechado",
  "pode fechar",
  "quero seguir",
  "bora fechar",
  "me manda o pagamento",
  "vamos continuar",
  "nao quero",
  "desisti",
  "sem interesse",
  "nao tenho interesse",
  "caro demais",
  "vou pensar",
  "recuso",
  "nao vou continuar"
];

const STATUS_BASE_SCORE = {
  lead: 30,
  em_contato: 45,
  interessado: 60,
  proposta_enviada: 72,
  negociando: 82,
  ganho: 95,
  perdido: 6,
  inativo: 10
};

const PIPELINE_POSITION = {
  lead: 0,
  em_contato: 1,
  interessado: 2,
  proposta_enviada: 3,
  negociando: 4,
  ganho: 5,
  perdido: 6,
  inativo: 7
};

function nowIso() {
  return new Date().toISOString();
}

function generateId(prefix) {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function normalizeWhatsappFrom(fromValue) {
  return String(fromValue || "").replace(/^whatsapp:/i, "").trim();
}

function extractLeadIdentity(payload) {
  const from = payload.From ? String(payload.From).trim() : "";
  const waId = payload.WaId ? String(payload.WaId).trim() : "";
  const profileName = payload.ProfileName ? String(payload.ProfileName).trim() : "";
  const normalizedFrom = normalizeWhatsappFrom(from);
  return {
    externalKey: waId || normalizedFrom || generateId("external"),
    phone: waId || normalizedFrom || "",
    whatsappFrom: from || "",
    waId: waId || null,
    name: profileName || "Sem nome"
  };
}

function parseIncomingNumMedia(payload) {
  const parsed = Number.parseInt(String(payload.NumMedia || "0"), 10);
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

function extractIncomingMedia(payload) {
  const numMedia = parseIncomingNumMedia(payload);
  const mediaItems = [];
  for (let index = 0; index < numMedia; index += 1) {
    mediaItems.push({
      index,
      url: payload[`MediaUrl${index}`] ? String(payload[`MediaUrl${index}`]).trim() : null,
      contentType: payload[`MediaContentType${index}`] ? String(payload[`MediaContentType${index}`]).trim() : null
    });
  }
  return mediaItems;
}

function buildMessagePreview(payload, mediaItems) {
  const body = String(payload.Body || "").trim();
  if (body) return body;
  if (!mediaItems.length) return "Sem mensagem";

  const firstType = mediaItems[0].contentType ? String(mediaItems[0].contentType).toLowerCase() : "";
  if (firstType === "image/webp") return "\u{1F4AC} Figurinha";
  if (firstType.startsWith("image/")) return "\u{1F4F7} Imagem";
  if (firstType.startsWith("video/")) return "\u{1F3A5} Video";
  if (firstType.startsWith("audio/")) return "\u{1F3B5} Audio";
  if (firstType === "application/pdf") return "\u{1F4C4} PDF";
  if (firstType.startsWith("text/")) return "\u{1F4C4} Documento de texto";
  if (firstType.startsWith("application/")) return "\u{1F4C4} Documento";
  return "\u{1F4CE} Midia recebida";
}

function inferMessageType(rawBody, mediaItems) {
  if (String(rawBody || "").trim()) return "text";
  if (!mediaItems.length) return "text";
  const firstType = mediaItems[0].contentType ? String(mediaItems[0].contentType).toLowerCase() : "";
  if (firstType === "image/webp") return "sticker";
  if (firstType.startsWith("image/")) return "image";
  if (firstType.startsWith("video/")) return "video";
  if (firstType.startsWith("audio/")) return "audio";
  if (firstType.startsWith("application/") || firstType.startsWith("text/")) return "document";
  return "media";
}

function normalizeTriggerText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectStrongTrigger(text) {
  const normalized = normalizeTriggerText(text);
  if (!normalized) return false;
  return STRONG_TRIGGER_TERMS.some((term) => normalized.includes(term));
}

function computeTemperatureFromScore(score) {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

function computePriorityScore({ status, messageCountTotal, lastMessageAt, strongTriggerDetected }) {
  let score = STATUS_BASE_SCORE[status] ?? 25;
  score += Math.min(15, (Number(messageCountTotal) || 0) / 2);
  if (lastMessageAt) {
    const ageHours = (Date.now() - new Date(lastMessageAt).getTime()) / 3600000;
    if (ageHours <= 6) score += 12;
    else if (ageHours <= 24) score += 8;
    else if (ageHours <= 72) score += 4;
  }
  if (strongTriggerDetected) score += 10;
  if (status === "perdido" || status === "inativo") score = Math.min(score, 20);
  return Math.max(0, Math.min(100, Number(score.toFixed(2))));
}

function getPipelinePosition(status) {
  return PIPELINE_POSITION[status] ?? 0;
}

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

function createCrmService({ db, openAiApiKey, openAiModel, emitLeadUpdated }) {
  const analysisInFlight = new Set();

  async function ensureConversationState(leadId, leadRow = null) {
    let state = await db.get("SELECT * FROM conversation_state WHERE lead_id = ?", [leadId]);
    if (state) return state;
    const lead = leadRow || (await db.get("SELECT * FROM leads WHERE id = ?", [leadId]));
    const timestamp = nowIso();
    await db.run(
      `
        INSERT INTO conversation_state (
          id, lead_id, current_status, current_stage_label, ai_summary, ai_short_summary, ai_last_reason, ai_last_confidence,
          messages_after_last_resume, attention_required, sentiment, interest_level, risk_level, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        generateId("conv"),
        leadId,
        lead?.status || "lead",
        lead?.status || "lead",
        lead?.ai_summary || null,
        lead?.ai_summary || null,
        lead?.ai_last_reason || null,
        lead?.ai_last_confidence || 0,
        lead?.messages_after_last_resume || 0,
        0,
        "neutral",
        "unknown",
        "low",
        timestamp,
        timestamp
      ]
    );
    state = await db.get("SELECT * FROM conversation_state WHERE lead_id = ?", [leadId]);
    return state;
  }

  async function fetchLatestMessageForLead(leadId) {
    const row = await db.get("SELECT * FROM messages WHERE lead_id = ? ORDER BY datetime(created_at) DESC LIMIT 1", [leadId]);
    if (!row) return null;
    const mediaRows = await db.all("SELECT * FROM message_media WHERE message_id = ? ORDER BY media_index ASC", [row.id]);
    return {
      id: row.id,
      messageSid: row.message_sid || null,
      direction: row.direction,
      body: row.body || "",
      preview: row.preview,
      messageType: row.message_type,
      numMedia: row.media_count || 0,
      media: mediaRows.map((item) => ({
        id: item.id,
        index: item.media_index,
        url: item.media_url,
        contentType: item.content_type
      })),
      createdAt: row.created_at
    };
  }

  async function fetchLeadViewById(leadId) {
    const lead = await db.get("SELECT * FROM leads WHERE id = ?", [leadId]);
    if (!lead) return null;
    const state = await ensureConversationState(leadId, lead);
    const latestMessage = await fetchLatestMessageForLead(leadId);
    return mapLeadView(lead, state, latestMessage);
  }

  async function getMessagesForAnalysis(leadId, lastAnalyzedMessageId) {
    let rows = [];
    if (lastAnalyzedMessageId) {
      const pivot = await db.get("SELECT created_at FROM messages WHERE id = ? AND lead_id = ?", [lastAnalyzedMessageId, leadId]);
      if (pivot && pivot.created_at) {
        rows = await db.all(
          "SELECT id, direction, preview, created_at FROM messages WHERE lead_id = ? AND datetime(created_at) > datetime(?) ORDER BY datetime(created_at) ASC",
          [leadId, pivot.created_at]
        );
      }
    }
    if (!rows.length) {
      rows = (
        await db.all(
          "SELECT id, direction, preview, created_at FROM messages WHERE lead_id = ? ORDER BY datetime(created_at) DESC LIMIT 15",
          [leadId]
        )
      ).reverse();
    }
    if (rows.length > 15) rows = rows.slice(-15);
    return rows;
  }

  async function upsertLeadFromWebhook(identity, timestamp) {
    let lead = await db.get("SELECT * FROM leads WHERE external_key = ?", [identity.externalKey]);
    if (!lead) {
      const leadId = generateId("lead");
      await db.run(
        `
        INSERT INTO leads (
          id, external_key, phone, whatsapp_from, wa_id, name, source, status, pipeline_position, priority_score, temperature,
          last_message, last_message_preview, unread_count, message_count_total, inbound_count, outbound_count, media_count,
          messages_after_last_resume, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        leadId,
        identity.externalKey,
        identity.phone || "",
          identity.whatsappFrom || null,
          identity.waId,
          identity.name || "Sem nome",
          "whatsapp",
        "lead",
        0,
        0,
        "cold",
        "Sem mensagem",
        "Sem mensagem",
        0,
        0,
        0,
        0,
        0,
          0,
          timestamp,
          timestamp
        ]
      );
      lead = await db.get("SELECT * FROM leads WHERE id = ?", [leadId]);
      await ensureConversationState(leadId, lead);
      return lead;
    }

    await db.run(
      "UPDATE leads SET phone = ?, whatsapp_from = ?, wa_id = ?, name = ?, updated_at = ? WHERE id = ?",
      [
        identity.phone || lead.phone,
        identity.whatsappFrom || lead.whatsapp_from,
        identity.waId || lead.wa_id,
        identity.name || lead.name || "Sem nome",
        timestamp,
        lead.id
      ]
    );
    lead = await db.get("SELECT * FROM leads WHERE id = ?", [lead.id]);
    await ensureConversationState(lead.id, lead);
    return lead;
  }

  async function saveInboundMessage(input) {
    if (input.messageSid) {
      const existingBySid = await db.get("SELECT id FROM messages WHERE lead_id = ? AND message_sid = ?", [input.leadId, input.messageSid]);
      if (existingBySid) return { inserted: false, messageId: existingBySid.id, mediaCount: 0 };
    }
    const existingById = await db.get("SELECT id FROM messages WHERE id = ?", [input.messageId]);
    if (existingById) return { inserted: false, messageId: existingById.id, mediaCount: 0 };

    const firstMedia = input.mediaItems[0] || null;
    await db.run(
      `
        INSERT INTO messages (
          id, lead_id, message_sid, direction, body, preview, message_type, media_count, first_media_url, first_media_content_type,
          raw_payload_json, ai_relevant, sent_by_customer, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.messageId,
        input.leadId,
        input.messageSid || null,
        "inbound",
        input.rawBody || "",
        input.preview,
        input.messageType,
        input.mediaItems.length,
        firstMedia ? firstMedia.url : null,
        firstMedia ? firstMedia.contentType : null,
        JSON.stringify(input.rawPayload || {}),
        1,
        1,
        input.timestamp
      ]
    );

    for (const mediaItem of input.mediaItems) {
      await db.run(
        "INSERT INTO message_media (id, message_id, lead_id, media_index, media_url, content_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          generateId("media"),
          input.messageId,
          input.leadId,
          Number.isFinite(mediaItem.index) ? mediaItem.index : 0,
          mediaItem.url || null,
          mediaItem.contentType || null,
          input.timestamp
        ]
      );
    }

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
    await db.run(
      `
        UPDATE leads
        SET
          last_message = ?, last_message_preview = ?, last_message_at = ?, last_inbound_at = ?, unread_count = COALESCE(unread_count, 0) + 1,
          message_count_total = COALESCE(message_count_total, 0) + 1, inbound_count = COALESCE(inbound_count, 0) + 1,
          media_count = COALESCE(media_count, 0) + ?, messages_after_last_resume = COALESCE(messages_after_last_resume, 0) + 1,
          priority_score = ?, temperature = ?, pipeline_position = ?, updated_at = ?
        WHERE id = ?
      `,
      [
        context.preview,
        context.preview,
        context.timestamp,
        context.timestamp,
        context.mediaCount,
        nextPriority,
        computeTemperatureFromScore(nextPriority),
        getPipelinePosition(lead.status || "lead"),
        context.timestamp,
        lead.id
      ]
    );

    await ensureConversationState(lead.id, lead);
    await db.run(
      "UPDATE conversation_state SET current_status = ?, messages_after_last_resume = COALESCE(messages_after_last_resume, 0) + 1, updated_at = ? WHERE lead_id = ?",
      [lead.status || "lead", context.timestamp, lead.id]
    );
  }

  async function applyClassificationResult(params) {
    const timestamp = nowIso();
    const oldStatus = params.lead.status || "lead";
    const suggestedStatus = STATUS_SET.has(params.classification.new_status) ? params.classification.new_status : oldStatus;
    const confidence = Number.isFinite(params.classification.confidence) ? params.classification.confidence : 0;
    const applyStatus = Boolean(params.classification.should_update_status) && confidence >= 0.55;
    const appliedStatus = applyStatus ? suggestedStatus : oldStatus;
    const attentionRequired = confidence < 0.55 ? true : Boolean(params.classification.attention_required);

    const priorityScore = computePriorityScore({
      status: appliedStatus,
      messageCountTotal: params.lead.message_count_total || 0,
      lastMessageAt: params.lead.last_message_at,
      strongTriggerDetected: params.triggerReason === "strong_trigger"
    });
    const temperature = TEMPERATURE_SET.has(params.classification.temperature)
      ? params.classification.temperature
      : computeTemperatureFromScore(priorityScore);
    const lastAnalyzedMessageId = params.messages.length
      ? params.messages[params.messages.length - 1].id
      : params.state.last_analyzed_message_id;

    await db.run(
      `
        UPDATE leads
        SET status = ?, pipeline_position = ?, priority_score = ?, temperature = ?, ai_summary = ?, ai_last_reason = ?, ai_last_confidence = ?,
            messages_after_last_resume = 0, last_analyzed_message_id = ?, last_analysis_at = ?, updated_at = ?
        WHERE id = ?
      `,
      [
        appliedStatus,
        getPipelinePosition(appliedStatus),
        priorityScore,
        temperature,
        params.classification.summary,
        params.classification.reason,
        confidence,
        lastAnalyzedMessageId || null,
        timestamp,
        timestamp,
        params.lead.id
      ]
    );

    await db.run(
      `
        UPDATE conversation_state
        SET current_status = ?, current_stage_label = ?, ai_summary = ?, ai_short_summary = ?, ai_last_reason = ?, ai_last_confidence = ?,
            messages_after_last_resume = 0, last_analyzed_message_id = ?, last_analysis_at = ?, last_trigger_reason = ?, attention_required = ?,
            sentiment = ?, interest_level = ?, risk_level = ?, next_action = ?, updated_at = ?
        WHERE lead_id = ?
      `,
      [
        appliedStatus,
        appliedStatus,
        params.classification.summary,
        params.classification.short_summary,
        params.classification.reason,
        confidence,
        lastAnalyzedMessageId || null,
        timestamp,
        params.triggerReason,
        attentionRequired ? 1 : 0,
        params.classification.sentiment,
        params.classification.interest_level,
        params.classification.risk_level,
        params.classification.next_action,
        timestamp,
        params.lead.id
      ]
    );

    await db.run(
      `
        INSERT INTO ai_analysis_runs (
          id, lead_id, model, trigger_reason, input_messages_count, input_chars_count, old_status, suggested_status, applied_status,
          confidence, attention_required, request_payload_json, response_payload_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        generateId("ai-run"),
        params.lead.id,
        params.model,
        params.triggerReason,
        params.messages.length,
        params.messages.reduce((sum, item) => sum + String(item.preview || "").length, 0),
        oldStatus,
        suggestedStatus,
        appliedStatus,
        confidence,
        attentionRequired ? 1 : 0,
        JSON.stringify(params.requestPayload || {}),
        JSON.stringify(params.responsePayload || {}),
        timestamp
      ]
    );

    let eventType = EVENT_TYPE_SET.has(params.classification.event_type) ? params.classification.event_type : "none";
    if (confidence < 0.55) eventType = "attention_required";
    if (oldStatus !== appliedStatus && eventType === "none") eventType = "stage_changed";

    if (eventType !== "none") {
      await db.run(
        `
          INSERT INTO lead_events (
            id, lead_id, event_type, old_status, new_status, title, description, confidence, source, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          generateId("event"),
          params.lead.id,
          eventType,
          oldStatus,
          appliedStatus,
          oldStatus !== appliedStatus ? `Status alterado para ${appliedStatus}` : "Atualizacao de classificacao",
          params.classification.reason,
          confidence,
          "ai",
          timestamp
        ]
      );
    }

    await emitLeadUpdated(params.lead.id);
  }

  async function maybeAnalyzeLead(leadId, triggerReason) {
    const lead = await db.get("SELECT * FROM leads WHERE id = ?", [leadId]);
    if (!lead) return;
    const state = await ensureConversationState(lead.id, lead);
    if (!triggerReason && Number(state.messages_after_last_resume || 0) < 10) return;

    const messages = await getMessagesForAnalysis(lead.id, state.last_analyzed_message_id);
    if (!messages.length) return;
    if (!openAiApiKey) {
      console.log(`[analysis] skip lead=${lead.id} motivo=AI_API_KEY ausente`);
      return;
    }

    console.log(
      `[analysis] start lead=${lead.id} reason=${triggerReason || "batch_10_messages"} messages=${messages.length}`
    );

    const context = {
      current_status: state.current_status || lead.status || "lead",
      previous_summary: state.ai_summary || lead.ai_summary || "",
      recent_messages: messages.map((item) => ({
        direction: item.direction,
        preview: item.preview,
        created_at: item.created_at
      }))
    };

    try {
      const aiResult = await classifyConversationWithOpenAI({
        apiKey: openAiApiKey,
        model: openAiModel,
        context
      });
      await applyClassificationResult({
        lead,
        state,
        classification: aiResult.classification,
        triggerReason: triggerReason || "batch_10_messages",
        messages,
        requestPayload: aiResult.requestPayload,
        responsePayload: aiResult.responsePayload,
        model: aiResult.model
      });
      console.log(`[analysis] done lead=${lead.id} status=${aiResult.classification.new_status} confidence=${aiResult.classification.confidence}`);
    } catch (err) {
      console.error("[analysis] erro na IA:", err.message);
    }
  }

  function queueLeadAnalysis(leadId, triggerReason) {
    if (!leadId) return;
    if (analysisInFlight.has(leadId)) return;
    analysisInFlight.add(leadId);
    console.log(`[analysis] queued lead=${leadId} reason=${triggerReason || "batch_10_messages"}`);
    setImmediate(async () => {
      try {
        await maybeAnalyzeLead(leadId, triggerReason);
      } finally {
        analysisInFlight.delete(leadId);
      }
    });
  }

  async function processInboundWebhook(payload) {
    const timestamp = nowIso();
    const identity = extractLeadIdentity(payload);
    const rawBody = payload.Body ? String(payload.Body) : "";
    const messageSid = payload.MessageSid ? String(payload.MessageSid).trim() : "";
    const mediaItems = extractIncomingMedia(payload);
    const messagePreview = buildMessagePreview(payload, mediaItems);
    const messageType = inferMessageType(rawBody, mediaItems);
    const strongTriggerDetected = detectStrongTrigger(rawBody || messagePreview);

    let lead = await upsertLeadFromWebhook(identity, timestamp);
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
    const triggerReason = strongTriggerDetected ? "strong_trigger" : Number(state.messages_after_last_resume || 0) >= 10 ? "batch_10_messages" : null;
    if (triggerReason) {
      console.log(`[analysis] trigger detected lead=${lead.id} reason=${triggerReason}`);
    }
    return {
      leadId: lead.id,
      shouldAnalyze: savedMessage.inserted && Boolean(triggerReason),
      triggerReason
    };
  }

  async function listLeadViews(filters = {}) {
    const where = ["archived = 0"];
    const params = [];
    if (filters.status && STATUS_SET.has(filters.status)) {
      where.push("status = ?");
      params.push(filters.status);
    }
    if (filters.temperature && TEMPERATURE_SET.has(filters.temperature)) {
      where.push("temperature = ?");
      params.push(filters.temperature);
    }

    const rows = await db.all(
      `SELECT * FROM leads WHERE ${where.join(" AND ")} ORDER BY priority_score DESC, datetime(last_message_at) DESC`,
      params
    );

    const leads = [];
    for (const lead of rows) {
      const state = await ensureConversationState(lead.id, lead);
      if (typeof filters.attentionRequired === "boolean") {
        if (Boolean(state.attention_required || 0) !== filters.attentionRequired) continue;
      }
      const latestMessage = await fetchLatestMessageForLead(lead.id);
      leads.push(mapLeadView(lead, state, latestMessage));
    }
    return leads;
  }

  async function getLeadMessages(leadId, limit = 100) {
    const cappedLimit = Math.max(1, Math.min(200, limit));
    const rows = await db.all(
      "SELECT * FROM messages WHERE lead_id = ? ORDER BY datetime(created_at) DESC LIMIT ?",
      [leadId, cappedLimit]
    );
    const messages = [];
    for (const row of rows.reverse()) {
      const mediaRows = await db.all("SELECT * FROM message_media WHERE message_id = ? ORDER BY media_index ASC", [row.id]);
      messages.push({
        id: row.id,
        messageSid: row.message_sid || null,
        direction: row.direction,
        body: row.body || "",
        preview: row.preview,
        messageType: row.message_type,
        numMedia: row.media_count || 0,
        media: mediaRows.map((item) => ({
          id: item.id,
          index: item.media_index,
          url: item.media_url,
          contentType: item.content_type
        })),
        createdAt: row.created_at
      });
    }
    return messages;
  }

  return {
    extractIncomingMedia,
    buildMessagePreview,
    ensureConversationState,
    detectStrongTrigger,
    getMessagesForAnalysis,
    classifyConversationWithOpenAI,
    applyClassificationResult,
    computePriorityScore,
    upsertLeadFromWebhook,
    saveInboundMessage,
    processInboundWebhook,
    queueLeadAnalysis,
    listLeadViews,
    getLeadMessages,
    fetchLeadViewById
  };
}

module.exports = {
  createCrmService
};
