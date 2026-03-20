"use strict";

function createLeadQueryUseCases({ repositories, ensureConversationState, mapLeadView, statusSet, temperatureSet }) {
  async function fetchLatestMessageForLead(leadId) {
    const row = await repositories.messages.findLatestByLead(leadId);
    if (!row) return null;

    const mediaRows = await repositories.messageMedia.listByMessageId(row.id);
    return {
      id: row.id,
      messageSid: row.message_sid || null,
      direction: row.direction,
      body: row.body || "",
      preview: row.preview,
      messageType: row.message_type,
      numMedia: row.media_count || 0,
      media: mediaRows.map((item) => ({
        id: item.id,
        index: item.media_index,
        url: item.media_url,
        contentType: item.content_type
      })),
      createdAt: row.created_at
    };
  }

  async function fetchLeadViewById(leadId) {
    const lead = await repositories.leads.findById(leadId);
    if (!lead) return null;

    const state = await ensureConversationState(leadId, lead);
    const latestMessage = await fetchLatestMessageForLead(leadId);
    return mapLeadView(lead, state, latestMessage);
  }

  async function getMessagesForAnalysis(leadId, lastAnalyzedMessageId) {
    let rows = [];
    if (lastAnalyzedMessageId) {
      const pivot = await repositories.messages.getCreatedAtById(leadId, lastAnalyzedMessageId);
      if (pivot && pivot.created_at) {
        rows = await repositories.messages.listByLeadAfterTimestamp(leadId, pivot.created_at);
      }
    }

    if (!rows.length) {
      rows = (await repositories.messages.listRecentForAnalysis(leadId, 15)).reverse();
    }
    if (rows.length > 15) rows = rows.slice(-15);
    return rows;
  }

  async function listLeadViews(filters = {}) {
    const normalizedFilters = {
      status: filters.status && statusSet.has(filters.status) ? filters.status : null,
      temperature: filters.temperature && temperatureSet.has(filters.temperature) ? filters.temperature : null,
      attentionRequired: typeof filters.attentionRequired === "boolean" ? filters.attentionRequired : null
    };

    const rows = await repositories.leads.listActiveLeads(normalizedFilters);
    const leads = [];

    for (const lead of rows) {
      const state = await ensureConversationState(lead.id, lead);
      if (typeof normalizedFilters.attentionRequired === "boolean") {
        if (Boolean(state.attention_required || 0) !== normalizedFilters.attentionRequired) continue;
      }
      const latestMessage = await fetchLatestMessageForLead(lead.id);
      leads.push(mapLeadView(lead, state, latestMessage));
    }

    return leads;
  }

  async function getLeadMessages(leadId, limit = 100) {
    const cappedLimit = Math.max(1, Math.min(200, limit));
    const rows = await repositories.messages.listByLeadDescLimit(leadId, cappedLimit);

    const messages = [];
    for (const row of rows.reverse()) {
      const mediaRows = await repositories.messageMedia.listByMessageId(row.id);
      messages.push({
        id: row.id,
        messageSid: row.message_sid || null,
        direction: row.direction,
        body: row.body || "",
        preview: row.preview,
        messageType: row.message_type,
        numMedia: row.media_count || 0,
        media: mediaRows.map((item) => ({
          id: item.id,
          index: item.media_index,
          url: item.media_url,
          contentType: item.content_type
        })),
        createdAt: row.created_at
      });
    }

    return messages;
  }

  return {
    fetchLatestMessageForLead,
    fetchLeadViewById,
    getMessagesForAnalysis,
    listLeadViews,
    getLeadMessages
  };
}

module.exports = {
  createLeadQueryUseCases
};
