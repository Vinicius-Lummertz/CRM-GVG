"use strict";

const { assertNoError } = require("./supabaseUtils");

function createMessagesRepository(db) {
  async function findByLeadAndMessageSid(leadId, messageSid) {
    const { data, error } = await db.from("messages").select("id").eq("lead_id", leadId).eq("message_sid", messageSid).maybeSingle();
    assertNoError(error);
    return data;
  }

  async function findByLeadAndIdempotencyKey(leadId, idempotencyKey) {
    if (!idempotencyKey) return null;
    const { data, error } = await db.from("messages").select("*").eq("lead_id", leadId).eq("idempotency_key", idempotencyKey).maybeSingle();
    assertNoError(error);
    return data;
  }

  async function findById(messageId) {
    const { data, error } = await db.from("messages").select("*").eq("id", messageId).maybeSingle();
    assertNoError(error);
    return data;
  }

  async function getCreatedAtById(leadId, messageId) {
    const { data, error } = await db.from("messages").select("created_at").eq("id", messageId).eq("lead_id", leadId).maybeSingle();
    assertNoError(error);
    return data;
  }

  async function insertInboundMessage(input) {
    const { error } = await db.from("messages").insert({
      id: input.id,
      lead_id: input.leadId,
      message_sid: input.messageSid,
      direction: "inbound",
      body: input.body,
      preview: input.preview,
      message_type: input.messageType,
      media_count: input.mediaCount,
      first_media_url: input.firstMediaUrl,
      first_media_content_type: input.firstMediaContentType,
      raw_payload_json: input.rawPayloadJson,
      ai_relevant: 1,
      sent_by_customer: 1,
      delivery_status: "received",
      mode: input.mode || "real",
      created_at: input.createdAt
    });
    assertNoError(error);
  }

  async function insertOutboundMessage(input) {
    const { error } = await db.from("messages").insert({
      id: input.id,
      lead_id: input.leadId,
      message_sid: input.messageSid || null,
      provider_message_id: input.providerMessageId || null,
      direction: "outbound",
      body: input.body || "",
      preview: input.preview,
      message_type: input.messageType || "text",
      media_count: input.mediaCount || 0,
      first_media_url: input.firstMediaUrl || null,
      first_media_content_type: input.firstMediaContentType || null,
      raw_payload_json: input.rawPayloadJson || null,
      ai_relevant: 1,
      sent_by_customer: 0,
      delivery_status: input.deliveryStatus || "queued",
      mode: input.mode || "real",
      idempotency_key: input.idempotencyKey || null,
      template_id: input.templateId || null,
      queued_at: input.queuedAt,
      created_at: input.createdAt
    });
    assertNoError(error);
  }

  async function updateProviderMessageId(input) {
    const message = await findById(input.id);
    if (!message) return;
    const { error } = await db.from("messages").update({
      provider_message_id: input.providerMessageId || null,
      message_sid: message.message_sid || input.providerMessageId || null
    }).eq("id", input.id);
    assertNoError(error);
  }

  async function updateDeliveryStatusById(input) {
    const message = await findById(input.id);
    if (!message) return;

    const timestampColumnMap = {
      queued: "queued_at",
      sending: "sending_at",
      sent: "sent_at",
      delivered: "delivered_at",
      read: "read_at",
      failed: "failed_at",
      received: "created_at"
    };

    const patch = {
      delivery_status: input.deliveryStatus,
      failed_reason: input.failedReason || null
    };

    const timestampColumn = timestampColumnMap[input.deliveryStatus] || null;
    if (timestampColumn && !message[timestampColumn]) {
      patch[timestampColumn] = input.timestamp;
    }

    const { error } = await db.from("messages").update(patch).eq("id", input.id);
    assertNoError(error);
  }

  async function updateDeliveryStatusByProviderMessageId(input) {
    const { data, error } = await db.from("messages").select("id").or(`provider_message_id.eq.${input.providerMessageId},message_sid.eq.${input.providerMessageId}`).limit(1).maybeSingle();
    assertNoError(error);
    if (!data) return null;

    await updateDeliveryStatusById({
      id: data.id,
      deliveryStatus: input.deliveryStatus,
      failedReason: input.failedReason,
      timestamp: input.timestamp
    });

    return data.id;
  }

  async function listByLeadDescLimit(leadId, limit) {
    const { data, error } = await db.from("messages").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(limit);
    assertNoError(error);
    return data || [];
  }

  async function listByLeadDescCursor(leadId, limit, cursorCreatedAt, cursorId) {
    if (!cursorCreatedAt || !cursorId) return listByLeadDescLimit(leadId, limit);
    const { data, error } = await db.from("messages").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(500);
    assertNoError(error);
    return (data || []).filter((row) => row.created_at < cursorCreatedAt || (row.created_at === cursorCreatedAt && row.id < cursorId)).slice(0, limit);
  }

  async function listByLeadAfterTimestamp(leadId, createdAt) {
    const { data, error } = await db.from("messages").select("id,direction,preview,created_at").eq("lead_id", leadId).gt("created_at", createdAt).order("created_at", { ascending: true });
    assertNoError(error);
    return data || [];
  }

  async function listRecentForAnalysis(leadId, limit) {
    const { data, error } = await db.from("messages").select("id,direction,preview,created_at").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(limit);
    assertNoError(error);
    return data || [];
  }

  async function findLatestByLead(leadId) {
    const rows = await listByLeadDescLimit(leadId, 1);
    return rows[0] || null;
  }

  return {
    findByLeadAndMessageSid,
    findByLeadAndIdempotencyKey,
    findById,
    getCreatedAtById,
    insertInboundMessage,
    insertOutboundMessage,
    updateProviderMessageId,
    updateDeliveryStatusById,
    updateDeliveryStatusByProviderMessageId,
    listByLeadDescLimit,
    listByLeadDescCursor,
    listByLeadAfterTimestamp,
    listRecentForAnalysis,
    findLatestByLead
  };
}

module.exports = { createMessagesRepository };
