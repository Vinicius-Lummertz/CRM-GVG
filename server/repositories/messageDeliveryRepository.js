"use strict";

function createMessageDeliveryRepository(db) {
  async function insertEvent(input) {
    await db.run(
      "INSERT INTO message_delivery (id, message_id, delivery_status, provider_payload_json, created_at) VALUES (?, ?, ?, ?, ?)",
      [input.id, input.messageId, input.deliveryStatus, input.providerPayloadJson || null, input.createdAt]
    );
  }

  async function listByMessageId(messageId) {
    return db.all("SELECT * FROM message_delivery WHERE message_id = ? ORDER BY created_at ASC", [messageId]);
  }

  return {
    insertEvent,
    listByMessageId
  };
}

module.exports = {
  createMessageDeliveryRepository
};
