"use strict";

const { createTemplatesCore } = require("../../core/templates/core");

function createTemplatesService(deps) {
  return createTemplatesCore(deps);
}

module.exports = {
  createTemplatesService
};
