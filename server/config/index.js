"use strict";

const fs = require("fs");
const path = require("path");

function loadEnvFromFile(rootDir) {
  const envPath = path.join(rootDir, ".env");
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

function parsePort(rawPort) {
  const parsed = Number.parseInt(String(rawPort || "3000"), 10);
  if (Number.isNaN(parsed) || parsed <= 0) return 3000;
  return parsed;
}

function loadConfig({ rootDir }) {
  loadEnvFromFile(rootDir);

  const aiApiKey = process.env.GEMINI_API_KEY || process.env.ONPENAI_API_KEY || "";
  const aiModel = String(process.env.GEMINI_MODEL || process.env.OPENAI_MODEL || "gemini-3.1-flash-lite-preview").trim();
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || "";
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || "";

  const config = {
    rootDir,
    app: {
      port: parsePort(process.env.PORT),
      publicDir: path.join(rootDir, "public")
    },
    db: {
      filePath: path.join(rootDir, "data", "leads.sqlite")
    },
    ai: {
      aiApiKey,
      model: aiModel,
      hasLegacyTypoKey: Boolean(process.env.ONPENAI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY)
    },
    twilio: {
      accountSid: twilioAccountSid,
      authToken: twilioAuthToken,
      mediaHosts: ["api.twilio.com", "mms.twiliocdn.com"]
    }
  };

  return Object.freeze({
    ...config,
    app: Object.freeze(config.app),
    db: Object.freeze(config.db),
    ai: Object.freeze(config.ai),
    twilio: Object.freeze(config.twilio)
  });
}

module.exports = {
  loadConfig
};
