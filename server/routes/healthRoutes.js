"use strict";

function registerHealthRoutes(app, { healthController }) {
  app.get("/health", healthController.getHealth);
}

module.exports = {
  registerHealthRoutes
};
