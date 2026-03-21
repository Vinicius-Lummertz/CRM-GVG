"use strict";

const { assertNoError } = require("./supabaseUtils");

function createAuthRepository(db) {
  async function createOtpChallenge(input) {
    const { error } = await db.from("otp_challenges").insert({
      id: input.id,
      phone: input.phone,
      channel: input.channel,
      code_hash: input.codeHash,
      status: input.status,
      attempts: input.attempts,
      max_attempts: input.maxAttempts,
      expires_at: input.expiresAt,
      provider_message_id: input.providerMessageId || null,
      last_error: input.lastError || null,
      created_at: input.createdAt,
      updated_at: input.updatedAt
    });
    assertNoError(error);
  }

  async function findOtpChallengeById(challengeId) {
    const { data, error } = await db.from("otp_challenges").select("*").eq("id", challengeId).maybeSingle();
    assertNoError(error);
    return data;
  }

  async function updateOtpChallenge(input) {
    const { error } = await db.from("otp_challenges").update({
      status: input.status,
      attempts: input.attempts,
      provider_message_id: input.providerMessageId || null,
      last_error: input.lastError || null,
      updated_at: input.updatedAt
    }).eq("id", input.id);
    assertNoError(error);
  }

  async function findOperatorById(operatorId) {
    const { data, error } = await db.from("operators").select("*").eq("id", operatorId).maybeSingle();
    assertNoError(error);
    return data;
  }

  async function findOperatorByPhone(phone) {
    const { data, error } = await db.from("operators").select("*").eq("phone", phone).maybeSingle();
    assertNoError(error);
    return data;
  }

  async function upsertOperator(input) {
    const existing = await findOperatorByPhone(input.phone);
    if (existing) {
      const { error } = await db.from("operators").update({
        name: input.name || existing.name,
        role: input.role || existing.role,
        updated_at: input.updatedAt
      }).eq("id", existing.id);
      assertNoError(error);
      return findOperatorById(existing.id);
    }

    const { error } = await db.from("operators").insert({
      id: input.id,
      phone: input.phone,
      name: input.name || null,
      role: input.role || "operator",
      created_at: input.createdAt,
      updated_at: input.updatedAt
    });
    assertNoError(error);
    return findOperatorById(input.id);
  }

  async function listOperators() {
    const { data, error } = await db.from("operators").select("*").order("updated_at", { ascending: false });
    assertNoError(error);
    return data || [];
  }

  async function createSession(input) {
    const { error } = await db.from("auth_sessions").insert({
      id: input.id,
      operator_id: input.operatorId,
      access_token_hash: input.accessTokenHash,
      refresh_token_hash: input.refreshTokenHash,
      access_expires_at: input.accessExpiresAt,
      refresh_expires_at: input.refreshExpiresAt,
      revoked_at: input.revokedAt || null,
      created_at: input.createdAt,
      updated_at: input.updatedAt
    });
    assertNoError(error);
  }

  async function findSessionByAccessTokenHash(accessTokenHash) {
    const { data, error } = await db.from("auth_sessions").select("*").eq("access_token_hash", accessTokenHash).maybeSingle();
    assertNoError(error);
    return data;
  }

  async function findSessionByRefreshTokenHash(refreshTokenHash) {
    const { data, error } = await db.from("auth_sessions").select("*").eq("refresh_token_hash", refreshTokenHash).maybeSingle();
    assertNoError(error);
    return data;
  }

  async function rotateSessionTokens(input) {
    const { error } = await db.from("auth_sessions").update({
      access_token_hash: input.accessTokenHash,
      refresh_token_hash: input.refreshTokenHash,
      access_expires_at: input.accessExpiresAt,
      refresh_expires_at: input.refreshExpiresAt,
      updated_at: input.updatedAt
    }).eq("id", input.id);
    assertNoError(error);
  }

  async function revokeSessionById(sessionId, revokedAt) {
    const { error } = await db.from("auth_sessions").update({ revoked_at: revokedAt, updated_at: revokedAt }).eq("id", sessionId);
    assertNoError(error);
  }

  return {
    createOtpChallenge,
    findOtpChallengeById,
    updateOtpChallenge,
    findOperatorById,
    findOperatorByPhone,
    upsertOperator,
    listOperators,
    createSession,
    findSessionByAccessTokenHash,
    findSessionByRefreshTokenHash,
    rotateSessionTokens,
    revokeSessionById
  };
}

module.exports = { createAuthRepository };
