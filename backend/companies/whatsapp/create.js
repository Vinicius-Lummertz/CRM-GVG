const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const {
    VALID_WHATSAPP_PROVIDERS,
    VALID_WHATSAPP_STATUSES,
    isValidUuid,
    normalizePhone,
    parseOptionalString,
    validateJsonObject
} = require('../utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { companyId } = req.params;
    const phoneNumber = normalizePhone(req.body.phone_number, 'phone_number');
    const provider = parseOptionalString(req.body.provider) || 'meta';
    const status = parseOptionalString(req.body.status) || 'disconnected';
    const apiConfig = validateJsonObject(req.body.api_config || {}, 'api_config');

    if (!isValidUuid(companyId)) {
        return res.status(400).json({ success: false, error: "Parametro 'companyId' deve ser um UUID valido." });
    }

    if (phoneNumber.error) return res.status(400).json({ success: false, error: phoneNumber.error });

    if (!VALID_WHATSAPP_PROVIDERS.includes(provider)) {
        return res.status(400).json({ success: false, error: `Provider invalido. Use: ${VALID_WHATSAPP_PROVIDERS.join(', ')}.` });
    }

    if (!VALID_WHATSAPP_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, error: `Status invalido. Use: ${VALID_WHATSAPP_STATUSES.join(', ')}.` });
    }

    if (apiConfig.error) return res.status(400).json({ success: false, error: apiConfig.error });

    try {
        console.log(`[CRM] Adicionando WhatsApp comercial ${phoneNumber.value} na empresa ${companyId}`);

        const { data: number, error } = await supabase
            .from('company_whatsapp_numbers')
            .insert([{
                id: crypto.randomUUID(),
                company_id: companyId,
                phone_number: phoneNumber.value,
                label: parseOptionalString(req.body.label),
                provider,
                status,
                api_config: apiConfig.value
            }])
            .select('*')
            .single();

        if (error) throw error;

        return res.status(201).json({
            success: true,
            whatsappNumber: number,
            message: "Numero comercial adicionado com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao adicionar numero comercial:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
