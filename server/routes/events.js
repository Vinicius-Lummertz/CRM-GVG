"use strict";

function registerEventsRoutesV1(app, { eventsV1Controller }, { requireAuth }) {
  app.get("/api/v1/events", requireAuth, eventsV1Controller.streamEvents);
}

module.exports = {
  registerEventsRoutesV1
};
