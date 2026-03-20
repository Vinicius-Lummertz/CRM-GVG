"use strict";

function registerEventsRoutes(app, { eventsController }) {
  app.get("/api/events", eventsController.streamEvents);
}

module.exports = {
  registerEventsRoutes
};
