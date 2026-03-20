"use strict";

function createMessagesRepository(db) {
  async function findByLeadAndMessageSid(leadId, messageSid) {
    return db.get("SELECT id FROM messages WHERE lead_id = ? AND message_sid = ?", [leadId, messageSid]);
  }

  async function findById(messageId) {
    return db.get("SELECT id FROM messages WHERE id = ?", [messageId]);
  }

  async function getCreatedAtById(leadId, messageId) {
    return db.get("SELECT created_at FROM messages WHERE id = ? AND lead_id = ?", [messageId, leadId]);
  }

  async function insertInboundMessage(input) {
    await db.run(
      `
        INSERT INTO messages (
          id, lead_id, message_sid, direction, body, preview, message_type, media_count, first_media_url, first_media_content_type,
          raw_payload_json, ai_relevant, sent_by_customer, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        input.createdAt
      ]
    );
  }

  async function listByLeadDescLimit(leadId, limit) {
    return db.all("SELECT * FROM messages WHERE lead_id = ? ORDER BY datetime(created_at) DESC LIMIT ?", [leadId, limit]);
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
    findById,
    getCreatedAtById,
    insertInboundMessage,
    listByLeadDescLimit,
    listByLeadAfterTimestamp,
    listRecentForAnalysis,
    findLatestByLead
  };
}

module.exports = {
  createMessagesRepository
};
