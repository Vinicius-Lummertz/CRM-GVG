const MAX_TEXT_LENGTH = 4096;
const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LIMIT = 100;
const WINDOW_HOURS = 24;

function normalizeToWhatsAppPhone(rawPhone) {
    if (typeof rawPhone !== 'string') {
        return { valid: false, error: "O campo 'phone' deve ser uma string." };
    }

    const cleaned = rawPhone.trim().replace(/^whatsapp:/i, '');
    const digits = cleaned.replace(/\D/g, '');

    if (!digits) {
        return { valid: false, error: "Telefone invalido." };
    }

    if (digits.length < 8 || digits.length > 15) {
        return { valid: false, error: "Telefone invalido. Use o padrao internacional E.164." };
    }

    const e164 = `+${digits}`;
    return {
        valid: true,
        e164,
        whatsapp: `whatsapp:${e164}`
    };
}

function resolveLeadPhone(lead, fallbackPhone) {
    const candidates = [
        lead && lead.whatsapp_from,
        lead && lead.external_key,
        lead && lead.phone,
        fallbackPhone
    ].filter(Boolean);

    for (const candidate of candidates) {
        const normalized = normalizeToWhatsAppPhone(candidate);
        if (normalized.valid) return normalized;
    }

    return { valid: false, error: "Nao foi possivel determinar o telefone do lead." };
}

function normalizeText(text) {
    if (typeof text !== 'string') {
        return { valid: false, error: "O campo 'text' deve ser uma string." };
    }

    const normalized = text.trim();
    if (!normalized) {
        return { valid: false, error: "O campo 'text' nao pode ser vazio." };
    }

    if (normalized.length > MAX_TEXT_LENGTH) {
        return {
            valid: false,
            error: `Mensagem muito longa. Limite de ${MAX_TEXT_LENGTH} caracteres.`
        };
    }

    return { valid: true, text: normalized };
}

function getPreview(body) {
    return (body || '').substring(0, 50);
}

function buildConversationWindow(lead, referenceDate = new Date()) {
    const lastInboundAt = lead && lead.last_inbound_at ? new Date(lead.last_inbound_at) : null;

    if (!lastInboundAt || Number.isNaN(lastInboundAt.getTime())) {
        return {
            is_open: false,
            opened_at: null,
            expires_at: null,
            remaining_seconds: 0
        };
    }

    const expiresAt = new Date(lastInboundAt.getTime() + WINDOW_HOURS * 60 * 60 * 1000);
    const remainingMs = expiresAt.getTime() - referenceDate.getTime();

    return {
        is_open: remainingMs > 0,
        opened_at: lastInboundAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        remaining_seconds: Math.max(0, Math.floor(remainingMs / 1000))
    };
}

function parsePositiveLimit(rawLimit) {
    const parsed = Number.parseInt(rawLimit, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_MESSAGE_LIMIT;
    return Math.min(parsed, MAX_MESSAGE_LIMIT);
}

function parseContentVariables(rawValue) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        return {};
    }

    let parsed = rawValue;
    if (typeof rawValue === 'string') {
        try {
            parsed = JSON.parse(rawValue);
        } catch (error) {
            return null;
        }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
    }

    return Object.entries(parsed).reduce((acc, [key, value]) => {
        acc[String(key)] = value === undefined || value === null ? '' : String(value);
        return acc;
    }, {});
}

function getTemplatePlaceholders(body) {
    const placeholders = new Set();
    const regex = /{{\s*(\d+)\s*}}/g;
    let match;

    while ((match = regex.exec(body || '')) !== null) {
        placeholders.add(match[1]);
    }

    return Array.from(placeholders);
}

function validateTemplateVariables(templateBody, variables) {
    const missing = getTemplatePlaceholders(templateBody).filter((key) => {
        return variables[key] === undefined || variables[key] === null || variables[key] === '';
    });

    if (missing.length === 0) {
        return { valid: true };
    }

    return {
        valid: false,
        error: `Variaveis obrigatorias ausentes: ${missing.join(', ')}.`
    };
}

function renderTemplateBody(templateBody, variables) {
    return (templateBody || '').replace(/{{\s*(\d+)\s*}}/g, (match, key) => {
        return variables[key] !== undefined ? variables[key] : match;
    });
}

function mapTwilioChatError(error) {
    const code = Number(error && error.code);

    if (code === 63016) {
        return {
            status: 400,
            body: {
                success: false,
                error: "WINDOW_CLOSED",
                message: "Janela de 24h fechada. Use um template aprovado para iniciar ou retomar a conversa.",
                twilioCode: code,
                fallbackEndpoint: "/api/v2/chat/send-template",
                templatesEndpoint: "/api/v2/templates"
            }
        };
    }

    return {
        status: 500,
        body: {
            success: false,
            error: error && error.message ? error.message : "Falha ao enviar mensagem pelo Twilio."
        }
    };
}

module.exports = {
    MAX_TEXT_LENGTH,
    buildConversationWindow,
    getPreview,
    mapTwilioChatError,
    normalizeText,
    normalizeToWhatsAppPhone,
    parseContentVariables,
    parsePositiveLimit,
    renderTemplateBody,
    resolveLeadPhone,
    validateTemplateVariables
};
