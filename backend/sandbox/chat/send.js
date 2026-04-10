const crypto = require('crypto');
const { getTwilioClient, mapTwilioSandboxError, normalizeToWhatsAppPhone } = require('../utils');

module.exports = async (req, res) => {
    const config = req.sandboxConfig;
    const { phone, text, lead_id } = req.body || {};

    if (!phone || !text || !lead_id) {
        return res.status(400).json({
            success: false,
            error: "Os campos 'phone', 'text' e 'lead_id' sao obrigatorios."
        });
    }

    const normalizedPhone = req.sandboxPhone || normalizeToWhatsAppPhone(phone);
    if (!normalizedPhone.valid) {
        return res.status(400).json({
            success: false,
            error: normalizedPhone.error
        });
    }

    const chatMessageId = crypto.randomUUID();
    const client = getTwilioClient(config);

    try {
        await client.messages.create({
            body: text,
            from: config.sandboxWhatsAppNumber,
            to: normalizedPhone.whatsapp
        });

        return res.status(200).json({
            success: true,
            chatMessageId,
            message: "Mensagem enviada com sucesso!"
        });
    } catch (error) {
        const mappedError = mapTwilioSandboxError(error, config, { includeTemplateFallback: true });
        return res.status(mappedError.status).json(mappedError.body);
    }
};
