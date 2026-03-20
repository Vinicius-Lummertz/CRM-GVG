"use strict";

function createMessagesRepository(db) {
  async function findByLeadAndMessageSid(leadId, messageSid) {
    return db.get("SELECT id FROM messages WHERE lead_id = ? AND message_sid = ?", [leadId, messageSid]);
  }

  async function findByLeadAndIdempotencyKey(leadId, idempotencyKey) {
    if (!idempotencyKey) return null;
    return db.get("SELECT * FROM messages WHERE lead_id = ? AND idempotency_key = ?", [leadId, idempotencyKey]);
  }

  async function findById(messageId) {
    return db.get("SELECT * FROM messages WHERE id = ?", [messageId]);
  }

  async function getCreatedAtById(leadId, messageId) {
    return db.get("SELECT created_at FROM messages WHERE id = ? AND lead_id = ?", [messageId, leadId]);
  }

  async function insertInboundMessage(input) {
    await db.run(
      `
        INSERT INTO messages (
          id, lead_id, message_sid, direction, body, preview, message_type, media_count, first_media_url, first_media_content_type,
          raw_payload_json, ai_relevant, sent_by_customer, delivery_status, mode, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.leadId,
        input.messageSid,
        "inbound",
        input.body,
        input.preview,
        input.messageType,
        input.mediaCount,
        input.firstMediaUrl,
        input.firstMediaContentType,
        input.rawPayloadJson,
        1,
        1,
        "received",
        input.mode || "real",
        input.createdAt
      ]
    );
  }

  async function insertOutboundMessage(input) {
    await db.run(
      `
        INSERT INTO messages (
          id, lead_id, message_sid, provider_message_id, direction, body, preview, message_type, media_count,
          first_media_url, first_media_content_type, raw_payload_json, ai_relevant, sent_by_customer,
          delivery_status, mode, idempotency_key, template_id, queued_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.leadId,
        input.messageSid || null,
        input.providerMessageId || null,
        "outbound",
        input.body || "",
        input.preview,
        input.messageType || "text",
        input.mediaCount || 0,
        input.firstMediaUrl || null,
        input.firstMediaContentType || null,
        input.rawPayloadJson || null,
        1,
        0,
        input.deliveryStatus || "queued",
        input.mode || "real",
        input.idempotencyKey || null,
        input.templateId || null,
        input.queuedAt,
        input.createdAt
      ]
    );
  }

  async function updateProviderMessageId(input) {
    await db.run("UPDATE messages SET provider_message_id = ?, message_sid = COALESCE(message_sid, ?) WHERE id = ?", [
      input.providerMessageId || null,
      input.providerMessageId || null,
      input.id
    ]);
  }

  async function updateDeliveryStatusById(input) {
    const timestampColumnMap = {
      queued: "queued_at",
      sending: "sending_at",
      sent: "sent_at",
      delivered: "delivered_at",
      read: "read_at",
      failed: "failed_at",
      received: "created_at"
    };

    const timestampColumn = timestampColumnMap[input.deliveryStatus] || null;

    if (timestampColumn) {
      await db.run(
        `
          UPDATE messages
          SET delivery_status = ?, failed_reason = ?, ${timestampColumn} = COALESCE(${timestampColumn}, ?)
          WHERE id = ?
        `,
        [input.deliveryStatus, input.failedReason || null, input.timestamp, input.id]
      );
      return;
    }

    await db.run("UPDATE messages SET delivery_status = ?, failed_reason = ? WHERE id = ?", [
      input.deliveryStatus,
      input.failedReason || null,
      input.id
    ]);
  }

  async function updateDeliveryStatusByProviderMessageId(input) {
    const row = await db.get("SELECT id FROM messages WHERE provider_message_id = ? OR message_sid = ? LIMIT 1", [
      input.providerMessageId,
      input.providerMessageId
    ]);
    if (!row) return null;

    await updateDeliveryStatusById({
      id: row.id,
      deliveryStatus: input.deliveryStatus,
      failedReason: input.failedReason,
      timestamp: input.timestamp
    });

    return row.id;
  }

  async function listByLeadDescLimit(leadId, limit) {
    return db.all("SELECT * FROM messages WHERE lead_id = ? ORDER BY datetime(created_at) DESC LIMIT ?", [leadId, limit]);
  }

  async function listByLeadDescCursor(leadId, limit, cursorCreatedAt, cursorId) {
    if (!cursorCreatedAt || !cursorId) {
      return listByLeadDescLimit(leadId, limit);
    }

    return db.all(
      `
        SELECT *
        FROM messages
        WHERE lead_id = ?
          AND (
            datetime(created_at) < datetime(?)
            OR (datetime(created_at) = datetime(?) AND id < ?)
          )
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT ?
      `,
      [leadId, cursorCreatedAt, cursorCreatedAt, cursorId, limit]
    );
  }

  async function listByLeadAfterTimestamp(leadId, createdAt) {
    return db.all(
      "SELECT id, direction, preview, created_at FROM messages WHERE lead_id = ? AND datetime(created_at) > datetime(?) ORDER BY datetime(created_at) ASC",
      [leadId, createdAt]
    );
  }

  async function listRecentForAnalysis(leadId, limit) {
    return db.all(
      "SELECT id, direction, preview, created_at FROM messages WHERE lead_id = ? ORDER BY datetime(created_at) DESC LIMIT ?",
      [leadId, limit]
    );
  }

  async function findLatestByLead(leadId) {
    return db.get("SELECT * FROM messages WHERE lead_id = ? ORDER BY datetime(created_at) DESC LIMIT 1", [leadId]);
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

module.exports = {
  createMessagesRepository
};
