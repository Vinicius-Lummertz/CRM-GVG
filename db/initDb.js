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
    CREATE TABLE IF NOT EXISTS conversation_state (
      id TEXT PRIMARY KEY,
      lead_id TEXT UNIQUE NOT NULL,
      current_status TEXT NOT NULL DEFAULT 'lead',
      current_stage_label TEXT,
      ai_summary TEXT,
      ai_short_summary TEXT,
      ai_last_reason TEXT,
      ai_last_confidence REAL DEFAULT 0,
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

  await db.run("UPDATE leads SET external_key = COALESCE(NULLIF(external_key, ''), id);");
  await db.run("UPDATE leads SET id = COALESCE(NULLIF(id, ''), external_key);");
  await db.run("UPDATE leads SET id = COALESCE(NULLIF(id, ''), key);").catch(() => {});
  await db.run("UPDATE leads SET source = COALESCE(NULLIF(source, ''), 'whatsapp');");
  await db.run("UPDATE leads SET status = COALESCE(NULLIF(status, ''), 'lead');");
  await db.run("UPDATE leads SET temperature = COALESCE(NULLIF(temperature, ''), 'cold');");
  await db.run("UPDATE leads SET last_message_preview = COALESCE(NULLIF(last_message_preview, ''), last_message, 'Sem mensagem');").catch(() => {});
  await db.run("UPDATE leads SET created_at = COALESCE(created_at, ?);", [new Date().toISOString()]);
  await db.run("UPDATE leads SET updated_at = COALESCE(updated_at, created_at, ?);", [new Date().toISOString()]);
  await db.run("UPDATE leads SET last_message = COALESCE(NULLIF(last_message, ''), last_message_preview, 'Sem mensagem');").catch(() => {});
  await db.run("UPDATE messages SET created_at = COALESCE(created_at, timestamp, ?);", [new Date().toISOString()]).catch(() => {});
}

async function createIndexes(db) {
  await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_id_unique ON leads(id);");
  await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_external_key ON leads(external_key);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_leads_wa_id ON leads(wa_id);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_leads_last_message_at ON leads(last_message_at);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads(updated_at);");

  await db.exec("CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages(lead_id);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_messages_message_sid ON messages(message_sid);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);");

  await db.exec("CREATE INDEX IF NOT EXISTS idx_message_media_message_id ON message_media(message_id);");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_message_media_lead_id ON message_media(lead_id);");

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
  await createIndexes(db);

  return db;
}

module.exports = {
  initDb
};
