const express = require("express");
const path = require("path");
const fs = require("fs");
const https = require("https");
const { initDb } = require("./db/initDb");
const { createCrmService } = require("./services/crmService");

function loadEnvFromFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFromFile();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "data", "leads.sqlite");

const AI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ONPENAI_API_KEY || "";
const AI_MODEL = String(process.env.GEMINI_MODEL || process.env.OPENAI_MODEL || "gemini-3.1-flash-lite-preview").trim();
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";

const TWILIO_MEDIA_HOSTS = new Set(["api.twilio.com", "mms.twiliocdn.com"]);
const TWILIO_BASIC_AUTH_HEADER =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`
    : null;

const sseClients = new Set();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function nowIso() {
  return new Date().toISOString();
}

function isAllowedTwilioMediaUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === "https:" && TWILIO_MEDIA_HOSTS.has(parsed.hostname);
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
  if (parsedUrl.hostname === "api.twilio.com" && TWILIO_BASIC_AUTH_HEADER) {
    headers.Authorization = TWILIO_BASIC_AUTH_HEADER;
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

async function startServer() {
  const db = await initDb(DB_FILE);
  const crm = createCrmService({
    db,
    openAiApiKey: AI_API_KEY,
    openAiModel: AI_MODEL,
    emitLeadUpdated: async (leadId) => {
      const lead = await crm.fetchLeadViewById(leadId);
      if (!lead) return;
      const payload = `data: ${JSON.stringify({ type: "lead.updated", lead })}\n\n`;
      for (const client of sseClients) {
        try {
          client.write(payload);
        } catch (_err) {
          sseClients.delete(client);
        }
      }
    }
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/leads", async (req, res) => {
    try {
      const filters = {
        status: req.query.status ? String(req.query.status).trim() : null,
        temperature: req.query.temperature ? String(req.query.temperature).trim() : null,
        attentionRequired:
          req.query.attention_required === undefined
            ? null
            : req.query.attention_required === "1" || req.query.attention_required === "true"
      };
      const leads = await crm.listLeadViews(filters);
      res.json({ leads });
    } catch (err) {
      console.error("[api/leads] erro:", err.message);
      res.status(500).json({ error: "Falha ao carregar leads." });
    }
  });

  app.get("/api/leads/:leadId/messages", async (req, res) => {
    try {
      const limit = Number.parseInt(String(req.query.limit || "100"), 10);
      const messages = await crm.getLeadMessages(String(req.params.leadId), limit);
      res.json({ messages });
    } catch (err) {
      console.error("[api/leads/:leadId/messages] erro:", err.message);
      res.status(500).json({ error: "Falha ao carregar mensagens." });
    }
  });

  app.get("/api/media-proxy", (req, res) => {
    const mediaUrl = req.query.url ? String(req.query.url) : "";
    if (!mediaUrl) {
      res.status(400).json({ error: "Missing query param: url" });
      return;
    }
    if (!isAllowedTwilioMediaUrl(mediaUrl)) {
      res.status(400).json({ error: "Invalid media URL host." });
      return;
    }
    if (!TWILIO_BASIC_AUTH_HEADER) {
      res.status(500).json({ error: "Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to proxy media." });
      return;
    }
    streamTwilioMedia(mediaUrl, res);
  });

  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (res.flushHeaders) res.flushHeaders();

    sseClients.add(res);
    res.write(`event: ready\ndata: ${JSON.stringify({ at: nowIso() })}\n\n`);

    const heartbeat = setInterval(() => {
      try {
        res.write(`event: ping\ndata: ${JSON.stringify({ at: nowIso() })}\n\n`);
      } catch (_err) {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
      res.end();
    });
  });

  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      const result = await crm.processInboundWebhook(req.body || {});
      res.status(200).type("text/plain").send("ok");
      if (result.shouldAnalyze) {
        crm.queueLeadAnalysis(result.leadId, result.triggerReason);
      }
      await crm.fetchLeadViewById(result.leadId).then((lead) => {
        if (!lead) return;
        const payload = `data: ${JSON.stringify({ type: "lead.updated", lead })}\n\n`;
        for (const client of sseClients) {
          try {
            client.write(payload);
          } catch (_err) {
            sseClients.delete(client);
          }
        }
      });
    } catch (err) {
      console.error("[webhook] erro:", err.message);
      res.status(200).type("text/plain").send("ok");
    }
  });

  app.listen(PORT, () => {
    console.log(`[db] SQLite inicializado em ${DB_FILE}`);
    console.log(`Servidor ativo em http://localhost:${PORT}`);
    if (TWILIO_BASIC_AUTH_HEADER) console.log("[env] Secrets da env lidos corretamente");
    if (process.env.ONPENAI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      console.log("[env] Aviso: ONPENAI_API_KEY encontrado, prefira GEMINI_API_KEY.");
    }
    if (AI_API_KEY) console.log(`[env] AI configurada com modelo ${AI_MODEL}`);
  });
}

startServer().catch((err) => {
  console.error("[startup] erro fatal:", err);
  process.exit(1);
});
