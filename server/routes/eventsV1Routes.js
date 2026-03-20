"use strict";

function registerEventsV1Routes(app, { eventsV1Controller }, { requireAuth }) {
  app.get("/api/v1/events", requireAuth, eventsV1Controller.streamEvents);
}

module.exports = {
  registerEventsV1Routes
};
