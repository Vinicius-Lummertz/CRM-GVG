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

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ONPENAI_API_KEY || "";
  const aiModel = String(process.env.GEMINI_MODEL || process.env.OPENAI_MODEL || "gemini-3.1-flash-lite-preview").trim();
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || "";
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || "";
  const twilioWhatsappFrom = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_PHONE_NUMBER || "";
  const twilioMessagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || "";
  const publicBaseUrl = String(process.env.PUBLIC_BASE_URL || "").trim();

  const supabaseProjectUrl = String(process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL || "").trim();
  const supabasePublishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();
  const supabaseSecretKey = String(process.env.SUPBASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();

  if (!supabaseProjectUrl || !supabaseSecretKey) {
    throw new Error("SUPABASE_URL (ou SUPABASE_PROJECT_URL) e SUPABASE_SECRET_KEY são obrigatórios.");
  }

  const config = {
    rootDir,
    workspace: {
      id: "default"
    },
    app: {
      port: parsePort(process.env.PORT),
      publicDir: path.join(rootDir, "public")
    },
    db: {
      supabaseUrl: supabaseProjectUrl,
      supabaseSecretKey
    },
    supabase: {
      projectUrl: supabaseProjectUrl,
      publishableKey: supabasePublishableKey,
      secretKey: supabaseSecretKey
    },
    ai: {
      apiKey,
      model: aiModel,
      hasLegacyTypoKey: Boolean(process.env.ONPENAI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY)
    },
    auth: {
      otpTtlMinutes: Number.parseInt(String(process.env.OTP_TTL_MINUTES || "5"), 10) || 5,
      otpMaxAttempts: Number.parseInt(String(process.env.OTP_MAX_ATTEMPTS || "5"), 10) || 5,
      accessTtlMinutes: Number.parseInt(String(process.env.AUTH_ACCESS_TTL_MINUTES || "30"), 10) || 30,
      refreshTtlMinutes: Number.parseInt(String(process.env.AUTH_REFRESH_TTL_MINUTES || "10080"), 10) || 10080,
      allowDebugOtp: String(process.env.ALLOW_DEBUG_OTP || "false").toLowerCase() === "true"
    },
    twilio: {
      accountSid: twilioAccountSid,
      authToken: twilioAuthToken,
      whatsappFrom: twilioWhatsappFrom,
      messagingServiceSid: twilioMessagingServiceSid,
      statusCallbackUrl: publicBaseUrl ? `${publicBaseUrl.replace(/\/$/, "")}/api/v1/providers/whatsapp/webhooks/status` : "",
      mediaHosts: ["api.twilio.com", "mms.twiliocdn.com"]
    }
  };

  return Object.freeze({
    ...config,
    workspace: Object.freeze(config.workspace),
    app: Object.freeze(config.app),
    db: Object.freeze(config.db),
    supabase: Object.freeze(config.supabase),
    ai: Object.freeze(config.ai),
    auth: Object.freeze(config.auth),
    twilio: Object.freeze(config.twilio)
  });
}

module.exports = {
  loadConfig
};
