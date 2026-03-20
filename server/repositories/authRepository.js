"use strict";

function createAuthRepository(db) {
  async function createOtpChallenge(input) {
    await db.run(
      `
        INSERT INTO otp_challenges (id, phone, channel, code_hash, status, attempts, max_attempts, expires_at, provider_message_id, last_error, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.phone,
        input.channel,
        input.codeHash,
        input.status,
        input.attempts,
        input.maxAttempts,
        input.expiresAt,
        input.providerMessageId || null,
        input.lastError || null,
        input.createdAt,
        input.updatedAt
      ]
    );
  }

  async function findOtpChallengeById(challengeId) {
    return db.get("SELECT * FROM otp_challenges WHERE id = ?", [challengeId]);
  }

  async function updateOtpChallenge(input) {
    await db.run(
      `
        UPDATE otp_challenges
        SET status = ?, attempts = ?, provider_message_id = ?, last_error = ?, updated_at = ?
        WHERE id = ?
      `,
      [input.status, input.attempts, input.providerMessageId || null, input.lastError || null, input.updatedAt, input.id]
    );
  }

  async function findOperatorById(operatorId) {
    return db.get("SELECT * FROM operators WHERE id = ?", [operatorId]);
  }

  async function findOperatorByPhone(phone) {
    return db.get("SELECT * FROM operators WHERE phone = ?", [phone]);
  }

  async function upsertOperator(input) {
    const existing = await findOperatorByPhone(input.phone);
    if (existing) {
      await db.run("UPDATE operators SET name = COALESCE(?, name), role = COALESCE(?, role), updated_at = ? WHERE id = ?", [
        input.name || null,
        input.role || null,
        input.updatedAt,
        existing.id
      ]);
      return findOperatorById(existing.id);
    }

    await db.run(
      "INSERT INTO operators (id, phone, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [input.id, input.phone, input.name || null, input.role || "operator", input.createdAt, input.updatedAt]
    );
    return findOperatorById(input.id);
  }

  async function listOperators() {
    return db.all("SELECT * FROM operators ORDER BY updated_at DESC");
  }

  async function createSession(input) {
    await db.run(
      `
        INSERT INTO auth_sessions (
          id, operator_id, access_token_hash, refresh_token_hash,
          access_expires_at, refresh_expires_at, revoked_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.id,
        input.operatorId,
        input.accessTokenHash,
        input.refreshTokenHash,
        input.accessExpiresAt,
        input.refreshExpiresAt,
        input.revokedAt || null,
        input.createdAt,
        input.updatedAt
      ]
    );
  }

  async function findSessionByAccessTokenHash(accessTokenHash) {
    return db.get("SELECT * FROM auth_sessions WHERE access_token_hash = ?", [accessTokenHash]);
  }

  async function findSessionByRefreshTokenHash(refreshTokenHash) {
    return db.get("SELECT * FROM auth_sessions WHERE refresh_token_hash = ?", [refreshTokenHash]);
  }

  async function rotateSessionTokens(input) {
    await db.run(
      `
        UPDATE auth_sessions
        SET access_token_hash = ?, refresh_token_hash = ?, access_expires_at = ?, refresh_expires_at = ?, updated_at = ?
        WHERE id = ?
      `,
      [
        input.accessTokenHash,
        input.refreshTokenHash,
        input.accessExpiresAt,
        input.refreshExpiresAt,
        input.updatedAt,
        input.id
      ]
    );
  }

  async function revokeSessionById(sessionId, revokedAt) {
    await db.run("UPDATE auth_sessions SET revoked_at = ?, updated_at = ? WHERE id = ?", [revokedAt, revokedAt, sessionId]);
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

module.exports = {
  createAuthRepository
};
