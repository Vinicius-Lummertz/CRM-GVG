"use strict";

const { createTemplatesCore } = require("../templates/core");

function createTemplatesService(deps) {
  return createTemplatesCore(deps);
}

module.exports = {
  createTemplatesService
};
