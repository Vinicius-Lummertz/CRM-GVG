"use strict";

const STATUS_VALUES = [
  "lead",
  "em_contato",
  "interessado",
  "proposta_enviada",
  "negociando",
  "ganho",
  "perdido",
  "inativo"
];

const EVENT_TYPE_VALUES = [
  "none",
  "interest_detected",
  "proposal_requested",
  "proposal_sent",
  "offer_accepted",
  "offer_rejected",
  "customer_not_interested",
  "customer_stopped_responding",
  "lead_reactivated",
  "stage_changed",
  "attention_required"
];

const TEMPERATURE_VALUES = ["cold", "warm", "hot"];
const SENTIMENT_VALUES = ["positive", "neutral", "negative"];
const INTEREST_LEVEL_VALUES = ["low", "medium", "high", "unknown"];
const RISK_LEVEL_VALUES = ["low", "medium", "high"];

module.exports = {
  STATUS_VALUES,
  EVENT_TYPE_VALUES,
  TEMPERATURE_VALUES,
  SENTIMENT_VALUES,
  INTEREST_LEVEL_VALUES,
  RISK_LEVEL_VALUES
};
