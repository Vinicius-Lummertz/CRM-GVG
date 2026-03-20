"use strict";

function createTemplatesRepository(db) {
  async function findById(templateId) {
    return db.get("SELECT * FROM templates WHERE id = ?", [templateId]);
  }

  async function createTemplate(input) {
    await db.run(
      `
        INSERT INTO templates (id, name, body, language, category, variables_json, is_active, created_by_operator_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.name,
        input.body,
        input.language,
        input.category,
        input.variablesJson,
        input.isActive ? 1 : 0,
        input.createdByOperatorId || null,
        input.createdAt,
        input.updatedAt
      ]
    );
  }

  async function updateTemplate(input) {
    await db.run(
      `
        UPDATE templates
        SET name = ?, body = ?, language = ?, category = ?, variables_json = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `,
      [
        input.name,
        input.body,
        input.language,
        input.category,
        input.variablesJson,
        input.isActive ? 1 : 0,
        input.updatedAt,
        input.id
      ]
    );
  }

  async function listTemplates(input) {
    const where = ["1 = 1"];
    const params = [];

    if (typeof input.isActive === "boolean") {
      where.push("is_active = ?");
      params.push(input.isActive ? 1 : 0);
    }
    if (input.query) {
      where.push("(lower(name) LIKE lower(?) OR lower(body) LIKE lower(?))");
      const pattern = `%${input.query}%`;
      params.push(pattern, pattern);
    }
    if (input.cursorUpdatedAt && input.cursorTemplateId) {
      where.push("(updated_at < ? OR (updated_at = ? AND id < ?))");
      params.push(input.cursorUpdatedAt, input.cursorUpdatedAt, input.cursorTemplateId);
    }

    const limit = Math.max(1, Math.min(100, Number(input.limit || 20)));
    params.push(limit + 1);

    return db.all(
      `
        SELECT *
        FROM templates
        WHERE ${where.join(" AND ")}
        ORDER BY updated_at DESC, id DESC
        LIMIT ?
      `,
      params
    );
  }

  return {
    findById,
    createTemplate,
    updateTemplate,
    listTemplates
  };
}

module.exports = {
  createTemplatesRepository
};
