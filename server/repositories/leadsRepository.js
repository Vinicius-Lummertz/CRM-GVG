"use strict";

function createLeadsRepository(db) {
  async function findById(leadId) {
    return db.get("SELECT * FROM leads WHERE id = ?", [leadId]);
  }

  async function findByExternalKey(externalKey) {
    return db.get("SELECT * FROM leads WHERE external_key = ?", [externalKey]);
  }

  async function insertLead(input) {
    await db.run(
      `
        INSERT INTO leads (
          id, external_key, phone, whatsapp_from, wa_id, name, source, status, pipeline_position, priority_score, temperature,
          last_message, last_message_preview, unread_count, message_count_total, inbound_count, outbound_count, media_count,
          messages_after_last_resume, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.externalKey,
        input.phone,
        input.whatsappFrom,
        input.waId,
        input.name,
        input.source,
        input.status,
        input.pipelinePosition,
        input.priorityScore,
        input.temperature,
        input.lastMessage,
        input.lastMessagePreview,
        input.unreadCount,
        input.messageCountTotal,
        input.inboundCount,
        input.outboundCount,
        input.mediaCount,
        input.messagesAfterLastResume,
        input.createdAt,
        input.updatedAt
      ]
    );
  }

  async function updateIdentity(input) {
    await db.run(
      "UPDATE leads SET phone = ?, whatsapp_from = ?, wa_id = ?, name = ?, updated_at = ? WHERE id = ?",
      [input.phone, input.whatsappFrom, input.waId, input.name, input.updatedAt, input.id]
    );
  }

  async function updateInboundCounters(input) {
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
        input.preview,
        input.preview,
        input.timestamp,
        input.timestamp,
        input.mediaCount,
        input.priorityScore,
        input.temperature,
        input.pipelinePosition,
        input.timestamp,
        input.id
      ]
    );
  }

  async function updateAfterAnalysis(input) {
    await db.run(
      `
        UPDATE leads
        SET status = ?, pipeline_position = ?, priority_score = ?, temperature = ?, ai_summary = ?, ai_last_reason = ?, ai_last_confidence = ?,
            messages_after_last_resume = 0, last_analyzed_message_id = ?, last_analysis_at = ?, updated_at = ?
        WHERE id = ?
      `,
      [
        input.status,
        input.pipelinePosition,
        input.priorityScore,
        input.temperature,
        input.aiSummary,
        input.aiLastReason,
        input.aiLastConfidence,
        input.lastAnalyzedMessageId,
        input.lastAnalysisAt,
        input.updatedAt,
        input.id
      ]
    );
  }

  async function listActiveLeads(filters) {
    const where = ["archived = 0"];
    const params = [];

    if (filters.status) {
      where.push("status = ?");
      params.push(filters.status);
    }
    if (filters.temperature) {
      where.push("temperature = ?");
      params.push(filters.temperature);
    }

    return db.all(
      `SELECT * FROM leads WHERE ${where.join(" AND ")} ORDER BY priority_score DESC, datetime(last_message_at) DESC`,
      params
    );
  }

  return {
    findById,
    findByExternalKey,
    insertLead,
    updateIdentity,
    updateInboundCounters,
    updateAfterAnalysis,
    listActiveLeads
  };
}

module.exports = {
  createLeadsRepository
};
