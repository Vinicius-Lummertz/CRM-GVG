"use strict";

const { assertNoError } = require("./supabaseUtils");

function createTemplatesRepository(db) {
  async function findById(templateId) {
    const { data, error } = await db.from("templates").select("*").eq("id", templateId).maybeSingle();
    assertNoError(error);
    return data;
  }

  async function createTemplate(input) {
    const { error } = await db.from("templates").insert({
      id: input.id,
      name: input.name,
      body: input.body,
      language: input.language,
      category: input.category,
      variables_json: input.variablesJson,
      is_active: input.isActive ? 1 : 0,
      created_by_operator_id: input.createdByOperatorId || null,
      created_at: input.createdAt,
      updated_at: input.updatedAt
    });
    assertNoError(error);
  }

  async function updateTemplate(input) {
    const { error } = await db.from("templates").update({
      name: input.name,
      body: input.body,
      language: input.language,
      category: input.category,
      variables_json: input.variablesJson,
      is_active: input.isActive ? 1 : 0,
      updated_at: input.updatedAt
    }).eq("id", input.id);
    assertNoError(error);
  }

  async function listTemplates(input) {
    let query = db.from("templates").select("*").order("updated_at", { ascending: false }).order("id", { ascending: false }).limit(500);
    if (typeof input.isActive === "boolean") query = query.eq("is_active", input.isActive ? 1 : 0);
    const { data, error } = await query;
    assertNoError(error);

    let rows = data || [];
    if (input.query) {
      const search = input.query.toLowerCase();
      rows = rows.filter((row) => String(row.name || "").toLowerCase().includes(search) || String(row.body || "").toLowerCase().includes(search));
    }
    if (input.cursorUpdatedAt && input.cursorTemplateId) {
      rows = rows.filter((row) => row.updated_at < input.cursorUpdatedAt || (row.updated_at === input.cursorUpdatedAt && row.id < input.cursorTemplateId));
    }

    const limit = Math.max(1, Math.min(100, Number(input.limit || 20)));
    return rows.slice(0, limit + 1);
  }

  return { findById, createTemplate, updateTemplate, listTemplates };
}

module.exports = { createTemplatesRepository };
