"use strict";

function registerConversationsRoutes(app, { conversationsV1Controller }, { requireAuth }) {
  app.get("/api/v1/conversations", requireAuth, conversationsV1Controller.listConversations);
  app.get("/api/v1/conversations/:conversationId", requireAuth, conversationsV1Controller.getConversation);
  app.get("/api/v1/conversations/:conversationId/messages", requireAuth, conversationsV1Controller.listMessages);
  app.patch("/api/v1/conversations/:conversationId/status", requireAuth, conversationsV1Controller.updateStatus);
  app.patch("/api/v1/conversations/:conversationId/owner", requireAuth, conversationsV1Controller.updateOwner);
  app.get("/api/v1/conversations/:conversationId/insights", requireAuth, conversationsV1Controller.getInsights);
  app.post("/api/v1/conversations/:conversationId/messages", requireAuth, conversationsV1Controller.sendMessage);

  app.get("/api/v1/messages/:messageId", requireAuth, conversationsV1Controller.getMessageById);
  app.get("/api/v1/operators", requireAuth, conversationsV1Controller.listOperators);
  app.get("/api/v1/dashboard/metrics", requireAuth, conversationsV1Controller.dashboardMetrics);
}

module.exports = {
  registerConversationsRoutes
};
