"use strict";

function createAiAnalysisRunsRepository(db) {
  async function insertRun(input) {
    await db.run(
      `
        INSERT INTO ai_analysis_runs (
          id, lead_id, model, trigger_reason, input_messages_count, input_chars_count, old_status, suggested_status, applied_status,
          confidence, attention_required, request_payload_json, response_payload_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.leadId,
        input.model,
        input.triggerReason,
        input.inputMessagesCount,
        input.inputCharsCount,
        input.oldStatus,
        input.suggestedStatus,
        input.appliedStatus,
        input.confidence,
        input.attentionRequired,
        input.requestPayloadJson,
        input.responsePayloadJson,
        input.createdAt
      ]
    );
  }

  return {
    insertRun
  };
}

module.exports = {
  createAiAnalysisRunsRepository
};
