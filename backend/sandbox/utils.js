const twilio = require('twilio');

const DEFAULT_SANDBOX_WHATSAPP_NUMBER = 'whatsapp:+14155238886';
const DEFAULT_SANDBOX_JOIN_CODE = 'spring-went';
const DEFAULT_SANDBOX_CONTENT_SID = 'HXb5b62575e6e4ff6129ad7c8efe1f983e';

function toBool(value) {
    const normalized = (value || '').toString().trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function normalizeToWhatsAppPhone(rawPhone) {
    if (typeof rawPhone !== 'string') {
        return { valid: false, error: "O campo 'phone' deve ser uma string." };
    }

    const cleaned = rawPhone.trim().replace(/^whatsapp:/i, '');
    const digits = cleaned.replace(/\D/g, '');

    if (!digits) {
        return { valid: false, error: "O campo 'phone' e obrigatorio e precisa conter um numero valido." };
    }

    if (digits.length < 8 || digits.length > 15) {
        return { valid: false, error: "Telefone invalido. Use um numero no padrao internacional (E.164)." };
    }

    const e164 = `+${digits}`;
    return {
        valid: true,
        e164,
        whatsapp: `whatsapp:${e164}`
    };
}

function parseAllowedNumbers(value) {
    const raw = (value || '').toString();

    return raw
        .split(/[,;\n]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => normalizeToWhatsAppPhone(entry))
        .filter((entry) => entry.valid)
        .map((entry) => entry.e164);
}

function getSandboxConfig() {
    const sandboxNumber = normalizeToWhatsAppPhone(
        process.env.TWILIO_SANDBOX_WHATSAPP_NUMBER || DEFAULT_SANDBOX_WHATSAPP_NUMBER
    );

    return {
        enabled: toBool(process.env.SANDBOX_ENABLED),
        apiKey: (process.env.SANDBOX_API_KEY || '').trim(),
        allowedNumbers: parseAllowedNumbers(process.env.SANDBOX_ALLOWED_TO_NUMBERS),
        sandboxWhatsAppNumber: sandboxNumber.valid ? sandboxNumber.whatsapp : DEFAULT_SANDBOX_WHATSAPP_NUMBER,
        sandboxE164Number: sandboxNumber.valid ? sandboxNumber.e164 : '+14155238886',
        joinCode: (process.env.TWILIO_SANDBOX_JOIN_CODE || DEFAULT_SANDBOX_JOIN_CODE).trim(),
        contentSid: (process.env.TWILIO_SANDBOX_CONTENT_SID || DEFAULT_SANDBOX_CONTENT_SID).trim(),
        accountSid: (process.env.TWILIO_ACCOUNT_SID || '').trim(),
        authToken: (process.env.TWILIO_ACCOUNT_AUTH_TOKEN || '').trim()
    };
}

function getJoinInstruction(config) {
    return `Envie "join ${config.joinCode}" para ${config.sandboxE164Number} no WhatsApp para entrar no sandbox.`;
}

function isPhoneAllowed(e164, config) {
    return config.allowedNumbers.includes(e164);
}

function getTwilioClient(config) {
    return twilio(config.accountSid, config.authToken);
}

function mapTwilioSandboxError(error, config, options = {}) {
    const code = Number(error && error.code);
    const joinInstruction = getJoinInstruction(config);

    if (code === 63015) {
        return {
            status: 403,
            body: {
                success: false,
                error: `Numero nao entrou no Sandbox da Twilio. ${joinInstruction}`,
                twilioCode: code
            }
        };
    }

    if (code === 63016) {
        return {
            status: 400,
            body: {
                success: false,
                error: "Nao foi possivel enviar mensagem livre: janela de 24h fechada. Use /api/sandbox/templates/send para reabrir.",
                twilioCode: code,
                ...(options.includeTemplateFallback ? { fallbackEndpoint: '/api/sandbox/templates/send' } : {})
            }
        };
    }

    return {
        status: 500,
        body: {
            success: false,
            error: error && error.message ? error.message : "Falha ao enviar mensagem pelo sandbox da Twilio."
        }
    };
}

function parseContentVariables(rawValue) {
    if (rawValue === undefined || rawValue === null) {
        return { "1": "Sandbox", "2": "123456" };
    }

    if (typeof rawValue === 'object' && !Array.isArray(rawValue)) {
        return rawValue;
    }

    if (typeof rawValue === 'string') {
        try {
            const parsed = JSON.parse(rawValue);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            }
        } catch (error) {
            return null;
        }
    }

    return null;
}

module.exports = {
    DEFAULT_SANDBOX_CONTENT_SID,
    getSandboxConfig,
    getJoinInstruction,
    getTwilioClient,
    isPhoneAllowed,
    mapTwilioSandboxError,
    normalizeToWhatsAppPhone,
    parseContentVariables
};
