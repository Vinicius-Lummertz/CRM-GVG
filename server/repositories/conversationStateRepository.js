"use strict";

function createConversationStateRepository(db) {
  async function findByLeadId(leadId) {
    return db.get("SELECT * FROM conversation_state WHERE lead_id = ?", [leadId]);
  }

  async function insertState(input) {
    await db.run(
      `
        INSERT INTO conversation_state (
          id, lead_id, current_status, current_stage_label, ai_summary, ai_short_summary, ai_last_reason, ai_last_confidence,
          messages_after_last_resume, attention_required, sentiment, interest_level, risk_level, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.leadId,
        input.currentStatus,
        input.currentStageLabel,
        input.aiSummary,
        input.aiShortSummary,
        input.aiLastReason,
        input.aiLastConfidence,
        input.messagesAfterLastResume,
        input.attentionRequired,
        input.sentiment,
        input.interestLevel,
        input.riskLevel,
        input.createdAt,
        input.updatedAt
      ]
    );
  }

  async function updateAfterInbound(input) {
    await db.run(
      "UPDATE conversation_state SET current_status = ?, messages_after_last_resume = COALESCE(messages_after_last_resume, 0) + 1, updated_at = ? WHERE lead_id = ?",
      [input.currentStatus, input.updatedAt, input.leadId]
    );
  }

  async function updateAfterAnalysis(input) {
    await db.run(
      `
        UPDATE conversation_state
        SET current_status = ?, current_stage_label = ?, ai_summary = ?, ai_short_summary = ?, ai_last_reason = ?, ai_last_confidence = ?,
            messages_after_last_resume = 0, last_analyzed_message_id = ?, last_analysis_at = ?, last_trigger_reason = ?, attention_required = ?,
            sentiment = ?, interest_level = ?, risk_level = ?, next_action = ?, updated_at = ?
        WHERE lead_id = ?
      `,
      [
        input.currentStatus,
        input.currentStageLabel,
        input.aiSummary,
        input.aiShortSummary,
        input.aiLastReason,
        input.aiLastConfidence,
        input.lastAnalyzedMessageId,
        input.lastAnalysisAt,
        input.lastTriggerReason,
        input.attentionRequired,
        input.sentiment,
        input.interestLevel,
        input.riskLevel,
        input.nextAction,
        input.updatedAt,
        input.leadId
      ]
    );
  }

  return {
    findByLeadId,
    insertState,
    updateAfterInbound,
    updateAfterAnalysis
  };
}

module.exports = {
  createConversationStateRepository
};
