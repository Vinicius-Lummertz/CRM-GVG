"use strict";

function createHealthController() {
  return {
    getHealth(_req, res) {
      res.json({ ok: true });
    }
  };
}

module.exports = {
  createHealthController
};
