"use strict";

function createEventsController({ sseHub }) {
  return {
    streamEvents(req, res) {
      sseHub.connect(req, res);
    }
  };
}

module.exports = {
  createEventsController
};
