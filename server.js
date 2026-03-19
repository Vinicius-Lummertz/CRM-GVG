const express = require("express");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const fs = require("fs");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

function loadEnvFromFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const envFileContent = fs.readFileSync(envPath, "utf8");
  const lines = envFileContent.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFromFile();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DB_DIR, "leads.sqlite");
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_MEDIA_HOSTS = new Set(["api.twilio.com", "mms.twiliocdn.com"]);
const TWILIO_BASIC_AUTH_HEADER =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`
    : null;
let db = null;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const leadsByKey = new Map();
const sseClients = new Set();

function nowIso() {
  return new Date().toISOString();
}

function generateId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function normalizeWhatsappFrom(fromValue) {
  if (!fromValue) return "";
  return String(fromValue).replace(/^whatsapp:/i, "").trim();
}

function extractLeadIdentity(payload) {
  const from = payload.From ? String(payload.From).trim() : "";
  const waId = payload.WaId ? String(payload.WaId).trim() : "";
  const profileName = payload.ProfileName ? String(payload.ProfileName).trim() : "";
  const normalizedFrom = normalizeWhatsappFrom(from);

  return {
    key: waId || normalizedFrom,
    phone: waId || normalizedFrom,
    whatsappFrom: from,
    waId: waId || null,
    name: profileName || "Sem nome"
  };
}

function parseIncomingNumMedia(payload) {
  const rawNumMedia = payload.NumMedia ? String(payload.NumMedia).trim() : "0";
  const parsedNumMedia = Number.parseInt(rawNumMedia, 10);
  if (Number.isNaN(parsedNumMedia) || parsedNumMedia < 0) {
    return 0;
  }
  return parsedNumMedia;
}

function extractIncomingMedia(payload) {
  const numMedia = parseIncomingNumMedia(payload);
  const mediaItems = [];

  for (let index = 0; index < numMedia; index += 1) {
    const mediaUrlRaw = payload[`MediaUrl${index}`];
    const mediaTypeRaw = payload[`MediaContentType${index}`];

    const url = mediaUrlRaw ? String(mediaUrlRaw).trim() : "";
    const contentType = mediaTypeRaw ? String(mediaTypeRaw).trim() : "";

    mediaItems.push({
      index,
      url: url || null,
      contentType: contentType || null
    });
  }

  return mediaItems;
}

function buildMessagePreview(payload, mediaItems) {
  const rawBody = payload.Body ? String(payload.Body) : "";
  const body = rawBody.trim();
  if (body) {
    return body;
  }

  if (mediaItems.length > 0) {
    const firstType = mediaItems[0].contentType ? String(mediaItems[0].contentType).toLowerCase() : "";

    if (firstType === "image/webp") return "\u{1F4AC} Figurinha";
    if (firstType.startsWith("image/")) return "\u{1F4F7} Imagem";
    if (firstType.startsWith("video/")) return "\u{1F3A5} Video";
    if (firstType.startsWith("audio/")) return "\u{1F3B5} Audio";
    if (firstType === "application/pdf") return "\u{1F4C4} PDF";
    if (firstType.startsWith("text/")) return "\u{1F4C4} Documento de texto";
    if (firstType.startsWith("application/")) return "\u{1F4C4} Documento";

    return "\u{1F4CE} Midia recebida";
  }

  return "Sem mensagem";
}

function listLeadsSorted() {
  return Array.from(leadsByKey.values()).sort((a, b) => {
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });
}

function parseMediaJson(rawValue) {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
}

function rowToLead(row) {
  return {
    id: row.id,
    key: row.key,
    phone: row.phone,
    whatsappFrom: row.whatsapp_from,
    waId: row.wa_id || null,
    name: row.name,
    avatarUrl: row.avatar_url || null,
    status: row.status,
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages: []
  };
}

function rowToMessage(row) {
  return {
    id: row.id,
    body: row.body || "",
    preview: row.preview || "",
    direction: row.direction,
    timestamp: row.timestamp,
    messageSid: row.message_sid || null,
    numMedia: Number.isFinite(row.num_media) ? row.num_media : 0,
    media: parseMediaJson(row.media_json)
  };
}

async function initDatabase() {
  fs.mkdirSync(DB_DIR, { recursive: true });

  db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database
  });

  await db.exec("PRAGMA journal_mode = WAL;");
  await db.exec("PRAGMA foreign_keys = ON;");

  await db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT NOT NULL,
      key TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      whatsapp_from TEXT NOT NULL,
      wa_id TEXT,
      name TEXT NOT NULL,
      avatar_url TEXT,
      status TEXT NOT NULL,
      last_message TEXT NOT NULL,
      last_message_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      lead_key TEXT NOT NULL,
      body TEXT,
      preview TEXT NOT NULL,
      direction TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      message_sid TEXT,
      num_media INTEGER NOT NULL DEFAULT 0,
      media_json TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY(lead_key) REFERENCES leads(key) ON DELETE CASCADE
    );
  `);

  await db.exec("CREATE INDEX IF NOT EXISTS idx_messages_lead_key ON messages(lead_key);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);");
}

async function loadStateFromDatabase() {
  if (!db) return;

  leadsByKey.clear();
  const leadRows = await db.all("SELECT * FROM leads ORDER BY datetime(last_message_at) DESC;");
  for (const row of leadRows) {
    const lead = rowToLead(row);
    leadsByKey.set(lead.key, lead);
  }

  const messageRows = await db.all("SELECT * FROM messages ORDER BY datetime(timestamp) ASC;");
  for (const row of messageRows) {
    const message = rowToMessage(row);
    const lead = leadsByKey.get(row.lead_key);
    if (!lead) continue;
    lead.messages.push(message);
  }

  for (const lead of leadsByKey.values()) {
    if (lead.messages.length > 100) {
      lead.messages = lead.messages.slice(-100);
    }
  }
}

async function persistLead(lead) {
  if (!db) return;

  await db.run(
    `
      INSERT INTO leads (
        id, key, phone, whatsapp_from, wa_id, name, avatar_url, status, last_message, last_message_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        id = excluded.id,
        phone = excluded.phone,
        whatsapp_from = excluded.whatsapp_from,
        wa_id = excluded.wa_id,
        name = excluded.name,
        avatar_url = excluded.avatar_url,
        status = excluded.status,
        last_message = excluded.last_message,
        last_message_at = excluded.last_message_at,
        updated_at = excluded.updated_at;
    `,
    [
      lead.id,
      lead.key,
      lead.phone,
      lead.whatsappFrom,
      lead.waId,
      lead.name,
      lead.avatarUrl,
      lead.status,
      lead.lastMessage,
      lead.lastMessageAt,
      lead.createdAt,
      lead.updatedAt
    ]
  );
}

async function persistMessage(leadKey, message) {
  if (!db) return;

  await db.run(
    `
      INSERT OR IGNORE INTO messages (
        id, lead_key, body, preview, direction, timestamp, message_sid, num_media, media_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      message.id,
      leadKey,
      message.body || "",
      message.preview || "",
      message.direction || "inbound",
      message.timestamp,
      message.messageSid,
      message.numMedia || 0,
      JSON.stringify(Array.isArray(message.media) ? message.media : [])
    ]
  );
}

function isAllowedTwilioMediaUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    return TWILIO_MEDIA_HOSTS.has(parsed.hostname);
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

      if (
        [301, 302, 303, 307, 308].includes(statusCode) &&
        redirectLocation &&
        typeof redirectLocation === "string"
      ) {
        upstreamRes.resume();
        const nextUrl = new URL(redirectLocation, parsedUrl).toString();
        console.log(`[media-proxy] redirect status=${statusCode} host=${new URL(nextUrl).hostname}`);
        streamTwilioMedia(nextUrl, res, redirectDepth + 1);
        return;
      }

      if (statusCode >= 400) {
        console.log(`[media-proxy] upstream error status=${statusCode}`);
        let errorBody = "";
        upstreamRes.setEncoding("utf8");
        upstreamRes.on("data", (chunk) => {
          if (errorBody.length < 800) {
            errorBody += chunk;
          }
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
      if (upstreamRes.headers["content-type"]) {
        res.setHeader("Content-Type", upstreamRes.headers["content-type"]);
      }
      if (upstreamRes.headers["content-length"]) {
        res.setHeader("Content-Length", upstreamRes.headers["content-length"]);
      }
      res.setHeader("Cache-Control", "no-store");
      console.log(
        `[media-proxy] upstream ok status=${statusCode} contentType=${upstreamRes.headers["content-type"] || "-"}`
      );
      upstreamRes.pipe(res);
    }
  );

  request.on("error", (err) => {
    console.log(`[media-proxy] request error=${err.message}`);
    if (!res.headersSent) {
      res.status(502).json({ error: "Failed to proxy media from Twilio." });
      return;
    }
    res.end();
  });

  request.end();
}

function broadcastEvent(payload) {
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (_err) {
      sseClients.delete(client);
    }
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/leads", (_req, res) => {
  res.json({
    leads: listLeadsSorted()
  });
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
    res.status(500).json({
      error: "Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to proxy media."
    });
    return;
  }

  console.log("[media-proxy] request accepted");
  streamTwilioMedia(mediaUrl, res);
});

app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

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
    console.log("[webhook] inbound received");

    const identity = extractLeadIdentity(req.body);
    const to = req.body.To ? String(req.body.To).trim() : "";
    const rawBody = req.body.Body ? String(req.body.Body) : "";
    const messageSid = req.body.MessageSid ? String(req.body.MessageSid).trim() : "";
    const numMedia = parseIncomingNumMedia(req.body);
    const mediaItems = extractIncomingMedia(req.body);
    const messagePreview = buildMessagePreview(req.body, mediaItems);
    const leadKey = identity.key || generateId("anon");
    const timestamp = nowIso();
    const firstMediaType = mediaItems[0] && mediaItems[0].contentType ? mediaItems[0].contentType : "-";
    const firstMediaUrl = mediaItems[0] && mediaItems[0].url ? mediaItems[0].url : "-";

    console.log(`[webhook] from=${identity.whatsappFrom || "-"}`);
    console.log(`[webhook] waId=${identity.waId || "-"}`);
    console.log(`[webhook] profileName=${identity.name}`);
    console.log(`[webhook] to=${to || "-"}`);
    console.log(`[webhook] numMedia=${numMedia}`);
    console.log(`[webhook] mediaCount=${mediaItems.length}`);
    console.log(`[webhook] firstMediaType=${firstMediaType}`);
    console.log(`[webhook] firstMediaUrl=${firstMediaUrl}`);
    console.log(`[webhook] preview=${messagePreview}`);

    let lead = leadsByKey.get(leadKey);
    if (!lead) {
      lead = {
        id: leadKey,
        key: leadKey,
        phone: identity.phone || "",
        whatsappFrom: identity.whatsappFrom || "",
        waId: identity.waId,
        name: identity.name,
        avatarUrl: null,
        status: "lead",
        lastMessage: messagePreview,
        lastMessageAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        messages: []
      };
      leadsByKey.set(leadKey, lead);
    } else {
      lead.key = leadKey;
      lead.phone = identity.phone || lead.phone;
      lead.whatsappFrom = identity.whatsappFrom || lead.whatsappFrom;
      lead.waId = identity.waId || lead.waId;
      lead.name = identity.name || lead.name || "Sem nome";
      lead.avatarUrl = lead.avatarUrl || null;
      lead.status = "lead";
      lead.lastMessage = messagePreview;
      lead.lastMessageAt = timestamp;
      lead.updatedAt = timestamp;
    }

    const messageRecord = {
      id: messageSid || generateId("msg"),
      body: rawBody,
      preview: messagePreview,
      direction: "inbound",
      timestamp,
      messageSid: messageSid || null,
      numMedia,
      media: mediaItems
    };

    const alreadyExists = lead.messages.some((message) => message.id === messageRecord.id);
    if (!alreadyExists) {
      lead.messages.push(messageRecord);
    }

    if (lead.messages.length > 100) {
      lead.messages = lead.messages.slice(-100);
    }

    await persistLead(lead);
    await persistMessage(lead.key, messageRecord);

    const payload = {
      type: "lead.updated",
      lead
    };

    broadcastEvent(payload);
    console.log(`[webhook] lead upserted key=${leadKey}`);

    return res.status(200).type("text/plain").send("ok");
  } catch (err) {
    console.error("Erro no webhook:", err);
    return res.status(200).type("text/plain").send("ok");
  }
});

/*
Webhook payload examples (application/x-www-form-urlencoded):
1)
From=whatsapp:+5548999999999
WaId=5548999999999
ProfileName=Joao Teste
Body=
MessageSid=SMIMG001
NumMedia=1
MediaUrl0=https://api.twilio.com/2010-04-01/Accounts/AC.../Messages/MM.../Media/ME...
MediaContentType0=image/jpeg

2)
From=whatsapp:+5548911111111
WaId=5548911111111
ProfileName=Maria
Body=
MessageSid=SMSTK001
NumMedia=1
MediaUrl0=https://api.twilio.com/2010-04-01/Accounts/AC.../Messages/MM.../Media/ME...
MediaContentType0=image/webp

3)
From=whatsapp:+5548922222222
WaId=5548922222222
ProfileName=Carlos
Body=
MessageSid=SMPDF001
NumMedia=1
MediaUrl0=https://api.twilio.com/2010-04-01/Accounts/AC.../Messages/MM.../Media/ME...
MediaContentType0=application/pdf

4)
From=whatsapp:+5548933333333
WaId=5548933333333
ProfileName=Ana
Body=Oi, tenho interesse
MessageSid=SMTXT001
NumMedia=0
*/

async function startServer() {
  try {
    await initDatabase();
    await loadStateFromDatabase();
    console.log(`[db] SQLite inicializado em ${DB_FILE}`);
    console.log(`[db] Leads carregados: ${leadsByKey.size}`);
  } catch (err) {
    console.error("[db] Falha ao inicializar SQLite. Rodando sem persistencia.", err);
  }

  app.listen(PORT, () => {
    console.log(`Servidor ativo em http://localhost:${PORT}`);
    if (TWILIO_BASIC_AUTH_HEADER) {
      console.log("[env] Secrets da env lidos corretamente");
    } else {
      console.log("[env] TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN nao encontrados");
    }
  });
}

startServer();
