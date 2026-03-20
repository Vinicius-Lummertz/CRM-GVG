"use strict";

const { createRepositories } = require("../../repositories");
const { generateId } = require("../../domain/id");
const { nowIso } = require("../../domain/time");
const { createAuthService } = require("./authService");
const { createConversationsService } = require("./conversationsService");
const { createTemplatesService } = require("./templatesService");

function createV1Service({ db, crm, sseHub, whatsappProvider, config }) {
  const repositories = createRepositories(db);

  const authService = createAuthService({
    repositories,
    generateId,
    nowIso,
    authConfig: config.auth,
    whatsappProvider
  });

  const conversationsService = createConversationsService({
    repositories,
    generateId,
    nowIso,
    whatsappProvider,
    crm,
    sseHub
  });

  const templatesService = createTemplatesService({
    repositories,
    generateId,
    nowIso,
    conversationsService,
    sseHub
  });

  return {
    auth: authService,
    conversations: conversationsService,
    templates: templatesService
  };
}

module.exports = {
  createV1Service
};
