"use strict";

const {
  STATUS_VALUES,
  EVENT_TYPE_VALUES,
  TEMPERATURE_VALUES,
  SENTIMENT_VALUES,
  INTEREST_LEVEL_VALUES,
  RISK_LEVEL_VALUES
} = require("../domain/classificationConstants");

const CLASSIFICATION_JSON_SCHEMA = {
  name: "crm_pipeline_classification",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "should_update_status",
      "new_status",
      "confidence",
      "summary",
      "short_summary",
      "reason",
      "event_type",
      "attention_required",
      "temperature",
      "sentiment",
      "interest_level",
      "risk_level",
      "next_action"
    ],
    properties: {
      should_update_status: { type: "boolean" },
      new_status: { type: "string", enum: STATUS_VALUES },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      summary: { type: "string", minLength: 1 },
      short_summary: { type: "string", minLength: 1 },
      reason: { type: "string", minLength: 1 },
      event_type: { type: "string", enum: EVENT_TYPE_VALUES },
      attention_required: { type: "boolean" },
      temperature: { type: "string", enum: TEMPERATURE_VALUES },
      sentiment: { type: "string", enum: SENTIMENT_VALUES },
      interest_level: { type: "string", enum: INTEREST_LEVEL_VALUES },
      risk_level: { type: "string", enum: RISK_LEVEL_VALUES },
      next_action: { type: "string", minLength: 1 }
    }
  }
};

const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    should_update_status: { type: "BOOLEAN" },
    new_status: { type: "STRING", enum: STATUS_VALUES },
    confidence: { type: "NUMBER" },
    summary: { type: "STRING" },
    short_summary: { type: "STRING" },
    reason: { type: "STRING" },
    event_type: { type: "STRING", enum: EVENT_TYPE_VALUES },
    attention_required: { type: "BOOLEAN" },
    temperature: { type: "STRING", enum: TEMPERATURE_VALUES },
    sentiment: { type: "STRING", enum: SENTIMENT_VALUES },
    interest_level: { type: "STRING", enum: INTEREST_LEVEL_VALUES },
    risk_level: { type: "STRING", enum: RISK_LEVEL_VALUES },
    next_action: { type: "STRING" }
  },
  required: [
    "should_update_status",
    "new_status",
    "confidence",
    "summary",
    "short_summary",
    "reason",
    "event_type",
    "attention_required",
    "temperature",
    "sentiment",
    "interest_level",
    "risk_level",
    "next_action"
  ]
};

function safeString(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function clampConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric < 0) return 0;
  if (numeric > 1) return 1;
  return numeric;
}

function normalizeEnum(value, allowedValues, fallback) {
  return allowedValues.includes(value) ? value : fallback;
}

function normalizeClassification(raw) {
  return {
    should_update_status: Boolean(raw.should_update_status),
    new_status: normalizeEnum(raw.new_status, STATUS_VALUES, "lead"),
    confidence: clampConfidence(raw.confidence),
    summary: safeString(raw.summary, "Sem resumo."),
    short_summary: safeString(raw.short_summary, "Sem resumo curto."),
    reason: safeString(raw.reason, "Sem motivo informado."),
    event_type: normalizeEnum(raw.event_type, EVENT_TYPE_VALUES, "none"),
    attention_required: Boolean(raw.attention_required),
    temperature: normalizeEnum(raw.temperature, TEMPERATURE_VALUES, "cold"),
    sentiment: normalizeEnum(raw.sentiment, SENTIMENT_VALUES, "neutral"),
    interest_level: normalizeEnum(raw.interest_level, INTEREST_LEVEL_VALUES, "unknown"),
    risk_level: normalizeEnum(raw.risk_level, RISK_LEVEL_VALUES, "low"),
    next_action: safeString(raw.next_action, "Acompanhar proximo contato.")
  };
}

function buildMessagesForModel(context) {
  const systemPrompt = [
    "Voce e um classificador conservador de pipeline comercial para CRM de WhatsApp.",
    "So mude status quando houver evidencia clara.",
    "Use apenas os enums permitidos.",
    "Se a confianca for baixa, prefira manter o status atual e marcar attention_required."
  ].join(" ");

  const userPayload = {
    objective: "Classificar o estado comercial do lead e atualizar resumo incremental.",
    allowed_status: STATUS_VALUES,
    allowed_event_types: EVENT_TYPE_VALUES,
    context
  };

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: JSON.stringify(userPayload) }
  ];
}

function extractJsonFromGeminiResponse(responsePayload) {
  const parts = responsePayload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts) || !parts.length) return null;

  const textPart = parts.find((part) => typeof part?.text === "string");
  if (!textPart || !textPart.text) return null;
  return textPart.text;
}

async function classifyConversationWithOpenAI({ apiKey, model, context }) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY ausente.");
  }

  const effectiveModel = model || "gemini-3.1-flash-lite-preview";
  const promptMessages = buildMessagesForModel(context);
  const joinedPrompt = promptMessages.map((item) => `[${item.role}] ${item.content}`).join("\n\n");

  const requestPayload = {
    contents: [
      {
        role: "user",
        parts: [{ text: joinedPrompt }]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: GEMINI_RESPONSE_SCHEMA
    }
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      effectiveModel
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestPayload)
    }
  );

  const responsePayload = await response.json();
  if (!response.ok) {
    const detail = responsePayload?.error ? JSON.stringify(responsePayload.error) : "Erro desconhecido";
    throw new Error(`Gemini API error: ${response.status} - ${detail}`);
  }

  const content = extractJsonFromGeminiResponse(responsePayload);
  if (!content || typeof content !== "string") {
    throw new Error("Gemini retornou resposta sem JSON estruturado.");
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (_err) {
    throw new Error("Falha ao parsear JSON estruturado da Gemini.");
  }

  return {
    model: effectiveModel,
    classification: normalizeClassification(parsed),
    requestPayload,
    responsePayload
  };
}

module.exports = {
  STATUS_VALUES,
  EVENT_TYPE_VALUES,
  TEMPERATURE_VALUES,
  CLASSIFICATION_JSON_SCHEMA,
  classifyConversationWithOpenAI
};
