"use strict";

function createEventsV1Controller({ sseHub }) {
  return {
    streamEvents(req, res) {
      sseHub.connect(req, res);
    }
  };
}

module.exports = {
  createEventsV1Controller
};
