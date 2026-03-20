"use strict";

const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function ensureColumn(db, tableName, columnName, definition) {
  const rows = await db.all(`PRAGMA table_info(${tableName})`);
  const hasColumn = rows.some((row) => row.name === columnName);
  if (!hasColumn) {
    await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function createTables(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      external_key TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      whatsapp_from TEXT,
      wa_id TEXT,
      name TEXT NOT NULL DEFAULT 'Sem nome',
      avatar_url TEXT,
      source TEXT DEFAULT 'whatsapp',
      status TEXT NOT NULL DEFAULT 'lead',
      pipeline_position INTEGER DEFAULT 0,
      priority_score REAL DEFAULT 0,
      temperature TEXT DEFAULT 'cold',
      owner_id TEXT,
      owner_name TEXT,
      ai_summary TEXT,
      ai_last_reason TEXT,
      ai_last_confidence REAL DEFAULT 0,
      last_message_preview TEXT,
      last_message_at TEXT,
      last_inbound_at TEXT,
      last_outbound_at TEXT,
      unread_count INTEGER DEFAULT 0,
      message_count_total INTEGER DEFAULT 0,
      inbound_count INTEGER DEFAULT 0,
      outbound_count INTEGER DEFAULT 0,
      media_count INTEGER DEFAULT 0,
      messages_after_last_resume INTEGER DEFAULT 0,
      last_analyzed_message_id TEXT,
      last_analysis_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived INTEGER DEFAULT 0
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      message_sid TEXT,
      provider_message_id TEXT,
      direction TEXT NOT NULL,
      body TEXT,
      preview TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text',
      media_count INTEGER DEFAULT 0,
      first_media_url TEXT,
      first_media_content_type TEXT,
      raw_payload_json TEXT,
      ai_relevant INTEGER DEFAULT 1,
      sent_by_customer INTEGER DEFAULT 1,
      delivery_status TEXT DEFAULT 'received',
      mode TEXT DEFAULT 'real',
      idempotency_key TEXT,
      template_id TEXT,
      queued_at TEXT,
      sending_at TEXT,
      sent_at TEXT,
      delivered_at TEXT,
      read_at TEXT,
      failed_at TEXT,
      failed_reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS message_media (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      media_index INTEGER NOT NULL,
      media_url TEXT,
      content_type TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id),
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS message_delivery (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      delivery_status TEXT NOT NULL,
      provider_payload_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_state (
      id TEXT PRIMARY KEY,
      lead_id TEXT UNIQUE NOT NULL,
      current_status TEXT NOT NULL DEFAULT 'lead',
      current_stage_label TEXT,
      ai_summary TEXT,
      ai_short_summary TEXT,
      ai_last_reason TEXT,
      ai_last_confidence REAL DEFAULT 0,
      budget_text TEXT,
      messages_after_last_resume INTEGER DEFAULT 0,
      last_analyzed_message_id TEXT,
      last_analysis_at TEXT,
      last_trigger_reason TEXT,
      attention_required INTEGER DEFAULT 0,
      sentiment TEXT DEFAULT 'neutral',
      interest_level TEXT DEFAULT 'unknown',
      risk_level TEXT DEFAULT 'low',
      next_action TEXT,
      next_action_due_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      lead_id TEXT UNIQUE NOT NULL,
      owner_id TEXT,
      owner_name TEXT,
      archived INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS lead_events (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      old_status TEXT,
      new_status TEXT,
      title TEXT NOT NULL,
      description TEXT,
      confidence REAL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'ai',
      created_at TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_analysis_runs (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      model TEXT NOT NULL,
      trigger_reason TEXT NOT NULL,
      input_messages_count INTEGER DEFAULT 0,
      input_chars_count INTEGER DEFAULT 0,
      old_status TEXT,
      suggested_status TEXT,
      applied_status TEXT,
      confidence REAL DEFAULT 0,
      attention_required INTEGER DEFAULT 0,
      request_payload_json TEXT,
      response_payload_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS operators (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'operator',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      body TEXT NOT NULL,
      language TEXT DEFAULT 'pt_BR',
      category TEXT DEFAULT 'utility',
      variables_json TEXT,
      is_active INTEGER DEFAULT 1,
      created_by_operator_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (created_by_operator_id) REFERENCES operators(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS otp_challenges (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'whatsapp',
      code_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 5,
      expires_at TEXT NOT NULL,
      provider_message_id TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      operator_id TEXT NOT NULL,
      access_token_hash TEXT UNIQUE NOT NULL,
      refresh_token_hash TEXT UNIQUE NOT NULL,
      access_expires_at TEXT NOT NULL,
      refresh_expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (operator_id) REFERENCES operators(id)
    );
  `);
}

async function ensureLegacyCompatibility(db) {
  await ensureColumn(db, "leads", "id", "TEXT");
  await ensureColumn(db, "leads", "external_key", "TEXT");
  await ensureColumn(db, "leads", "last_message", "TEXT");
  await ensureColumn(db, "leads", "source", "TEXT DEFAULT 'whatsapp'");
  await ensureColumn(db, "leads", "status", "TEXT DEFAULT 'lead'");
  await ensureColumn(db, "leads", "pipeline_position", "INTEGER DEFAULT 0");
  await ensureColumn(db, "leads", "priority_score", "REAL DEFAULT 0");
  await ensureColumn(db, "leads", "temperature", "TEXT DEFAULT 'cold'");
  await ensureColumn(db, "leads", "owner_id", "TEXT");
  await ensureColumn(db, "leads", "owner_name", "TEXT");
  await ensureColumn(db, "leads", "ai_summary", "TEXT");
  await ensureColumn(db, "leads", "ai_last_reason", "TEXT");
  await ensureColumn(db, "leads", "ai_last_confidence", "REAL DEFAULT 0");
  await ensureColumn(db, "leads", "last_message_preview", "TEXT");
  await ensureColumn(db, "leads", "last_message_at", "TEXT");
  await ensureColumn(db, "leads", "last_inbound_at", "TEXT");
  await ensureColumn(db, "leads", "last_outbound_at", "TEXT");
  await ensureColumn(db, "leads", "unread_count", "INTEGER DEFAULT 0");
  await ensureColumn(db, "leads", "message_count_total", "INTEGER DEFAULT 0");
  await ensureColumn(db, "leads", "inbound_count", "INTEGER DEFAULT 0");
  await ensureColumn(db, "leads", "outbound_count", "INTEGER DEFAULT 0");
  await ensureColumn(db, "leads", "media_count", "INTEGER DEFAULT 0");
  await ensureColumn(db, "leads", "messages_after_last_resume", "INTEGER DEFAULT 0");
  await ensureColumn(db, "leads", "last_analyzed_message_id", "TEXT");
  await ensureColumn(db, "leads", "last_analysis_at", "TEXT");
  await ensureColumn(db, "leads", "archived", "INTEGER DEFAULT 0");
  await ensureColumn(db, "leads", "created_at", "TEXT");
  await ensureColumn(db, "leads", "updated_at", "TEXT");

  await ensureColumn(db, "messages", "lead_id", "TEXT");
  await ensureColumn(db, "messages", "message_type", "TEXT DEFAULT 'text'");
  await ensureColumn(db, "messages", "media_count", "INTEGER DEFAULT 0");
  await ensureColumn(db, "messages", "first_media_url", "TEXT");
  await ensureColumn(db, "messages", "first_media_content_type", "TEXT");
  await ensureColumn(db, "messages", "raw_payload_json", "TEXT");
  await ensureColumn(db, "messages", "created_at", "TEXT");
  await ensureColumn(db, "messages", "sent_by_customer", "INTEGER DEFAULT 1");
  await ensureColumn(db, "messages", "provider_message_id", "TEXT");
  await ensureColumn(db, "messages", "delivery_status", "TEXT DEFAULT 'received'");
  await ensureColumn(db, "messages", "mode", "TEXT DEFAULT 'real'");
  await ensureColumn(db, "messages", "idempotency_key", "TEXT");
  await ensureColumn(db, "messages", "template_id", "TEXT");
  await ensureColumn(db, "messages", "queued_at", "TEXT");
  await ensureColumn(db, "messages", "sending_at", "TEXT");
  await ensureColumn(db, "messages", "sent_at", "TEXT");
  await ensureColumn(db, "messages", "delivered_at", "TEXT");
  await ensureColumn(db, "messages", "read_at", "TEXT");
  await ensureColumn(db, "messages", "failed_at", "TEXT");
  await ensureColumn(db, "messages", "failed_reason", "TEXT");

  await ensureColumn(db, "conversation_state", "budget_text", "TEXT");

  const now = new Date().toISOString();

  await db.run("UPDATE leads SET external_key = COALESCE(NULLIF(external_key, ''), id);");
  await db.run("UPDATE leads SET id = COALESCE(NULLIF(id, ''), external_key);");
  await db.run("UPDATE leads SET id = COALESCE(NULLIF(id, ''), key);").catch(() => {});
  await db.run("UPDATE leads SET source = COALESCE(NULLIF(source, ''), 'whatsapp');");
  await db.run("UPDATE leads SET status = COALESCE(NULLIF(status, ''), 'lead');");
  await db.run("UPDATE leads SET temperature = COALESCE(NULLIF(temperature, ''), 'cold');");
  await db.run("UPDATE leads SET last_message_preview = COALESCE(NULLIF(last_message_preview, ''), last_message, 'Sem mensagem');").catch(() => {});
  await db.run("UPDATE leads SET created_at = COALESCE(created_at, ?);", [now]);
  await db.run("UPDATE leads SET updated_at = COALESCE(updated_at, created_at, ?);", [now]);
  await db.run("UPDATE leads SET last_message = COALESCE(NULLIF(last_message, ''), last_message_preview, 'Sem mensagem');").catch(() => {});

  await db.run("UPDATE messages SET created_at = COALESCE(created_at, timestamp, ?);", [now]).catch(() => {});
  await db.run("UPDATE messages SET mode = COALESCE(NULLIF(mode, ''), 'real');");
  await db.run("UPDATE messages SET delivery_status = COALESCE(NULLIF(delivery_status, ''), CASE WHEN direction = 'outbound' THEN 'queued' ELSE 'received' END);");
  await db.run("UPDATE messages SET queued_at = COALESCE(queued_at, created_at) WHERE direction = 'outbound' AND queued_at IS NULL;");
  await db.run("UPDATE conversation_state SET budget_text = COALESCE(NULLIF(budget_text, ''), 'Nao informado.');");
}

async function backfillConversations(db) {
  await db.run(
    `
      INSERT INTO conversations (id, lead_id, owner_id, owner_name, archived, created_at, updated_at)
      SELECT lower(hex(randomblob(16))), l.id, l.owner_id, l.owner_name, COALESCE(l.archived, 0), l.created_at, l.updated_at
      FROM leads l
      WHERE NOT EXISTS (
        SELECT 1 FROM conversations c WHERE c.lead_id = l.id
      )
    `
  );

  await db.run(
    `
      UPDATE conversations
      SET owner_id = COALESCE(owner_id, (SELECT owner_id FROM leads WHERE leads.id = conversations.lead_id)),
          owner_name = COALESCE(owner_name, (SELECT owner_name FROM leads WHERE leads.id = conversations.lead_id)),
          archived = COALESCE(archived, (SELECT archived FROM leads WHERE leads.id = conversations.lead_id), 0),
          updated_at = COALESCE(updated_at, created_at, ?)
    `,
    [new Date().toISOString()]
  );
}

async function createIndexes(db) {
  await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_id_unique ON leads(id);");
  await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_external_key ON leads(external_key);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_leads_wa_id ON leads(wa_id);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_leads_last_message_at ON leads(last_message_at);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads(updated_at);");

  await db.exec("CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages(lead_id);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_messages_message_sid ON messages(message_sid);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_messages_provider_message_id ON messages(provider_message_id);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON messages(delivery_status);");
  await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_idempotency_key_unique ON messages(idempotency_key) WHERE idempotency_key IS NOT NULL;");

  await db.exec("CREATE INDEX IF NOT EXISTS idx_message_media_message_id ON message_media(message_id);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_message_media_lead_id ON message_media(lead_id);");

  await db.exec("CREATE INDEX IF NOT EXISTS idx_message_delivery_message_id ON message_delivery(message_id);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_message_delivery_status ON message_delivery(delivery_status);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_message_delivery_created_at ON message_delivery(created_at);");

  await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_lead_id ON conversations(lead_id);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_conversations_owner_id ON conversations(owner_id);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(archived);");

  await db.exec("CREATE INDEX IF NOT EXISTS idx_templates_is_active ON templates(is_active);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_templates_updated_at ON templates(updated_at);");

  await db.exec("CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_challenges(phone);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_otp_status ON otp_challenges(status);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_challenges(expires_at);");

  await db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_operator_id ON auth_sessions(operator_id);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_access_expires ON auth_sessions(access_expires_at);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_refresh_expires ON auth_sessions(refresh_expires_at);");

  await db.exec("CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON lead_events(lead_id);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_lead_events_event_type ON lead_events(event_type);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_lead_events_created_at ON lead_events(created_at);");

  await db.exec("CREATE INDEX IF NOT EXISTS idx_ai_runs_lead_id ON ai_analysis_runs(lead_id);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_ai_runs_created_at ON ai_analysis_runs(created_at);");
}

async function tableExists(db, tableName) {
  const row = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [tableName]);
  return Boolean(row);
}

async function isLegacyIncompatibleSchema(db) {
  const hasLeads = await tableExists(db, "leads");
  if (!hasLeads) return false;

  const leadsInfo = await db.all("PRAGMA table_info(leads)");
  if (!leadsInfo.length) return false;

  const pkColumn = leadsInfo.find((col) => col.pk === 1)?.name || "";
  const hasExternalKey = leadsInfo.some((col) => col.name === "external_key");
  return pkColumn !== "id" || !hasExternalKey;
}

function removeFileIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function backupAndRecreateDatabaseFile(dbFilePath) {
  const backupPath = `${dbFilePath}.legacy-backup-${Date.now()}`;
  if (fs.existsSync(dbFilePath)) {
    fs.copyFileSync(dbFilePath, backupPath);
  }
  removeFileIfExists(dbFilePath);
  removeFileIfExists(`${dbFilePath}-wal`);
  removeFileIfExists(`${dbFilePath}-shm`);
}

async function initDb(dbFilePath) {
  const dir = path.dirname(dbFilePath);
  fs.mkdirSync(dir, { recursive: true });

  let db = await open({
    filename: dbFilePath,
    driver: sqlite3.Database
  });

  await db.exec("PRAGMA journal_mode = WAL;");
  await db.exec("PRAGMA foreign_keys = ON;");

  if (await isLegacyIncompatibleSchema(db)) {
    await db.close();
    backupAndRecreateDatabaseFile(dbFilePath);

    db = await open({
      filename: dbFilePath,
      driver: sqlite3.Database
    });
    await db.exec("PRAGMA journal_mode = WAL;");
    await db.exec("PRAGMA foreign_keys = ON;");
  }

  await createTables(db);
  await ensureLegacyCompatibility(db);
  await backfillConversations(db);
  await createIndexes(db);

  return db;
}

module.exports = {
  initDb
};
