"use strict";

const { nowIso } = require("../domain/time");

function createSseHub() {
  const clients = new Set();

  function broadcast(payloadObject) {
    const payload = `data: ${JSON.stringify(payloadObject)}\n\n`;
    for (const client of clients) {
      try {
        client.write(payload);
      } catch (_err) {
        clients.delete(client);
      }
    }
  }

  function connect(req, res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (res.flushHeaders) res.flushHeaders();

    clients.add(res);
    res.write(`event: ready\ndata: ${JSON.stringify({ at: nowIso() })}\n\n`);

    const heartbeat = setInterval(() => {
      try {
        res.write(`event: ping\ndata: ${JSON.stringify({ at: nowIso() })}\n\n`);
      } catch (_err) {
        clearInterval(heartbeat);
        clients.delete(res);
      }
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(res);
      res.end();
    });
  }

  return {
    connect,
    broadcast
  };
}

module.exports = {
  createSseHub
};
