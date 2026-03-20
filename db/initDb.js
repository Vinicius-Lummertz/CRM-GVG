"use strict";

const { createClient } = require("@supabase/supabase-js");

function requireEnv(name, value) {
  const parsed = String(value || "").trim();
  if (!parsed) throw new Error(`${name} é obrigatório.`);
  return parsed;
}

async function initDb({ supabaseUrl, supabaseSecretKey }) {
  const url = requireEnv("SUPABASE_URL", supabaseUrl);
  const secret = requireEnv("SUPABASE_SECRET_KEY", supabaseSecretKey);

  const client = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return client;
}

module.exports = {
  initDb
};
