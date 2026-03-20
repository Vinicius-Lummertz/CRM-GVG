"use strict";

const { extractBearerToken } = require("../http/authMiddleware");

function createAuthV1Controller({ v1Service }) {
  return {
    async requestOtp(req, res) {
      try {
        const result = await v1Service.auth.requestOtp({
          phoneE164: req.body?.phone_e164
        });
        res.status(200).json({
          challenge_id: result.challengeId,
          expires_at: result.expiresAt,
          retry_after_sec: result.retryAfterSec,
          delivery_mode: result.deliveryMode,
          debug_code: result.debugCode || null
        });
      } catch (err) {
        res.status(400).json({ error: err.message || "Failed to request OTP." });
      }
    },

    async verifyOtp(req, res) {
      try {
        const result = await v1Service.auth.verifyOtp({
          challengeId: req.body?.challenge_id,
          code: req.body?.code
        });

        res.status(200).json({
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          access_expires_at: result.accessExpiresAt,
          refresh_expires_at: result.refreshExpiresAt,
          user: result.user
        });
      } catch (err) {
        res.status(400).json({ error: err.message || "Failed to verify OTP." });
      }
    },

    async refresh(req, res) {
      try {
        const result = await v1Service.auth.refreshSession({
          refreshToken: req.body?.refresh_token
        });
        res.status(200).json({
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          access_expires_at: result.accessExpiresAt,
          refresh_expires_at: result.refreshExpiresAt
        });
      } catch (err) {
        res.status(401).json({ error: err.message || "Failed to refresh session." });
      }
    },

    async logout(req, res) {
      try {
        const token = req.auth?.token || extractBearerToken(req.headers.authorization);
        if (token) {
          await v1Service.auth.logout({ accessToken: token });
        }
        res.status(200).json({ ok: true });
      } catch (_err) {
        res.status(200).json({ ok: true });
      }
    },

    async me(req, res) {
      const me = await v1Service.auth.getMe({ accessToken: req.auth?.token || "" });
      if (!me) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      res.status(200).json({ user: me });
    }
  };
}

module.exports = {
  createAuthV1Controller
};
