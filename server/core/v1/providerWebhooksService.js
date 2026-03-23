"use strict";

const { createProviderWebhooksCore } = require("../providerWebhooks/core");

function createProviderWebhooksService(deps) {
  return createProviderWebhooksCore(deps);
}

module.exports = {
  createProviderWebhooksService
};
