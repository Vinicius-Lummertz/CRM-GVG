"use strict";

function createLeadEventsRepository(db) {
  async function insertEvent(input) {
    await db.run(
      `
        INSERT INTO lead_events (
          id, lead_id, event_type, old_status, new_status, title, description, confidence, source, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.leadId,
        input.eventType,
        input.oldStatus,
        input.newStatus,
        input.title,
        input.description,
        input.confidence,
        input.source,
        input.createdAt
      ]
    );
  }

  return {
    insertEvent
  };
}

module.exports = {
  createLeadEventsRepository
};
