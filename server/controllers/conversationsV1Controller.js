"use strict";

function parseBoolean(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = String(raw).toLowerCase();
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return null;
}

function createConversationsV1Controller({ v1Service }) {
  return {
    async listConversations(req, res) {
      try {
        const result = await v1Service.conversations.listConversations({
          cursor: req.query.cursor ? String(req.query.cursor) : null,
          limit: req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 20,
          status: req.query.status ? String(req.query.status).trim() : null,
          temperature: req.query.temperature ? String(req.query.temperature).trim() : null,
          ownerId: req.query.owner_id ? String(req.query.owner_id).trim() : null,
          attentionRequired: parseBoolean(req.query.attention_required),
          query: req.query.q ? String(req.query.q).trim() : null
        });

        res.status(200).json({
          items: result.items,
          next_cursor: result.nextCursor
        });
      } catch (err) {
        res.status(500).json({ error: err.message || "Failed to list conversations." });
      }
    },

    async getConversation(req, res) {
      const conversation = await v1Service.conversations.getConversation(String(req.params.conversationId));
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found." });
        return;
      }
      res.status(200).json({ conversation });
    },

    async listMessages(req, res) {
      const result = await v1Service.conversations.listConversationMessages({
        conversationId: String(req.params.conversationId),
        cursor: req.query.cursor ? String(req.query.cursor) : null,
        limit: req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 30
      });

      if (!result) {
        res.status(404).json({ error: "Conversation not found." });
        return;
      }

      res.status(200).json({
        items: result.items,
        next_cursor: result.nextCursor
      });
    },

    async updateStatus(req, res) {
      try {
        const updated = await v1Service.conversations.updateConversationStatus({
          conversationId: String(req.params.conversationId),
          status: String(req.body?.status || "").trim(),
          reason: req.body?.reason ? String(req.body.reason) : null,
          userId: req.auth?.user?.id || null
        });

        if (!updated) {
          res.status(404).json({ error: "Conversation not found." });
          return;
        }

        res.status(200).json({ conversation: updated });
      } catch (err) {
        res.status(400).json({ error: err.message || "Failed to update status." });
      }
    },

    async updateOwner(req, res) {
      try {
        const updated = await v1Service.conversations.updateConversationOwner({
          conversationId: String(req.params.conversationId),
          ownerId: req.body?.owner_id ? String(req.body.owner_id) : null,
          userId: req.auth?.user?.id || null
        });

        if (!updated) {
          res.status(404).json({ error: "Conversation not found." });
          return;
        }

        res.status(200).json({ conversation: updated });
      } catch (err) {
        res.status(400).json({ error: err.message || "Failed to update owner." });
      }
    },

    async getInsights(req, res) {
      const insights = await v1Service.conversations.getInsights(String(req.params.conversationId));
      if (!insights) {
        res.status(404).json({ error: "Conversation not found." });
        return;
      }
      res.status(200).json({ insights });
    },

    async sendMessage(req, res) {
      try {
        const message = await v1Service.conversations.sendMessage({
          conversationId: String(req.params.conversationId),
          type: req.body?.type ? String(req.body.type) : "text",
          body: req.body?.body,
          templateId: req.body?.template_id || null,
          variables: req.body?.variables || {},
          mode: req.body?.mode || "real",
          idempotencyKey: req.body?.idempotency_key || null,
          userId: req.auth?.user?.id || null
        });

        res.status(200).json({ message });
      } catch (err) {
        res.status(400).json({ error: err.message || "Failed to send message." });
      }
    },

    async getMessageById(req, res) {
      const message = await v1Service.conversations.getMessageById(String(req.params.messageId));
      if (!message) {
        res.status(404).json({ error: "Message not found." });
        return;
      }
      res.status(200).json({ message });
    },

    async listOperators(req, res) {
      const items = await v1Service.auth.listOperators();
      res.status(200).json({ items });
    },

    async dashboardMetrics(req, res) {
      const metrics = await v1Service.conversations.getDashboardMetrics({
        ownerId: req.query.owner_id ? String(req.query.owner_id) : null,
        from: req.query.from ? String(req.query.from) : null,
        to: req.query.to ? String(req.query.to) : null
      });
      res.status(200).json({ metrics });
    }
  };
}

module.exports = {
  createConversationsV1Controller
};
