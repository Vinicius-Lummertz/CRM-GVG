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

  async function updateManualStatus(input) {
    await db.run(
      `
        UPDATE leads
        SET status = ?, pipeline_position = ?, updated_at = ?
        WHERE id = ?
      `,
      [input.status, input.pipelinePosition, input.updatedAt, input.id]
    );
  }

  async function updateOwner(input) {
    await db.run(
      "UPDATE leads SET owner_id = ?, owner_name = ?, updated_at = ? WHERE id = ?",
      [input.ownerId || null, input.ownerName || null, input.updatedAt, input.id]
    );
  }

  async function updateOutboundCounters(input) {
    await db.run(
      `
        UPDATE leads
        SET
          last_message = ?, last_message_preview = ?, last_message_at = ?, last_outbound_at = ?,
          message_count_total = COALESCE(message_count_total, 0) + 1, outbound_count = COALESCE(outbound_count, 0) + 1,
          updated_at = ?
        WHERE id = ?
      `,
      [input.preview, input.preview, input.timestamp, input.timestamp, input.timestamp, input.id]
    );
  }

  async function touchUpdatedAt(input) {
    await db.run("UPDATE leads SET updated_at = ? WHERE id = ?", [input.updatedAt, input.id]);
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

  async function metricsSummary(input) {
    const where = ["archived = 0"];
    const params = [];

    if (input.ownerId) {
      where.push("owner_id = ?");
      params.push(input.ownerId);
    }
    if (input.from) {
      where.push("datetime(updated_at) >= datetime(?)");
      params.push(input.from);
    }
    if (input.to) {
      where.push("datetime(updated_at) <= datetime(?)");
      params.push(input.to);
    }

    const baseWhere = where.join(" AND ");

    const [totals, hotLeads, wonLeads, lostLeads] = await Promise.all([
      db.get(`SELECT COUNT(*) AS total FROM leads WHERE ${baseWhere}`, params),
      db.get(`SELECT COUNT(*) AS total FROM leads WHERE ${baseWhere} AND temperature = 'hot'`, params),
      db.get(`SELECT COUNT(*) AS total FROM leads WHERE ${baseWhere} AND status = 'ganho'`, params),
      db.get(`SELECT COUNT(*) AS total FROM leads WHERE ${baseWhere} AND status = 'perdido'`, params)
    ]);

    return {
      totalLeads: totals?.total || 0,
      hotLeads: hotLeads?.total || 0,
      wonLeads: wonLeads?.total || 0,
      lostLeads: lostLeads?.total || 0
    };
  }

  return {
    findById,
    findByExternalKey,
    insertLead,
    updateIdentity,
    updateInboundCounters,
    updateAfterAnalysis,
    updateManualStatus,
    updateOwner,
    updateOutboundCounters,
    touchUpdatedAt,
    listActiveLeads,
    metricsSummary
  };
}

module.exports = {
  createLeadsRepository
};
