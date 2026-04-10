const { normalizeToWhatsAppPhone } = require('../utils');

module.exports = async (req, res) => {
    const { phone, code } = req.body || {};

    if (!phone || !code) {
        return res.status(400).json({
            success: false,
            error: "Os campos telefone/numero e codigo sao obrigatorios."
        });
    }

    const normalizedPhone = req.sandboxPhone || normalizeToWhatsAppPhone(phone);
    if (!normalizedPhone.valid) {
        return res.status(400).json({
            success: false,
            error: normalizedPhone.error
        });
    }

    return res.status(200).json({
        success: true,
        message: "Numero verificado com sucesso!"
    });
};
