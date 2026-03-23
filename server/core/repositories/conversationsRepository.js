"use strict";

const { assertNoError } = require("./supabaseUtils");

function createConversationsRepository(db) {
  async function findById(conversationId) {
    const { data, error } = await db.from("conversations").select("*").eq("id", conversationId).maybeSingle();
    assertNoError(error);
    return data;
  }

  async function findByLeadId(leadId) {
    const { data, error } = await db.from("conversations").select("*").eq("lead_id", leadId).maybeSingle();
    assertNoError(error);
    return data;
  }

  async function buildDetailFromLeadId(leadId) {
    const [conversationRes, leadRes, stateRes] = await Promise.all([
      db.from("conversations").select("*").eq("lead_id", leadId).maybeSingle(),
      db.from("leads").select("*").eq("id", leadId).maybeSingle(),
      db.from("conversation_state").select("*").eq("lead_id", leadId).maybeSingle()
    ]);

    assertNoError(conversationRes.error);
    assertNoError(leadRes.error);
    assertNoError(stateRes.error);

    if (!conversationRes.data || !leadRes.data) return null;

    return {
      conversation_id: conversationRes.data.id,
      conversation_lead_id: conversationRes.data.lead_id,
      conversation_owner_id: conversationRes.data.owner_id,
      conversation_owner_name: conversationRes.data.owner_name,
      conversation_archived: conversationRes.data.archived,
      conversation_created_at: conversationRes.data.created_at,
      conversation_updated_at: conversationRes.data.updated_at,
      ...leadRes.data,
      ai_short_summary: stateRes.data?.ai_short_summary || null,
      attention_required: stateRes.data?.attention_required || 0,
      sentiment: stateRes.data?.sentiment || null,
      interest_level: stateRes.data?.interest_level || null,
      risk_level: stateRes.data?.risk_level || null,
      next_action: stateRes.data?.next_action || null,
      budget_text: stateRes.data?.budget_text || null,
      insights_updated_at: stateRes.data?.updated_at || null
    };
  }

  async function findDetailById(conversationId) {
    const convo = await findById(conversationId);
    if (!convo) return null;
    return buildDetailFromLeadId(convo.lead_id);
  }

  async function findDetailByLeadId(leadId) {
    return buildDetailFromLeadId(leadId);
  }

  async function ensureForLead(input) {
    let row = await findByLeadId(input.leadId);
    if (row) return row;

    const { error } = await db.from("conversations").insert({
      id: input.id,
      lead_id: input.leadId,
      owner_id: input.ownerId || null,
      owner_name: input.ownerName || null,
      archived: input.archived || 0,
      created_at: input.createdAt,
      updated_at: input.updatedAt
    });
    assertNoError(error);

    row = await findByLeadId(input.leadId);
    return row;
  }

  async function updateOwner(input) {
    const { error } = await db.from("conversations").update({
      owner_id: input.ownerId || null,
      owner_name: input.ownerName || null,
      updated_at: input.updatedAt
    }).eq("id", input.id);
    assertNoError(error);
  }

  async function listInbox(input) {
    let conversationsQuery = db.from("conversations").select("*").eq("archived", 0);
    if (input.ownerId) conversationsQuery = conversationsQuery.eq("owner_id", input.ownerId);
    const { data: conversations, error: conversationsError } = await conversationsQuery;
    assertNoError(conversationsError);

    const { data: leads, error: leadsError } = await db.from("leads").select("*").eq("archived", 0);
    assertNoError(leadsError);

    const leadMap = new Map((leads || []).map((lead) => [lead.id, lead]));
    const leadIds = (conversations || []).map((conversation) => conversation.lead_id).filter((leadId) => leadMap.has(leadId));

    const { data: states, error: statesError } = await db.from("conversation_state").select("*").in("lead_id", leadIds.length ? leadIds : ["__none__"]);
    assertNoError(statesError);
    const stateMap = new Map((states || []).map((state) => [state.lead_id, state]));

    let rows = (conversations || []).map((conversation) => {
      const lead = leadMap.get(conversation.lead_id);
      if (!lead) return null;
      const state = stateMap.get(conversation.lead_id) || {};
      return {
        conversation_id: conversation.id,
        conversation_lead_id: conversation.lead_id,
        conversation_owner_id: conversation.owner_id,
        conversation_owner_name: conversation.owner_name,
        conversation_archived: conversation.archived,
        conversation_created_at: conversation.created_at,
        conversation_updated_at: conversation.updated_at,
        ...lead,
        ai_short_summary: state.ai_short_summary || null,
        attention_required: state.attention_required || 0,
        sentiment: state.sentiment || null,
        interest_level: state.interest_level || null,
        risk_level: state.risk_level || null,
        next_action: state.next_action || null,
        budget_text: state.budget_text || null,
        insights_updated_at: state.updated_at || null
      };
    }).filter(Boolean);

    if (input.status) rows = rows.filter((row) => row.status === input.status);
    if (input.temperature) rows = rows.filter((row) => row.temperature === input.temperature);
    if (typeof input.attentionRequired === "boolean") rows = rows.filter((row) => Number(row.attention_required || 0) === (input.attentionRequired ? 1 : 0));

    if (input.query) {
      const pattern = input.query.toLowerCase();
      rows = rows.filter((row) => String(row.name || "").toLowerCase().includes(pattern) || String(row.phone || "").includes(input.query) || String(row.last_message_preview || "").toLowerCase().includes(pattern));
    }

    rows.sort((a, b) => {
      if (a.updated_at === b.updated_at) return b.id.localeCompare(a.id);
      return String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
    });

    if (input.cursorUpdatedAt && input.cursorLeadId) {
      rows = rows.filter((row) => row.updated_at < input.cursorUpdatedAt || (row.updated_at === input.cursorUpdatedAt && row.id < input.cursorLeadId));
    }

    const limit = Math.max(1, Math.min(100, Number(input.limit || 20)));
    return rows.slice(0, limit + 1);
  }

  return { findById, findByLeadId, findDetailById, findDetailByLeadId, ensureForLead, updateOwner, listInbox };
}

module.exports = { createConversationsRepository };
