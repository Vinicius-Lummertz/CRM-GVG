const { getTwilioClient, mapTwilioSandboxError, normalizeToWhatsAppPhone, parseContentVariables } = require('../utils');

module.exports = async (req, res) => {
    const config = req.sandboxConfig;
    const { phone, contentSid, contentVariables } = req.body || {};

    if (!phone) {
        return res.status(400).json({
            success: false,
            error: "O campo 'phone' e obrigatorio."
        });
    }

    const normalizedPhone = req.sandboxPhone || normalizeToWhatsAppPhone(phone);
    if (!normalizedPhone.valid) {
        return res.status(400).json({
            success: false,
            error: normalizedPhone.error
        });
    }

    const effectiveContentSid = (contentSid || config.contentSid || '').toString().trim();
    if (!effectiveContentSid) {
        return res.status(500).json({
            success: false,
            error: "Nao foi possivel determinar o contentSid do sandbox."
        });
    }

    const parsedVariables = parseContentVariables(contentVariables);
    if (!parsedVariables) {
        return res.status(400).json({
            success: false,
            error: "Campo 'contentVariables' invalido. Envie um objeto JSON valido."
        });
    }

    const client = getTwilioClient(config);

    try {
        const message = await client.messages.create({
            contentSid: effectiveContentSid,
            contentVariables: JSON.stringify(parsedVariables),
            from: config.sandboxWhatsAppNumber,
            to: normalizedPhone.whatsapp
        });

        return res.status(200).json({
            success: true,
            message: "Template enviado com sucesso em modo sandbox.",
            providerMessageId: message.sid
        });
    } catch (error) {
        const mappedError = mapTwilioSandboxError(error, config);
        return res.status(mappedError.status).json(mappedError.body);
    }
};
