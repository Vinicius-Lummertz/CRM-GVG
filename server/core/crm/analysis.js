"use strict";

function createLeadAnalysisUseCases({
  repositories,
  ensureConversationState,
  fetchLeadViewById,
  getMessagesForAnalysis,
  generateId,
  nowIso,
  getPipelinePosition,
  computePriorityScore,
  computeTemperatureFromScore,
  classifyConversationWithOpenAI,
  openAiApiKey,
  openAiModel,
  statusSet,
  eventTypeSet,
  temperatureSet,
  emitLeadUpdated,
  analysisInFlight
}) {
  async function applyClassificationResult(params) {
    const timestamp = nowIso();
    const oldStatus = params.lead.status || "lead";
    const suggestedStatus = statusSet.has(params.classification.new_status) ? params.classification.new_status : oldStatus;
    const confidence = Number.isFinite(params.classification.confidence) ? params.classification.confidence : 0;
    const applyStatus = Boolean(params.classification.should_update_status) && confidence >= 0.55;
    const appliedStatus = applyStatus ? suggestedStatus : oldStatus;
    const attentionRequired = confidence < 0.55 ? true : Boolean(params.classification.attention_required);

    const priorityScore = computePriorityScore({
      status: appliedStatus,
      messageCountTotal: params.lead.message_count_total || 0,
      lastMessageAt: params.lead.last_message_at,
      strongTriggerDetected: params.triggerReason === "strong_trigger"
    });

    const temperature = temperatureSet.has(params.classification.temperature)
      ? params.classification.temperature
      : computeTemperatureFromScore(priorityScore);

    const lastAnalyzedMessageId = params.messages.length
      ? params.messages[params.messages.length - 1].id
      : params.state.last_analyzed_message_id;

    await repositories.leads.updateAfterAnalysis({
      id: params.lead.id,
      status: appliedStatus,
      pipelinePosition: getPipelinePosition(appliedStatus),
      priorityScore,
      temperature,
      aiSummary: params.classification.summary,
      aiLastReason: params.classification.reason,
      aiLastConfidence: confidence,
      lastAnalyzedMessageId: lastAnalyzedMessageId || null,
      lastAnalysisAt: timestamp,
      updatedAt: timestamp
    });

    await repositories.conversationState.updateAfterAnalysis({
      leadId: params.lead.id,
      currentStatus: appliedStatus,
      currentStageLabel: appliedStatus,
      aiSummary: params.classification.summary,
      aiShortSummary: params.classification.short_summary,
      aiLastReason: params.classification.reason,
      aiLastConfidence: confidence,
      budgetText: params.classification.budget_text,
      lastAnalyzedMessageId: lastAnalyzedMessageId || null,
      lastAnalysisAt: timestamp,
      lastTriggerReason: params.triggerReason,
      attentionRequired: attentionRequired ? 1 : 0,
      sentiment: params.classification.sentiment,
      interestLevel: params.classification.interest_level,
      riskLevel: params.classification.risk_level,
      nextAction: params.classification.next_action,
      updatedAt: timestamp
    });

    await repositories.aiAnalysisRuns.insertRun({
      id: generateId("ai-run"),
      leadId: params.lead.id,
      model: params.model,
      triggerReason: params.triggerReason,
      inputMessagesCount: params.messages.length,
      inputCharsCount: params.messages.reduce((sum, item) => sum + String(item.preview || "").length, 0),
      oldStatus,
      suggestedStatus,
      appliedStatus,
      confidence,
      attentionRequired: attentionRequired ? 1 : 0,
      requestPayloadJson: JSON.stringify(params.requestPayload || {}),
      responsePayloadJson: JSON.stringify(params.responsePayload || {}),
      createdAt: timestamp
    });

    let eventType = eventTypeSet.has(params.classification.event_type) ? params.classification.event_type : "none";
    if (confidence < 0.55) eventType = "attention_required";
    if (oldStatus !== appliedStatus && eventType === "none") eventType = "stage_changed";

    if (eventType !== "none") {
      await repositories.leadEvents.insertEvent({
        id: generateId("event"),
        leadId: params.lead.id,
        eventType,
        oldStatus,
        newStatus: appliedStatus,
        title: oldStatus !== appliedStatus ? `Status alterado para ${appliedStatus}` : "Atualizacao de classificacao",
        description: params.classification.reason,
        confidence,
        source: "ai",
        createdAt: timestamp
      });
    }

    await emitLeadUpdated(params.lead.id);
  }

  async function maybeAnalyzeLead(leadId, triggerReason) {
    const lead = await repositories.leads.findById(leadId);
    if (!lead) return;

    const state = await ensureConversationState(lead.id, lead);
    if (!triggerReason && Number(state.messages_after_last_resume || 0) < 10) return;

    const messages = await getMessagesForAnalysis(lead.id, state.last_analyzed_message_id);
    if (!messages.length) return;

    if (!openAiApiKey) {
      console.log(`[analysis] skip lead=${lead.id} motivo=AI_API_KEY ausente`);
      return;
    }

    console.log(`[analysis] start lead=${lead.id} reason=${triggerReason || "batch_10_messages"} messages=${messages.length}`);

    const context = {
      current_status: state.current_status || lead.status || "lead",
      previous_summary: state.ai_summary || lead.ai_summary || "",
      recent_messages: messages.map((item) => ({
        direction: item.direction,
        preview: item.preview,
        created_at: item.created_at
      }))
    };

    try {
      const aiResult = await classifyConversationWithOpenAI({
        apiKey: openAiApiKey,
        model: openAiModel,
        context
      });

      await applyClassificationResult({
        lead,
        state,
        classification: aiResult.classification,
        triggerReason: triggerReason || "batch_10_messages",
        messages,
        requestPayload: aiResult.requestPayload,
        responsePayload: aiResult.responsePayload,
        model: aiResult.model
      });

      console.log(`[analysis] done lead=${lead.id} status=${aiResult.classification.new_status} confidence=${aiResult.classification.confidence}`);
    } catch (err) {
      console.error("[analysis] erro na IA:", err.message);
    }
  }

  function queueLeadAnalysis(leadId, triggerReason) {
    if (!leadId) return;
    if (analysisInFlight.has(leadId)) return;

    analysisInFlight.add(leadId);
    console.log(`[analysis] queued lead=${leadId} reason=${triggerReason || "batch_10_messages"}`);

    setImmediate(async () => {
      try {
        await maybeAnalyzeLead(leadId, triggerReason);
      } finally {
        analysisInFlight.delete(leadId);
      }
    });
  }

  return {
    applyClassificationResult,
    maybeAnalyzeLead,
    queueLeadAnalysis,
    fetchLeadViewById
  };
}

module.exports = {
  createLeadAnalysisUseCases
};
