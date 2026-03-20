"use strict";

const { Pool } = require("pg");

function replacePlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

function normalizeParams(params) {
  if (Array.isArray(params)) return params;
  if (params === undefined || params === null) return [];
  return [params];
}

function createDbClient(pool) {
  return {
    async get(sql, params = []) {
      const result = await pool.query(replacePlaceholders(sql), normalizeParams(params));
      return result.rows[0] || null;
    },

    async all(sql, params = []) {
      const result = await pool.query(replacePlaceholders(sql), normalizeParams(params));
      return result.rows;
    },

    async run(sql, params = []) {
      const result = await pool.query(replacePlaceholders(sql), normalizeParams(params));
      return {
        changes: result.rowCount || 0
      };
    },

    async exec(sql) {
      await pool.query(sql);
    },

    async close() {
      await pool.end();
    }
  };
}

async function ensureSchema(db) {
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
      priority_score DOUBLE PRECISION DEFAULT 0,
      temperature TEXT DEFAULT 'cold',
      owner_id TEXT,
      owner_name TEXT,
      ai_summary TEXT,
      ai_last_reason TEXT,
      ai_last_confidence DOUBLE PRECISION DEFAULT 0,
      last_message TEXT,
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

    CREATE TABLE IF NOT EXISTS message_delivery (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      delivery_status TEXT NOT NULL,
      provider_payload_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id)
    );

    CREATE TABLE IF NOT EXISTS conversation_state (
      id TEXT PRIMARY KEY,
      lead_id TEXT UNIQUE NOT NULL,
      current_status TEXT NOT NULL DEFAULT 'lead',
      current_stage_label TEXT,
      ai_summary TEXT,
      ai_short_summary TEXT,
      ai_last_reason TEXT,
      ai_last_confidence DOUBLE PRECISION DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS lead_events (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      old_status TEXT,
      new_status TEXT,
      title TEXT NOT NULL,
      description TEXT,
      confidence DOUBLE PRECISION DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'ai',
      created_at TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );

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
      confidence DOUBLE PRECISION DEFAULT 0,
      attention_required INTEGER DEFAULT 0,
      request_payload_json TEXT,
      response_payload_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );

    CREATE TABLE IF NOT EXISTS operators (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'operator',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

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

  await db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_id_unique ON leads(id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_external_key ON leads(external_key);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
    CREATE INDEX IF NOT EXISTS idx_leads_wa_id ON leads(wa_id);
    CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id);
    CREATE INDEX IF NOT EXISTS idx_leads_last_message_at ON leads(last_message_at);
    CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads(updated_at);

    CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages(lead_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_message_sid ON messages(message_sid);
    CREATE INDEX IF NOT EXISTS idx_messages_provider_message_id ON messages(provider_message_id);
    CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
    CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON messages(delivery_status);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_idempotency_key_unique ON messages(idempotency_key);

    CREATE INDEX IF NOT EXISTS idx_message_media_message_id ON message_media(message_id);
    CREATE INDEX IF NOT EXISTS idx_message_media_lead_id ON message_media(lead_id);

    CREATE INDEX IF NOT EXISTS idx_message_delivery_message_id ON message_delivery(message_id);
    CREATE INDEX IF NOT EXISTS idx_message_delivery_status ON message_delivery(delivery_status);
    CREATE INDEX IF NOT EXISTS idx_message_delivery_created_at ON message_delivery(created_at);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_lead_id ON conversations(lead_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_owner_id ON conversations(owner_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
    CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(archived);

    CREATE INDEX IF NOT EXISTS idx_templates_is_active ON templates(is_active);
    CREATE INDEX IF NOT EXISTS idx_templates_updated_at ON templates(updated_at);

    CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_challenges(phone);
    CREATE INDEX IF NOT EXISTS idx_otp_status ON otp_challenges(status);
    CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_challenges(expires_at);

    CREATE INDEX IF NOT EXISTS idx_sessions_operator_id ON auth_sessions(operator_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_access_expires ON auth_sessions(access_expires_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_refresh_expires ON auth_sessions(refresh_expires_at);

    CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON lead_events(lead_id);
    CREATE INDEX IF NOT EXISTS idx_lead_events_event_type ON lead_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_lead_events_created_at ON lead_events(created_at);

    CREATE INDEX IF NOT EXISTS idx_ai_runs_lead_id ON ai_analysis_runs(lead_id);
    CREATE INDEX IF NOT EXISTS idx_ai_runs_created_at ON ai_analysis_runs(created_at);
  `);
}

async function initDb(connectionString) {
  const preferredFamily = Number.parseInt(String(process.env.PG_FAMILY || "4"), 10);
  const pool = new Pool({
    connectionString,
    family: Number.isNaN(preferredFamily) ? 4 : preferredFamily,
    ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : undefined
  });

  const db = createDbClient(pool);
  await ensureSchema(db);
  return db;
}

module.exports = {
  initDb
};
