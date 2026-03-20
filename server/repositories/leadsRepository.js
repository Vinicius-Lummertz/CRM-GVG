"use strict";

const { assertNoError, toInt } = require("./supabaseUtils");

function createLeadsRepository(db) {
  async function findById(leadId) {
    const { data, error } = await db.from("leads").select("*").eq("id", leadId).maybeSingle();
    assertNoError(error);
    return data;
  }

  async function findByExternalKey(externalKey) {
    const { data, error } = await db.from("leads").select("*").eq("external_key", externalKey).maybeSingle();
    assertNoError(error);
    return data;
  }

  async function insertLead(input) {
    const { error } = await db.from("leads").insert({
      id: input.id,
      external_key: input.externalKey,
      phone: input.phone,
      whatsapp_from: input.whatsappFrom,
      wa_id: input.waId,
      name: input.name,
      source: input.source,
      status: input.status,
      pipeline_position: input.pipelinePosition,
      priority_score: input.priorityScore,
      temperature: input.temperature,
      last_message: input.lastMessage,
      last_message_preview: input.lastMessagePreview,
      unread_count: input.unreadCount,
      message_count_total: input.messageCountTotal,
      inbound_count: input.inboundCount,
      outbound_count: input.outboundCount,
      media_count: input.mediaCount,
      messages_after_last_resume: input.messagesAfterLastResume,
      created_at: input.createdAt,
      updated_at: input.updatedAt
    });
    assertNoError(error);
  }

  async function updateIdentity(input) {
    const { error } = await db.from("leads").update({
      phone: input.phone,
      whatsapp_from: input.whatsappFrom,
      wa_id: input.waId,
      name: input.name,
      updated_at: input.updatedAt
    }).eq("id", input.id);
    assertNoError(error);
  }

  async function updateInboundCounters(input) {
    const current = await findById(input.id);
    if (!current) return;
    const { error } = await db.from("leads").update({
      last_message: input.preview,
      last_message_preview: input.preview,
      last_message_at: input.timestamp,
      last_inbound_at: input.timestamp,
      unread_count: toInt(current.unread_count) + 1,
      message_count_total: toInt(current.message_count_total) + 1,
      inbound_count: toInt(current.inbound_count) + 1,
      media_count: toInt(current.media_count) + toInt(input.mediaCount),
      messages_after_last_resume: toInt(current.messages_after_last_resume) + 1,
      priority_score: input.priorityScore,
      temperature: input.temperature,
      pipeline_position: input.pipelinePosition,
      updated_at: input.timestamp
    }).eq("id", input.id);
    assertNoError(error);
  }

  async function updateAfterAnalysis(input) {
    const { error } = await db.from("leads").update({
      status: input.status,
      pipeline_position: input.pipelinePosition,
      priority_score: input.priorityScore,
      temperature: input.temperature,
      ai_summary: input.aiSummary,
      ai_last_reason: input.aiLastReason,
      ai_last_confidence: input.aiLastConfidence,
      messages_after_last_resume: 0,
      last_analyzed_message_id: input.lastAnalyzedMessageId,
      last_analysis_at: input.lastAnalysisAt,
      updated_at: input.updatedAt
    }).eq("id", input.id);
    assertNoError(error);
  }

  async function updateManualStatus(input) {
    const { error } = await db.from("leads").update({
      status: input.status,
      pipeline_position: input.pipelinePosition,
      updated_at: input.updatedAt
    }).eq("id", input.id);
    assertNoError(error);
  }

  async function updateOwner(input) {
    const { error } = await db.from("leads").update({
      owner_id: input.ownerId || null,
      owner_name: input.ownerName || null,
      updated_at: input.updatedAt
    }).eq("id", input.id);
    assertNoError(error);
  }

  async function updateOutboundCounters(input) {
    const current = await findById(input.id);
    if (!current) return;
    const { error } = await db.from("leads").update({
      last_message: input.preview,
      last_message_preview: input.preview,
      last_message_at: input.timestamp,
      last_outbound_at: input.timestamp,
      message_count_total: toInt(current.message_count_total) + 1,
      outbound_count: toInt(current.outbound_count) + 1,
      updated_at: input.timestamp
    }).eq("id", input.id);
    assertNoError(error);
  }

  async function touchUpdatedAt(input) {
    const { error } = await db.from("leads").update({ updated_at: input.updatedAt }).eq("id", input.id);
    assertNoError(error);
  }

  async function listActiveLeads(filters) {
    let query = db.from("leads").select("*").eq("archived", 0);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.temperature) query = query.eq("temperature", filters.temperature);

    const { data, error } = await query.order("priority_score", { ascending: false }).order("last_message_at", { ascending: false });
    assertNoError(error);
    return data || [];
  }

  async function countByFilters(input, extra = {}) {
    let query = db.from("leads").select("id", { count: "exact", head: true }).eq("archived", 0);
    if (input.ownerId) query = query.eq("owner_id", input.ownerId);
    if (input.from) query = query.gte("updated_at", input.from);
    if (input.to) query = query.lte("updated_at", input.to);
    if (extra.temperature) query = query.eq("temperature", extra.temperature);
    if (extra.status) query = query.eq("status", extra.status);
    const { count, error } = await query;
    assertNoError(error);
    return count || 0;
  }

  async function metricsSummary(input) {
    const [totalLeads, hotLeads, wonLeads, lostLeads] = await Promise.all([
      countByFilters(input),
      countByFilters(input, { temperature: "hot" }),
      countByFilters(input, { status: "ganho" }),
      countByFilters(input, { status: "perdido" })
    ]);

    return { totalLeads, hotLeads, wonLeads, lostLeads };
  }

  return {
    findById,
    findByExternalKey,
    insertLead,
    updateIdentity,
    updateInboundCounters,
    updateAfterAnalysis,
    updateManualStatus,
    updateOwner,
    updateOutboundCounters,
    touchUpdatedAt,
    listActiveLeads,
    metricsSummary
  };
}

module.exports = { createLeadsRepository };
