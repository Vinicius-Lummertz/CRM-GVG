"use strict";

const { assertNoError } = require("./supabaseUtils");

function createMessageDeliveryRepository(db) {
  async function insertEvent(input) {
    const { error } = await db.from("message_delivery").insert({
      id: input.id,
      message_id: input.messageId,
      delivery_status: input.deliveryStatus,
      provider_payload_json: input.providerPayloadJson || null,
      created_at: input.createdAt
    });
    assertNoError(error);
  }

  async function listByMessageId(messageId) {
    const { data, error } = await db.from("message_delivery").select("*").eq("message_id", messageId).order("created_at", { ascending: true });
    assertNoError(error);
    return data || [];
  }

  return { insertEvent, listByMessageId };
}

module.exports = { createMessageDeliveryRepository };
