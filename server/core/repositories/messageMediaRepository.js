"use strict";

const { assertNoError } = require("./supabaseUtils");

function createMessageMediaRepository(db) {
  async function listByMessageId(messageId) {
    const { data, error } = await db.from("message_media").select("*").eq("message_id", messageId).order("media_index", { ascending: true });
    assertNoError(error);
    return data || [];
  }

  async function insertMany(input) {
    const { messageId, leadId, mediaItems, createdAt, generateId } = input;
    if (!mediaItems.length) return;

    const rows = mediaItems.map((mediaItem) => ({
      id: generateId("media"),
      message_id: messageId,
      lead_id: leadId,
      media_index: Number.isFinite(mediaItem.index) ? mediaItem.index : 0,
      media_url: mediaItem.url || null,
      content_type: mediaItem.contentType || null,
      created_at: createdAt
    }));

    const { error } = await db.from("message_media").insert(rows);
    assertNoError(error);
  }

  return { listByMessageId, insertMany };
}

module.exports = { createMessageMediaRepository };
