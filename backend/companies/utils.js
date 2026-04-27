const VALID_MEMBER_ROLES = ['owner', 'admin', 'agent', 'viewer'];
const VALID_MEMBER_STATUSES = ['active', 'inactive'];
const VALID_WHATSAPP_PROVIDERS = ['meta', 'evolution', 'zapi'];
const VALID_WHATSAPP_STATUSES = ['connected', 'disconnected', 'pending'];
const VALID_INVITE_STATUSES = ['pending', 'accepted', 'expired'];

function isValidUuid(value) {
    return typeof value === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseOptionalString(value) {
    if (value === undefined || value === null) return null;

    const text = value.toString().trim();
    return text || null;
}

function parseRequiredString(value, fieldName) {
    const text = parseOptionalString(value);

    if (!text) {
        return { error: `O campo '${fieldName}' e obrigatorio.` };
    }

    return { value: text };
}

function normalizePhone(rawPhone, fieldName = 'phone') {
    if (typeof rawPhone !== 'string') {
        return { error: `O campo '${fieldName}' deve ser uma string valida.` };
    }

    const cleanedInput = rawPhone.trim().replace(/^whatsapp:/i, '');
    const digits = cleanedInput.replace(/\D/g, '');

    if (!digits) {
        return { error: `O campo '${fieldName}' esta invalido.` };
    }

    if (!digits.startsWith('55')) {
        return { error: `O campo '${fieldName}' deve incluir o codigo do pais 55.` };
    }

    if (digits.length !== 12 && digits.length !== 13) {
        return { error: `O campo '${fieldName}' deve estar no formato brasileiro com 55 + DDD + numero.` };
    }

    const ddd = digits.slice(2, 4);
    if (!/^[1-9][0-9]$/.test(ddd)) {
        return { error: `O campo '${fieldName}' possui DDD brasileiro invalido.` };
    }

    return { value: `+${digits}` };
}

function validateJsonObject(value, fieldName) {
    if (value === undefined) return { value: undefined };

    if (value === null || Array.isArray(value) || typeof value !== 'object') {
        return { error: `O campo '${fieldName}' deve ser um objeto JSON.` };
    }

    return { value };
}

module.exports = {
    VALID_INVITE_STATUSES,
    VALID_MEMBER_ROLES,
    VALID_MEMBER_STATUSES,
    VALID_WHATSAPP_PROVIDERS,
    VALID_WHATSAPP_STATUSES,
    isValidUuid,
    normalizePhone,
    parseOptionalString,
    parseRequiredString,
    validateJsonObject
};
