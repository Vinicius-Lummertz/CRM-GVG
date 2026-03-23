"use strict";

function createProviderWebhooksV1Controller({ v1Service }) {
  return {
    async inbound(req, res) {
      try {
        await v1Service.providerWebhooks.inbound(req.body || {});
        res.status(200).type("text/plain").send("ok");
      } catch (err) {
        console.error("[v1 webhook inbound] erro:", err.message);
        res.status(200).type("text/plain").send("ok");
      }
    },

    async status(req, res) {
      try {
        await v1Service.providerWebhooks.status(req.body || {});
        res.status(200).type("text/plain").send("ok");
      } catch (err) {
        console.error("[v1 webhook status] erro:", err.message);
        res.status(200).type("text/plain").send("ok");
      }
    }
  };
}

module.exports = {
  createProviderWebhooksV1Controller
};
