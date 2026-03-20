"use strict";

const { sha256, verifySha256Hash, randomCode, randomToken, toIsoAfterMinutes, isExpired } = require("../../domain/security");

function normalizePhone(phone) {
  return String(phone || "").replace(/\s+/g, "").trim();
}

function createAuthService({ repositories, generateId, nowIso, authConfig, whatsappProvider }) {
  async function requestOtp({ phoneE164 }) {
    const phone = normalizePhone(phoneE164);
    if (!phone) {
      throw new Error("phone_e164 is required.");
    }
    if (!/^\+\d{8,15}$/.test(phone)) {
      throw new Error("phone_e164 must be a valid E.164 number.");
    }

    const code = randomCode(6);
    const challengeId = generateId("otp");
    const createdAt = nowIso();
    const expiresAt = toIsoAfterMinutes(authConfig.otpTtlMinutes);

    let status = "pending";
    let providerMessageId = null;
    let lastError = null;
    const debugCode = authConfig.allowDebugOtp && process.env.NODE_ENV !== "production" ? code : null;

    if (!whatsappProvider.hasCredentials && !authConfig.allowDebugOtp) {
      throw new Error(
        "OTP provider is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM or TWILIO_MESSAGING_SERVICE_SID."
      );
    }

    try {
      if (whatsappProvider.hasCredentials) {
        const sendResult = await whatsappProvider.sendTextMessage({
          to: phone,
          body: `Seu codigo OTP: ${code}`
        });
        providerMessageId = sendResult.providerMessageId;
        status = "sent";
      } else {
        status = "sent_debug";
      }
    } catch (err) {
      status = "failed";
      lastError = err.message;
    }

    await repositories.auth.createOtpChallenge({
      id: challengeId,
      phone,
      channel: "whatsapp",
      codeHash: sha256(code),
      status,
      attempts: 0,
      maxAttempts: authConfig.otpMaxAttempts,
      expiresAt,
      providerMessageId,
      lastError,
      createdAt,
      updatedAt: createdAt
    });

    if (status === "failed") {
      throw new Error(lastError || "Failed to send OTP.");
    }

    return {
      challengeId,
      expiresAt,
      retryAfterSec: 30,
      deliveryMode: status,
      debugCode
    };
  }

  async function verifyOtp({ challengeId, code }) {
    const challenge = await repositories.auth.findOtpChallengeById(String(challengeId || ""));
    if (!challenge) {
      throw new Error("OTP challenge not found.");
    }

    if (challenge.status === "verified") {
      throw new Error("OTP challenge already verified.");
    }
    if (challenge.status === "failed") {
      throw new Error("OTP challenge failed to deliver. Request a new code.");
    }

    if (isExpired(challenge.expires_at)) {
      await repositories.auth.updateOtpChallenge({
        id: challenge.id,
        status: "expired",
        attempts: challenge.attempts,
        providerMessageId: challenge.provider_message_id,
        lastError: challenge.last_error,
        updatedAt: nowIso()
      });
      throw new Error("OTP challenge expired.");
    }

    const nextAttempts = Number(challenge.attempts || 0) + 1;
    const maxAttempts = Number(challenge.max_attempts || authConfig.otpMaxAttempts);

    if (!verifySha256Hash(String(code || ""), challenge.code_hash)) {
      await repositories.auth.updateOtpChallenge({
        id: challenge.id,
        status: nextAttempts >= maxAttempts ? "failed" : challenge.status,
        attempts: nextAttempts,
        providerMessageId: challenge.provider_message_id,
        lastError: "invalid_code",
        updatedAt: nowIso()
      });
      throw new Error("Invalid OTP code.");
    }

    await repositories.auth.updateOtpChallenge({
      id: challenge.id,
      status: "verified",
      attempts: nextAttempts,
      providerMessageId: challenge.provider_message_id,
      lastError: null,
      updatedAt: nowIso()
    });

    const timestamp = nowIso();
    const operator = await repositories.auth.upsertOperator({
      id: generateId("operator"),
      phone: challenge.phone,
      name: null,
      role: "operator",
      createdAt: timestamp,
      updatedAt: timestamp
    });

    const accessToken = randomToken(24);
    const refreshToken = randomToken(32);
    const accessExpiresAt = toIsoAfterMinutes(authConfig.accessTtlMinutes);
    const refreshExpiresAt = toIsoAfterMinutes(authConfig.refreshTtlMinutes);

    await repositories.auth.createSession({
      id: generateId("session"),
      operatorId: operator.id,
      accessTokenHash: sha256(accessToken),
      refreshTokenHash: sha256(refreshToken),
      accessExpiresAt,
      refreshExpiresAt,
      revokedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    return {
      accessToken,
      refreshToken,
      accessExpiresAt,
      refreshExpiresAt,
      user: {
        id: operator.id,
        phone: operator.phone,
        name: operator.name,
        role: operator.role
      }
    };
  }

  async function refreshSession({ refreshToken }) {
    const tokenHash = sha256(String(refreshToken || ""));
    const session = await repositories.auth.findSessionByRefreshTokenHash(tokenHash);

    if (!session || session.revoked_at || isExpired(session.refresh_expires_at)) {
      throw new Error("Refresh token invalid or expired.");
    }

    const newAccessToken = randomToken(24);
    const newRefreshToken = randomToken(32);
    const updatedAt = nowIso();
    const accessExpiresAt = toIsoAfterMinutes(authConfig.accessTtlMinutes);
    const refreshExpiresAt = toIsoAfterMinutes(authConfig.refreshTtlMinutes);

    await repositories.auth.rotateSessionTokens({
      id: session.id,
      accessTokenHash: sha256(newAccessToken),
      refreshTokenHash: sha256(newRefreshToken),
      accessExpiresAt,
      refreshExpiresAt,
      updatedAt
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessExpiresAt,
      refreshExpiresAt
    };
  }

  async function authenticateAccessToken(accessToken) {
    const tokenHash = sha256(String(accessToken || ""));
    const session = await repositories.auth.findSessionByAccessTokenHash(tokenHash);

    if (!session || session.revoked_at || isExpired(session.access_expires_at)) {
      return null;
    }

    const operator = await repositories.auth.findOperatorById(session.operator_id);
    if (!operator) return null;

    return {
      session,
      operator
    };
  }

  async function logout({ accessToken }) {
    const tokenHash = sha256(String(accessToken || ""));
    const session = await repositories.auth.findSessionByAccessTokenHash(tokenHash);
    if (!session) return;
    await repositories.auth.revokeSessionById(session.id, nowIso());
  }

  async function getMe({ accessToken }) {
    const auth = await authenticateAccessToken(accessToken);
    if (!auth) return null;
    return {
      id: auth.operator.id,
      phone: auth.operator.phone,
      name: auth.operator.name,
      role: auth.operator.role
    };
  }

  async function listOperators() {
    const rows = await repositories.auth.listOperators();
    return rows.map((row) => ({
      id: row.id,
      phone: row.phone,
      name: row.name,
      role: row.role,
      updatedAt: row.updated_at
    }));
  }

  return {
    requestOtp,
    verifyOtp,
    refreshSession,
    authenticateAccessToken,
    logout,
    getMe,
    listOperators
  };
}

module.exports = {
  createAuthService
};
