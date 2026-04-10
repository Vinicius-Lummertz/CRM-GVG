const { getSandboxConfig, isPhoneAllowed, normalizeToWhatsAppPhone } = require('./utils');

module.exports = (req, res, next) => {
    const config = getSandboxConfig();

    if (!config.enabled) {
        return res.status(403).json({
            success: false,
            error: "Sandbox desativado. Defina SANDBOX_ENABLED=1 para usar os endpoints /api/sandbox."
        });
    }

    if (!config.apiKey) {
        return res.status(500).json({
            success: false,
            error: "Configuracao invalida: SANDBOX_API_KEY nao foi definida."
        });
    }

    const providedKey = (req.headers['x-sandbox-key'] || '').toString().trim();
    if (!providedKey || providedKey !== config.apiKey) {
        return res.status(401).json({
            success: false,
            error: "Acesso negado ao sandbox. Informe o header x-sandbox-key valido."
        });
    }

    if (!config.accountSid || !config.authToken) {
        return res.status(500).json({
            success: false,
            error: "Configuracao invalida: TWILIO_ACCOUNT_SID/TWILIO_ACCOUNT_AUTH_TOKEN nao definidos."
        });
    }

    if (!config.allowedNumbers || config.allowedNumbers.length === 0) {
        return res.status(500).json({
            success: false,
            error: "Configuracao invalida: SANDBOX_ALLOWED_TO_NUMBERS precisa ter ao menos um numero."
        });
    }

    // Validacao opcional de telefone por request (quando houver payload com phone).
    if (req.body && typeof req.body.phone !== 'undefined') {
        const normalized = normalizeToWhatsAppPhone(req.body.phone);

        if (!normalized.valid) {
            return res.status(400).json({
                success: false,
                error: normalized.error
            });
        }

        if (!isPhoneAllowed(normalized.e164, config)) {
            return res.status(403).json({
                success: false,
                error: `Numero ${normalized.e164} nao esta permitido no sandbox (SANDBOX_ALLOWED_TO_NUMBERS).`
            });
        }

        req.sandboxPhone = normalized;
    }

    req.sandboxConfig = config;
    next();
};
