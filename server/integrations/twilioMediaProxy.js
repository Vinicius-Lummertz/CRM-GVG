"use strict";

const https = require("https");

function createTwilioMediaProxy({ accountSid, authToken, allowedHosts }) {
  const twilioHosts = new Set(allowedHosts || ["api.twilio.com", "mms.twiliocdn.com"]);
  const basicAuthHeader =
    accountSid && authToken
      ? `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`
      : null;

  function isAllowedTwilioMediaUrl(rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      return parsed.protocol === "https:" && twilioHosts.has(parsed.hostname);
    } catch (_err) {
      return false;
    }
  }

  function streamTwilioMedia(rawUrl, res, redirectDepth = 0) {
    if (redirectDepth > 5) {
      res.status(502).json({ error: "Too many redirects while fetching media." });
      return;
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl);
    } catch (_err) {
      res.status(400).json({ error: "Invalid media URL." });
      return;
    }

    const headers = {};
    if (parsedUrl.hostname === "api.twilio.com" && basicAuthHeader) {
      headers.Authorization = basicAuthHeader;
    }

    const request = https.request(
      {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: "GET",
        headers
      },
      (upstreamRes) => {
        const statusCode = upstreamRes.statusCode || 502;
        const redirectLocation = upstreamRes.headers.location;

        if ([301, 302, 303, 307, 308].includes(statusCode) && redirectLocation) {
          upstreamRes.resume();
          const nextUrl = new URL(redirectLocation, parsedUrl).toString();
          streamTwilioMedia(nextUrl, res, redirectDepth + 1);
          return;
        }

        if (statusCode >= 400) {
          let errorBody = "";
          upstreamRes.setEncoding("utf8");
          upstreamRes.on("data", (chunk) => {
            if (errorBody.length < 800) errorBody += chunk;
          });
          upstreamRes.on("end", () => {
            res.status(statusCode).json({
              error: "Twilio media request failed.",
              statusCode,
              details: errorBody.slice(0, 300)
            });
          });
          return;
        }

        res.status(statusCode);
        if (upstreamRes.headers["content-type"]) res.setHeader("Content-Type", upstreamRes.headers["content-type"]);
        if (upstreamRes.headers["content-length"]) res.setHeader("Content-Length", upstreamRes.headers["content-length"]);
        res.setHeader("Cache-Control", "no-store");
        upstreamRes.pipe(res);
      }
    );

    request.on("error", () => {
      if (!res.headersSent) res.status(502).json({ error: "Failed to proxy media from Twilio." });
      else res.end();
    });
    request.end();
  }

  function handleMediaProxyRequest(req, res) {
    const mediaUrl = req.query.url ? String(req.query.url) : "";
    if (!mediaUrl) {
      res.status(400).json({ error: "Missing query param: url" });
      return;
    }
    if (!isAllowedTwilioMediaUrl(mediaUrl)) {
      res.status(400).json({ error: "Invalid media URL host." });
      return;
    }
    if (!basicAuthHeader) {
      res.status(500).json({ error: "Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to proxy media." });
      return;
    }
    streamTwilioMedia(mediaUrl, res);
  }

  return {
    hasCredentials: Boolean(basicAuthHeader),
    isAllowedTwilioMediaUrl,
    handleMediaProxyRequest
  };
}

module.exports = {
  createTwilioMediaProxy
};
