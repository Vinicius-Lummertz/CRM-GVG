"use strict";

const https = require("https");
const querystring = require("querystring");

function normalizeWhatsappAddress(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.startsWith("whatsapp:") ? raw : `whatsapp:${raw}`;
}

function createWhatsappProvider({ accountSid, authToken, fromNumber, statusCallbackUrl }) {
  const hasCredentials = Boolean(accountSid && authToken && fromNumber);

  async function sendTextMessage(input) {
    if (!hasCredentials) {
      throw new Error("WhatsApp provider is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM.");
    }

    const postBody = {
      To: normalizeWhatsappAddress(input.to),
      From: normalizeWhatsappAddress(fromNumber),
      Body: String(input.body || "")
    };

    if (statusCallbackUrl) {
      postBody.StatusCallback = statusCallbackUrl;
    }

    const payload = querystring.stringify(postBody);
    const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;

    const responsePayload = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          protocol: "https:",
          hostname: "api.twilio.com",
          port: 443,
          method: "POST",
          path: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(payload)
          }
        },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => {
            let parsedBody = null;
            try {
              parsedBody = body ? JSON.parse(body) : {};
            } catch (_err) {
              parsedBody = { raw: body };
            }

            const statusCode = res.statusCode || 500;
            if (statusCode >= 400) {
              const detail = typeof parsedBody === "object" ? JSON.stringify(parsedBody) : String(parsedBody);
              reject(new Error(`Twilio send failed (${statusCode}): ${detail}`));
              return;
            }

            resolve(parsedBody);
          });
        }
      );

      req.on("error", reject);
      req.write(payload);
      req.end();
    });

    return {
      providerMessageId: responsePayload?.sid || null,
      providerStatus: responsePayload?.status || "queued",
      providerPayload: responsePayload
    };
  }

  return {
    hasCredentials,
    sendTextMessage
  };
}

module.exports = {
  createWhatsappProvider
};
