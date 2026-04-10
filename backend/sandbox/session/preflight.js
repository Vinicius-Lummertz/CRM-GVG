const { getJoinInstruction, isPhoneAllowed, normalizeToWhatsAppPhone } = require('../utils');

module.exports = async (req, res) => {
    const config = req.sandboxConfig;
    const { phone } = req.body || {};
    const warnings = [];
    let target = null;

    if (typeof phone !== 'undefined') {
        const normalized = normalizeToWhatsAppPhone(phone);
        if (!normalized.valid) {
            return res.status(400).json({
                success: false,
                error: normalized.error
            });
        }

        target = normalized.e164;

        if (!isPhoneAllowed(normalized.e164, config)) {
            warnings.push(`Numero ${normalized.e164} nao esta na allowlist SANDBOX_ALLOWED_TO_NUMBERS.`);
        }
    }

    const ready = warnings.length === 0;

    return res.status(200).json({
        success: true,
        ready,
        ...(warnings.length > 0 ? { warnings } : {}),
        sandbox: {
            whatsappNumber: config.sandboxE164Number,
            joinCode: config.joinCode,
            joinInstruction: getJoinInstruction(config),
            contentSid: config.contentSid,
            sessionHint: "A adesao ao sandbox expira em ate 3 dias sem nova adesao."
        },
        ...(target ? { targetPhone: target } : {})
    });
};
