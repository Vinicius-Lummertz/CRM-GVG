"use strict";

function registerMediaRoutes(app, { mediaController }) {
  app.get("/api/media-proxy", mediaController.proxyMedia);
}

module.exports = {
  registerMediaRoutes
};
