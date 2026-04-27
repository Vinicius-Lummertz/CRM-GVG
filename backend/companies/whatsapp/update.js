const { createClient } = require('@supabase/supabase-js');
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
    const { companyId, numberId } = req.params;
    const payload = {};

    if (!isValidUuid(companyId) || !isValidUuid(numberId)) {
        return res.status(400).json({ success: false, error: "Parametros 'companyId' e 'numberId' devem ser UUIDs validos." });
    }

    if (req.body.phone_number !== undefined) {
        const phoneNumber = normalizePhone(req.body.phone_number, 'phone_number');
        if (phoneNumber.error) return res.status(400).json({ success: false, error: phoneNumber.error });
        payload.phone_number = phoneNumber.value;
    }

    if (req.body.label !== undefined) payload.label = parseOptionalString(req.body.label);

    if (req.body.provider !== undefined) {
        const provider = parseOptionalString(req.body.provider);
        if (!VALID_WHATSAPP_PROVIDERS.includes(provider)) {
            return res.status(400).json({ success: false, error: `Provider invalido. Use: ${VALID_WHATSAPP_PROVIDERS.join(', ')}.` });
        }
        payload.provider = provider;
    }

    if (req.body.status !== undefined) {
        const status = parseOptionalString(req.body.status);
        if (!VALID_WHATSAPP_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, error: `Status invalido. Use: ${VALID_WHATSAPP_STATUSES.join(', ')}.` });
        }
        payload.status = status;
    }

    if (req.body.api_config !== undefined) {
        const apiConfig = validateJsonObject(req.body.api_config, 'api_config');
        if (apiConfig.error) return res.status(400).json({ success: false, error: apiConfig.error });
        payload.api_config = apiConfig.value;
    }

    if (Object.keys(payload).length === 0) {
        return res.status(400).json({ success: false, error: "Informe ao menos um campo para atualizar." });
    }

    try {
        console.log(`[CRM] Atualizando numero comercial ${numberId}`);

        const { data: number, error } = await supabase
            .from('company_whatsapp_numbers')
            .update(payload)
            .eq('id', numberId)
            .eq('company_id', companyId)
            .select('*')
            .maybeSingle();

        if (error) throw error;

        if (!number) {
            return res.status(404).json({ success: false, error: "Numero comercial nao encontrado." });
        }

        return res.status(200).json({
            success: true,
            whatsappNumber: number,
            message: "Numero comercial atualizado com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao atualizar numero comercial:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
