"use strict";

function registerAuthRoutes(app, { authV1Controller }, { requireAuth }) {
  app.post("/api/v1/auth/otp/request", authV1Controller.requestOtp);
  app.post("/api/v1/auth/otp/verify", authV1Controller.verifyOtp);
  app.post("/api/v1/auth/refresh", authV1Controller.refresh);
  app.post("/api/v1/auth/logout", requireAuth, authV1Controller.logout);
  app.get("/api/v1/auth/me", requireAuth, authV1Controller.me);
}

module.exports = {
  registerAuthRoutes
};
