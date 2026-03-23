"use strict";

const { createLeadsRepository } = require("./leadsRepository");
const { createMessagesRepository } = require("./messagesRepository");
const { createMessageMediaRepository } = require("./messageMediaRepository");
const { createMessageDeliveryRepository } = require("./messageDeliveryRepository");
const { createConversationStateRepository } = require("./conversationStateRepository");
const { createConversationsRepository } = require("./conversationsRepository");
const { createLeadEventsRepository } = require("./leadEventsRepository");
const { createAiAnalysisRunsRepository } = require("./aiAnalysisRunsRepository");
const { createTemplatesRepository } = require("./templatesRepository");
const { createAuthRepository } = require("./authRepository");

function createRepositories(db) {
  return {
    leads: createLeadsRepository(db),
    messages: createMessagesRepository(db),
    messageMedia: createMessageMediaRepository(db),
    messageDelivery: createMessageDeliveryRepository(db),
    conversationState: createConversationStateRepository(db),
    conversations: createConversationsRepository(db),
    leadEvents: createLeadEventsRepository(db),
    aiAnalysisRuns: createAiAnalysisRunsRepository(db),
    templates: createTemplatesRepository(db),
    auth: createAuthRepository(db)
  };
}

module.exports = {
  createRepositories
};
