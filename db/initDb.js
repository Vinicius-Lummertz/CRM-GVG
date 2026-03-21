"use strict";

const { createClient } = require("@supabase/supabase-js");

const REQUIRED_TABLES = [
  "leads",
  "messages",
  "message_media",
  "message_delivery",
  "conversation_state",
  "conversations",
  "lead_events",
  "ai_analysis_runs",
  "operators",
  "templates",
  "otp_challenges",
  "auth_sessions"
];

function requireEnv(name, value) {
  const parsed = String(value || "").trim();
  if (!parsed) throw new Error(`${name} é obrigatório.`);
  return parsed;
}

async function validateSchema(client) {
  for (const tableName of REQUIRED_TABLES) {
    const { error } = await client.from(tableName).select("id", { head: true, count: "exact" }).limit(1);
    if (!error) continue;

    if (String(error.message || "").includes("schema cache")) {
      throw new Error(
        `Tabela ausente no Supabase: public.${tableName}. Execute db/schema.sql no SQL Editor do Supabase e faça redeploy.`
      );
    }

    throw error;
  }
}

async function initDb({ supabaseUrl, supabaseSecretKey }) {
  const url = requireEnv("SUPABASE_URL", supabaseUrl);
  const secret = requireEnv("SUPABASE_SECRET_KEY", supabaseSecretKey);

  const client = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  await validateSchema(client);
  return client;
}

module.exports = {
  initDb
};
