"use strict";

const { assertNoError, toInt } = require("./supabaseUtils");

function createConversationStateRepository(db) {
  async function findByLeadId(leadId) {
    const { data, error } = await db.from("conversation_state").select("*").eq("lead_id", leadId).maybeSingle();
    assertNoError(error);
    return data;
  }

  async function insertState(input) {
    const { error } = await db.from("conversation_state").insert({
      id: input.id,
      lead_id: input.leadId,
      current_status: input.currentStatus,
      current_stage_label: input.currentStageLabel,
      ai_summary: input.aiSummary,
      ai_short_summary: input.aiShortSummary,
      ai_last_reason: input.aiLastReason,
      ai_last_confidence: input.aiLastConfidence,
      budget_text: input.budgetText || "Nao informado.",
      messages_after_last_resume: input.messagesAfterLastResume,
      attention_required: input.attentionRequired,
      sentiment: input.sentiment,
      interest_level: input.interestLevel,
      risk_level: input.riskLevel,
      created_at: input.createdAt,
      updated_at: input.updatedAt
    });
    assertNoError(error);
  }

  async function updateAfterInbound(input) {
    const current = await findByLeadId(input.leadId);
    const nextCount = toInt(current?.messages_after_last_resume) + 1;
    const { error } = await db.from("conversation_state").update({
      current_status: input.currentStatus,
      messages_after_last_resume: nextCount,
      updated_at: input.updatedAt
    }).eq("lead_id", input.leadId);
    assertNoError(error);
  }

  async function updateCurrentStatus(input) {
    const { error } = await db.from("conversation_state").update({
      current_status: input.currentStatus,
      current_stage_label: input.currentStatus,
      updated_at: input.updatedAt
    }).eq("lead_id", input.leadId);
    assertNoError(error);
  }

  async function updateAfterAnalysis(input) {
    const { error } = await db.from("conversation_state").update({
      current_status: input.currentStatus,
      current_stage_label: input.currentStageLabel,
      ai_summary: input.aiSummary,
      ai_short_summary: input.aiShortSummary,
      ai_last_reason: input.aiLastReason,
      ai_last_confidence: input.aiLastConfidence,
      budget_text: input.budgetText || "Nao informado.",
      messages_after_last_resume: 0,
      last_analyzed_message_id: input.lastAnalyzedMessageId,
      last_analysis_at: input.lastAnalysisAt,
      last_trigger_reason: input.lastTriggerReason,
      attention_required: input.attentionRequired,
      sentiment: input.sentiment,
      interest_level: input.interestLevel,
      risk_level: input.riskLevel,
      next_action: input.nextAction,
      updated_at: input.updatedAt
    }).eq("lead_id", input.leadId);
    assertNoError(error);
  }

  return { findByLeadId, insertState, updateAfterInbound, updateCurrentStatus, updateAfterAnalysis };
}

module.exports = { createConversationStateRepository };
