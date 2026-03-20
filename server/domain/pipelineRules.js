"use strict";

const STRONG_TRIGGER_TERMS = [
  "aceito",
  "fechado",
  "pode fechar",
  "quero seguir",
  "bora fechar",
  "me manda o pagamento",
  "vamos continuar",
  "nao quero",
  "desisti",
  "sem interesse",
  "nao tenho interesse",
  "caro demais",
  "vou pensar",
  "recuso",
  "nao vou continuar"
];

const STATUS_BASE_SCORE = {
  lead: 30,
  em_contato: 45,
  interessado: 60,
  proposta_enviada: 72,
  negociando: 82,
  ganho: 95,
  perdido: 6,
  inativo: 10
};

const PIPELINE_POSITION = {
  lead: 0,
  em_contato: 1,
  interessado: 2,
  proposta_enviada: 3,
  negociando: 4,
  ganho: 5,
  perdido: 6,
  inativo: 7
};

function normalizeTriggerText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectStrongTrigger(text) {
  const normalized = normalizeTriggerText(text);
  if (!normalized) return false;
  return STRONG_TRIGGER_TERMS.some((term) => normalized.includes(term));
}

function computeTemperatureFromScore(score) {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

function computePriorityScore({ status, messageCountTotal, lastMessageAt, strongTriggerDetected }) {
  let score = STATUS_BASE_SCORE[status] ?? 25;
  score += Math.min(15, (Number(messageCountTotal) || 0) / 2);
  if (lastMessageAt) {
    const ageHours = (Date.now() - new Date(lastMessageAt).getTime()) / 3600000;
    if (ageHours <= 6) score += 12;
    else if (ageHours <= 24) score += 8;
    else if (ageHours <= 72) score += 4;
  }
  if (strongTriggerDetected) score += 10;
  if (status === "perdido" || status === "inativo") score = Math.min(score, 20);
  return Math.max(0, Math.min(100, Number(score.toFixed(2))));
}

function getPipelinePosition(status) {
  return PIPELINE_POSITION[status] ?? 0;
}

module.exports = {
  STRONG_TRIGGER_TERMS,
  STATUS_BASE_SCORE,
  PIPELINE_POSITION,
  detectStrongTrigger,
  computeTemperatureFromScore,
  computePriorityScore,
  getPipelinePosition
};
