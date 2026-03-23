"use strict";

function parseBoolean(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = String(raw).toLowerCase();
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return null;
}

function createTemplatesV1Controller({ v1Service }) {
  return {
    async listTemplates(req, res) {
      try {
        const result = await v1Service.templates.listTemplates({
          cursor: req.query.cursor ? String(req.query.cursor) : null,
          limit: req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 20,
          query: req.query.q ? String(req.query.q) : null,
          isActive: parseBoolean(req.query.is_active)
        });

        res.status(200).json({
          items: result.items,
          next_cursor: result.nextCursor
        });
      } catch (err) {
        res.status(400).json({ error: err.message || "Failed to list templates." });
      }
    },

    async createTemplate(req, res) {
      try {
        const template = await v1Service.templates.createTemplate({
          name: req.body?.name,
          body: req.body?.body,
          language: req.body?.language,
          category: req.body?.category,
          variables: req.body?.variables,
          isActive: req.body?.is_active,
          createdByOperatorId: req.auth?.user?.id || null
        });
        res.status(201).json({ template });
      } catch (err) {
        res.status(400).json({ error: err.message || "Failed to create template." });
      }
    },

    async updateTemplate(req, res) {
      try {
        const template = await v1Service.templates.updateTemplate({
          templateId: String(req.params.templateId),
          name: req.body?.name,
          body: req.body?.body,
          language: req.body?.language,
          category: req.body?.category,
          variables: req.body?.variables,
          isActive: req.body?.is_active
        });

        if (!template) {
          res.status(404).json({ error: "Template not found." });
          return;
        }

        res.status(200).json({ template });
      } catch (err) {
        res.status(400).json({ error: err.message || "Failed to update template." });
      }
    },

    async sendTemplate(req, res) {
      try {
        const message = await v1Service.templates.sendTemplate({
          templateId: String(req.params.templateId),
          conversationId: req.body?.conversation_id,
          variables: req.body?.variables || {},
          mode: req.body?.mode || "real",
          idempotencyKey: req.body?.idempotency_key || null,
          userId: req.auth?.user?.id || null
        });

        res.status(200).json({ message });
      } catch (err) {
        res.status(400).json({ error: err.message || "Failed to send template." });
      }
    }
  };
}

module.exports = {
  createTemplatesV1Controller
};
