"use strict";

const { encodeCursor, decodeCursor } = require("../../domain/cursor");

function normalizeTemplateRow(row) {
  let variables = [];
  try {
    const parsed = row.variables_json ? JSON.parse(row.variables_json) : [];
    variables = Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    variables = [];
  }

  return {
    id: row.id,
    name: row.name,
    body: row.body,
    language: row.language,
    category: row.category,
    variables,
    isActive: Boolean(row.is_active),
    createdByOperatorId: row.created_by_operator_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function createTemplatesCore({ repositories, generateId, nowIso, conversationsCore, sseHub }) {
  async function listTemplates(input) {
    const cursor = decodeCursor(input.cursor);
    const limit = Math.max(1, Math.min(100, Number(input.limit || 20)));

    const rows = await repositories.templates.listTemplates({
      query: input.query || null,
      isActive: typeof input.isActive === "boolean" ? input.isActive : null,
      cursorUpdatedAt: cursor?.updatedAt || null,
      cursorTemplateId: cursor?.templateId || null,
      limit
    });

    const hasMore = rows.length > limit;
    const selected = hasMore ? rows.slice(0, limit) : rows;
    const items = selected.map(normalizeTemplateRow);

    const last = selected[selected.length - 1];
    const nextCursor = hasMore
      ? encodeCursor({
          updatedAt: last.updated_at,
          templateId: last.id
        })
      : null;

    return {
      items,
      nextCursor
    };
  }

  async function createTemplate(input) {
    const timestamp = nowIso();
    const variables = Array.isArray(input.variables) ? input.variables : [];
    const templateId = generateId("tpl");
    const name = String(input.name || "").trim();
    const body = String(input.body || "").trim();
    if (!name) throw new Error("name is required.");
    if (!body) throw new Error("body is required.");

    await repositories.templates.createTemplate({
      id: templateId,
      name,
      body,
      language: String(input.language || "pt_BR").trim(),
      category: String(input.category || "utility").trim(),
      variablesJson: JSON.stringify(variables),
      isActive: input.isActive !== false,
      createdByOperatorId: input.createdByOperatorId || null,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    const template = await repositories.templates.findById(templateId);

    if (!template) {
      throw new Error("Failed to create template.");
    }

    const result = normalizeTemplateRow(template);
    sseHub.broadcast({ type: "template.updated", data: result });
    return result;
  }

  async function updateTemplate(input) {
    const current = await repositories.templates.findById(input.templateId);
    if (!current) return null;

    const timestamp = nowIso();
    let variables = [];
    if (Array.isArray(input.variables)) {
      variables = input.variables;
    } else {
      try {
        const parsed = current.variables_json ? JSON.parse(current.variables_json) : [];
        variables = Array.isArray(parsed) ? parsed : [];
      } catch (_err) {
        variables = [];
      }
    }

    await repositories.templates.updateTemplate({
      id: current.id,
      name: input.name !== undefined ? String(input.name || "").trim() : current.name,
      body: input.body !== undefined ? String(input.body || "").trim() : current.body,
      language: input.language !== undefined ? String(input.language || "pt_BR").trim() : current.language,
      category: input.category !== undefined ? String(input.category || "utility").trim() : current.category,
      variablesJson: JSON.stringify(variables),
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : Boolean(current.is_active),
      updatedAt: timestamp
    });

    const updated = await repositories.templates.findById(current.id);
    const result = normalizeTemplateRow(updated);
    sseHub.broadcast({ type: "template.updated", data: result });
    return result;
  }

  async function sendTemplate(input) {
    return conversationsCore.sendMessage({
      conversationId: input.conversationId,
      type: "template",
      templateId: input.templateId,
      variables: input.variables || {},
      mode: input.mode || "real",
      idempotencyKey: input.idempotencyKey || null,
      userId: input.userId || null
    });
  }

  return {
    listTemplates,
    createTemplate,
    updateTemplate,
    sendTemplate
  };
}

module.exports = {
  createTemplatesCore
};
