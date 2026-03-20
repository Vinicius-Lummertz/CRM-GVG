"use strict";

const { createRepositories } = require("../../repositories");
const {
  STATUS_VALUES,
  EVENT_TYPE_VALUES,
  TEMPERATURE_VALUES
} = require("../../domain/classificationConstants");
const {
  detectStrongTrigger,
  computeTemperatureFromScore,
  computePriorityScore,
  getPipelinePosition
} = require("../../domain/pipelineRules");
const {
  extractIncomingMedia,
  buildMessagePreview,
  extractLeadIdentity,
  inferMessageType
} = require("../../domain/messageParsing");
const { mapLeadView } = require("../../domain/leadViewMapper");
const { generateId } = require("../../domain/id");
const { nowIso } = require("../../domain/time");
const { classifyConversationWithOpenAI } = require("../../integrations/aiClassifier");
const { createEnsureConversationState } = require("./state");
const { createLeadQueryUseCases } = require("./queries");
const { createInboundWebhookUseCases } = require("./inbound");
const { createLeadAnalysisUseCases } = require("./analysis");

function createCrmService({ db, openAiApiKey, openAiModel, emitLeadUpdated }) {
  const statusSet = new Set(STATUS_VALUES);
  const eventTypeSet = new Set(EVENT_TYPE_VALUES);
  const temperatureSet = new Set(TEMPERATURE_VALUES);
  const repositories = createRepositories(db);
  const analysisInFlight = new Set();

  const ensureConversationState = createEnsureConversationState({
    repositories,
    generateId,
    nowIso
  });

  async function ensureConversationRecord(lead, timestamp) {
    if (!lead?.id) return null;
    return repositories.conversations.ensureForLead({
      id: generateId("convbox"),
      leadId: lead.id,
      ownerId: lead.owner_id || null,
      ownerName: lead.owner_name || null,
      archived: lead.archived || 0,
      createdAt: lead.created_at || timestamp || nowIso(),
      updatedAt: timestamp || lead.updated_at || nowIso()
    });
  }

  const queryUseCases = createLeadQueryUseCases({
    repositories,
    ensureConversationState,
    mapLeadView,
    statusSet,
    temperatureSet
  });

  const inboundUseCases = createInboundWebhookUseCases({
    repositories,
    ensureConversationState,
    ensureConversationRecord,
    generateId,
    nowIso,
    extractLeadIdentity,
    extractIncomingMedia,
    buildMessagePreview,
    inferMessageType,
    detectStrongTrigger,
    computePriorityScore,
    computeTemperatureFromScore,
    getPipelinePosition
  });

  const analysisUseCases = createLeadAnalysisUseCases({
    repositories,
    ensureConversationState,
    fetchLeadViewById: queryUseCases.fetchLeadViewById,
    getMessagesForAnalysis: queryUseCases.getMessagesForAnalysis,
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
  });

  return {
    extractIncomingMedia,
    buildMessagePreview,
    ensureConversationState,
    detectStrongTrigger,
    getMessagesForAnalysis: queryUseCases.getMessagesForAnalysis,
    classifyConversationWithOpenAI,
    applyClassificationResult: analysisUseCases.applyClassificationResult,
    computePriorityScore,
    upsertLeadFromWebhook: inboundUseCases.upsertLeadFromWebhook,
    saveInboundMessage: inboundUseCases.saveInboundMessage,
    processInboundWebhook: inboundUseCases.processInboundWebhook,
    queueLeadAnalysis: analysisUseCases.queueLeadAnalysis,
    listLeadViews: queryUseCases.listLeadViews,
    getLeadMessages: queryUseCases.getLeadMessages,
    fetchLeadViewById: queryUseCases.fetchLeadViewById
  };
}

module.exports = {
  createCrmService
};
