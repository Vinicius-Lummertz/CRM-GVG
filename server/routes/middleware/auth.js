"use strict";

function extractBearerToken(authorizationHeader) {
  const raw = String(authorizationHeader || "").trim();
  if (!raw.toLowerCase().startsWith("bearer ")) return "";
  return raw.slice(7).trim();
}

function createRequireAuth(v1Service) {
  return async function requireAuth(req, res, next) {
    try {
      const token = extractBearerToken(req.headers.authorization);
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const auth = await v1Service.auth.authenticateAccessToken(token);
      if (!auth) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      req.auth = {
        token,
        user: {
          id: auth.operator.id,
          phone: auth.operator.phone,
          name: auth.operator.name,
          role: auth.operator.role
        },
        sessionId: auth.session.id
      };

      next();
    } catch (_err) {
      res.status(401).json({ error: "Unauthorized" });
    }
  };
}

module.exports = {
  extractBearerToken,
  createRequireAuth
};
