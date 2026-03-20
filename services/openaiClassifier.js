"use strict";

const {
  STATUS_VALUES,
  EVENT_TYPE_VALUES,
  TEMPERATURE_VALUES,
  CLASSIFICATION_JSON_SCHEMA,
  classifyConversationWithOpenAI
} = require("../server/integrations/aiClassifier");

module.exports = {
  STATUS_VALUES,
  EVENT_TYPE_VALUES,
  TEMPERATURE_VALUES,
  CLASSIFICATION_JSON_SCHEMA,
  classifyConversationWithOpenAI
};
