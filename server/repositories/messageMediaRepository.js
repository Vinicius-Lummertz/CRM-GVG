"use strict";

function createMessageMediaRepository(db) {
  async function listByMessageId(messageId) {
    return db.all("SELECT * FROM message_media WHERE message_id = ? ORDER BY media_index ASC", [messageId]);
  }

  async function insertMany(input) {
    const { messageId, leadId, mediaItems, createdAt, generateId } = input;
    for (const mediaItem of mediaItems) {
      await db.run(
        "INSERT INTO message_media (id, message_id, lead_id, media_index, media_url, content_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          generateId("media"),
          messageId,
          leadId,
          Number.isFinite(mediaItem.index) ? mediaItem.index : 0,
          mediaItem.url || null,
          mediaItem.contentType || null,
          createdAt
        ]
      );
    }
  }

  return {
    listByMessageId,
    insertMany
  };
}

module.exports = {
  createMessageMediaRepository
};
