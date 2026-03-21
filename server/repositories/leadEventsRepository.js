"use strict";

const { assertNoError } = require("./supabaseUtils");

function createLeadEventsRepository(db) {
  async function insertEvent(input) {
    const { error } = await db.from("lead_events").insert({
      id: input.id,
      lead_id: input.leadId,
      event_type: input.eventType,
      old_status: input.oldStatus,
      new_status: input.newStatus,
      title: input.title,
      description: input.description,
      confidence: input.confidence,
      source: input.source,
      created_at: input.createdAt
    });
    assertNoError(error);
  }

  return { insertEvent };
}

module.exports = { createLeadEventsRepository };
