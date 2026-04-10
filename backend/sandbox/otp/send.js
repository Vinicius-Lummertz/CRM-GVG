const crypto = require('crypto');
const { getTwilioClient, mapTwilioSandboxError, normalizeToWhatsAppPhone } = require('../utils');

module.exports = async (req, res) => {
    const config = req.sandboxConfig;
    const { phone } = req.body || {};

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

    const challengeId = crypto.randomUUID();
    const sandboxOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const client = getTwilioClient(config);

    try {
        await client.messages.create({
            contentSid: config.contentSid,
            contentVariables: JSON.stringify({ "1": "Sandbox", "2": sandboxOtpCode }),
            from: config.sandboxWhatsAppNumber,
            to: normalizedPhone.whatsapp
        });

        return res.status(200).json({
            success: true,
            challengeId,
            message: "Codigo enviado em modo sandbox!",
            sandboxOtpCode
        });
    } catch (error) {
        const mappedError = mapTwilioSandboxError(error, config);
        return res.status(mappedError.status).json(mappedError.body);
    }
};
