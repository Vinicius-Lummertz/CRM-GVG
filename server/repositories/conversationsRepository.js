"use strict";

function createConversationsRepository(db) {
  const DETAIL_SELECT = `
    SELECT
      c.id AS conversation_id,
      c.lead_id AS conversation_lead_id,
      c.owner_id AS conversation_owner_id,
      c.owner_name AS conversation_owner_name,
      c.archived AS conversation_archived,
      c.created_at AS conversation_created_at,
      c.updated_at AS conversation_updated_at,
      l.*,
      cs.ai_short_summary,
      cs.attention_required,
      cs.sentiment,
      cs.interest_level,
      cs.risk_level,
      cs.next_action,
      cs.budget_text,
      cs.updated_at AS insights_updated_at
    FROM conversations c
    INNER JOIN leads l ON l.id = c.lead_id
    LEFT JOIN conversation_state cs ON cs.lead_id = l.id
  `;

  async function findById(conversationId) {
    return db.get("SELECT * FROM conversations WHERE id = ?", [conversationId]);
  }

  async function findByLeadId(leadId) {
    return db.get("SELECT * FROM conversations WHERE lead_id = ?", [leadId]);
  }

  async function findDetailById(conversationId) {
    return db.get(`${DETAIL_SELECT} WHERE c.id = ?`, [conversationId]);
  }

  async function findDetailByLeadId(leadId) {
    return db.get(`${DETAIL_SELECT} WHERE c.lead_id = ?`, [leadId]);
  }

  async function ensureForLead(input) {
    let row = await findByLeadId(input.leadId);
    if (row) return row;

    await db.run(
      `
        INSERT INTO conversations (id, lead_id, owner_id, owner_name, archived, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.leadId,
        input.ownerId || null,
        input.ownerName || null,
        input.archived || 0,
        input.createdAt,
        input.updatedAt
      ]
    );

    row = await findByLeadId(input.leadId);
    return row;
  }

  async function updateOwner(input) {
    await db.run(
      "UPDATE conversations SET owner_id = ?, owner_name = ?, updated_at = ? WHERE id = ?",
      [input.ownerId || null, input.ownerName || null, input.updatedAt, input.id]
    );
  }

  async function listInbox(input) {
    const where = ["c.archived = 0", "l.archived = 0"];
    const params = [];

    if (input.status) {
      where.push("l.status = ?");
      params.push(input.status);
    }
    if (input.temperature) {
      where.push("l.temperature = ?");
      params.push(input.temperature);
    }
    if (input.ownerId) {
      where.push("c.owner_id = ?");
      params.push(input.ownerId);
    }
    if (typeof input.attentionRequired === "boolean") {
      where.push("COALESCE(cs.attention_required, 0) = ?");
      params.push(input.attentionRequired ? 1 : 0);
    }
    if (input.query) {
      where.push("(lower(l.name) LIKE lower(?) OR l.phone LIKE ? OR lower(COALESCE(l.last_message_preview, '')) LIKE lower(?))");
      const pattern = `%${input.query}%`;
      params.push(pattern, pattern, pattern);
    }
    if (input.cursorUpdatedAt && input.cursorLeadId) {
      where.push("(l.updated_at < ? OR (l.updated_at = ? AND l.id < ?))");
      params.push(input.cursorUpdatedAt, input.cursorUpdatedAt, input.cursorLeadId);
    }

    const limit = Math.max(1, Math.min(100, Number(input.limit || 20)));
    params.push(limit + 1);

    const rows = await db.all(
      `
        ${DETAIL_SELECT}
        WHERE ${where.join(" AND ")}
        ORDER BY l.updated_at DESC, l.id DESC
        LIMIT ?
      `,
      params
    );

    return rows;
  }

  return {
    findById,
    findByLeadId,
    findDetailById,
    findDetailByLeadId,
    ensureForLead,
    updateOwner,
    listInbox
  };
}

module.exports = {
  createConversationsRepository
};
