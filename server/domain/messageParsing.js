"use strict";

function normalizeWhatsappFrom(fromValue) {
  return String(fromValue || "").replace(/^whatsapp:/i, "").trim();
}

function extractLeadIdentity(payload, generateId) {
  const from = payload.From ? String(payload.From).trim() : "";
  const waId = payload.WaId ? String(payload.WaId).trim() : "";
  const profileName = payload.ProfileName ? String(payload.ProfileName).trim() : "";
  const normalizedFrom = normalizeWhatsappFrom(from);
  return {
    externalKey: waId || normalizedFrom || generateId("external"),
    phone: waId || normalizedFrom || "",
    whatsappFrom: from || "",
    waId: waId || null,
    name: profileName || "Sem nome"
  };
}

function parseIncomingNumMedia(payload) {
  const parsed = Number.parseInt(String(payload.NumMedia || "0"), 10);
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

function extractIncomingMedia(payload) {
  const numMedia = parseIncomingNumMedia(payload);
  const mediaItems = [];
  for (let index = 0; index < numMedia; index += 1) {
    mediaItems.push({
      index,
      url: payload[`MediaUrl${index}`] ? String(payload[`MediaUrl${index}`]).trim() : null,
      contentType: payload[`MediaContentType${index}`] ? String(payload[`MediaContentType${index}`]).trim() : null
    });
  }
  return mediaItems;
}

function buildMessagePreview(payload, mediaItems) {
  const body = String(payload.Body || "").trim();
  if (body) return body;
  if (!mediaItems.length) return "Sem mensagem";

  const firstType = mediaItems[0].contentType ? String(mediaItems[0].contentType).toLowerCase() : "";
  if (firstType === "image/webp") return "\u{1F4AC} Figurinha";
  if (firstType.startsWith("image/")) return "\u{1F4F7} Imagem";
  if (firstType.startsWith("video/")) return "\u{1F3A5} Video";
  if (firstType.startsWith("audio/")) return "\u{1F3B5} Audio";
  if (firstType === "application/pdf") return "\u{1F4C4} PDF";
  if (firstType.startsWith("text/")) return "\u{1F4C4} Documento de texto";
  if (firstType.startsWith("application/")) return "\u{1F4C4} Documento";
  return "\u{1F4CE} Midia recebida";
}

function inferMessageType(rawBody, mediaItems) {
  if (String(rawBody || "").trim()) return "text";
  if (!mediaItems.length) return "text";
  const firstType = mediaItems[0].contentType ? String(mediaItems[0].contentType).toLowerCase() : "";
  if (firstType === "image/webp") return "sticker";
  if (firstType.startsWith("image/")) return "image";
  if (firstType.startsWith("video/")) return "video";
  if (firstType.startsWith("audio/")) return "audio";
  if (firstType.startsWith("application/") || firstType.startsWith("text/")) return "document";
  return "media";
}

module.exports = {
  normalizeWhatsappFrom,
  extractLeadIdentity,
  parseIncomingNumMedia,
  extractIncomingMedia,
  buildMessagePreview,
  inferMessageType
};
