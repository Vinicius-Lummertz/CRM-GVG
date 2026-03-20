"use strict";

const { createLeadsRepository } = require("./leadsRepository");
const { createMessagesRepository } = require("./messagesRepository");
const { createMessageMediaRepository } = require("./messageMediaRepository");
const { createConversationStateRepository } = require("./conversationStateRepository");
const { createLeadEventsRepository } = require("./leadEventsRepository");
const { createAiAnalysisRunsRepository } = require("./aiAnalysisRunsRepository");

function createRepositories(db) {
  return {
    leads: createLeadsRepository(db),
    messages: createMessagesRepository(db),
    messageMedia: createMessageMediaRepository(db),
    conversationState: createConversationStateRepository(db),
    leadEvents: createLeadEventsRepository(db),
    aiAnalysisRuns: createAiAnalysisRunsRepository(db)
  };
}

module.exports = {
  createRepositories
};
