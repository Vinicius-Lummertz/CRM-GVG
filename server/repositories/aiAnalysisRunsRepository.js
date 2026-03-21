"use strict";

const { assertNoError } = require("./supabaseUtils");

function createAiAnalysisRunsRepository(db) {
  async function insertRun(input) {
    const { error } = await db.from("ai_analysis_runs").insert({
      id: input.id,
      lead_id: input.leadId,
      model: input.model,
      trigger_reason: input.triggerReason,
      input_messages_count: input.inputMessagesCount,
      input_chars_count: input.inputCharsCount,
      old_status: input.oldStatus,
      suggested_status: input.suggestedStatus,
      applied_status: input.appliedStatus,
      confidence: input.confidence,
      attention_required: input.attentionRequired,
      request_payload_json: input.requestPayloadJson,
      response_payload_json: input.responsePayloadJson,
      created_at: input.createdAt
    });
    assertNoError(error);
  }

  return { insertRun };
}

module.exports = { createAiAnalysisRunsRepository };
