"use strict";

const { createProviderWebhooksCore } = require("../../core/providerWebhooks/core");

function createProviderWebhooksService(deps) {
  return createProviderWebhooksCore(deps);
}

module.exports = {
  createProviderWebhooksService
};
