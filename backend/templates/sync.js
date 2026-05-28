const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { isValidUuid } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_ACCOUNT_AUTH_TOKEN);

function pickTemplateBody(types) {
    if (!types || typeof types !== 'object') return '';

    const preferredKeys = [
        'twilio/text',
        'whatsapp/text',
        'whatsapp/card',
        'twilio/call-to-action',
        'twilio/quick-reply'
    ];

    for (const key of preferredKeys) {
        const payload = types[key];
        if (payload && typeof payload.body === 'string' && payload.body.trim()) {
            return payload.body.trim();
        }
    }

    for (const value of Object.values(types)) {
        if (value && typeof value === 'object' && typeof value.body === 'string' && value.body.trim()) {
            return value.body.trim();
        }
    }

    return '';
}

function normalizeVariablesJson(variables) {
    if (!variables || typeof variables !== 'object' || Array.isArray(variables)) {
        return {};
    }
    return variables;
}

module.exports = async (req, res) => {
    const companyId = req.body.company_id ? req.body.company_id.toString().trim() : '';

    if (!companyId || !isValidUuid(companyId)) {
        return res.status(400).json({
            success: false,
            error: "O campo 'company_id' e obrigatorio e deve ser um UUID valido."
        });
    }

    try {
        console.log(`[CRM] Sincronizando templates Twilio | company_id=${companyId}`);

        const remoteTemplates = await client.content.v1.contents.list({ limit: 1000 });
        const now = new Date().toISOString();

        const rows = (remoteTemplates || [])
            .filter((item) => item && item.sid)
            .map((item) => {
                const body = pickTemplateBody(item.types);
                return {
                    id: crypto.randomUUID(),
                    company_id: companyId,
                    name: (item.friendlyName || item.sid || '').toString().trim(),
                    body: body || '[sem corpo mapeado]',
                    language: (item.language || 'pt_BR').toString(),
                    category: 'utility',
                    variables_json: normalizeVariablesJson(item.variables),
                    is_active: 1,
                    created_by_operator_id: null,
                    content_sid: item.sid.toString(),
                    created_at: now,
                    updated_at: now
                };
            });

        if (rows.length === 0) {
            return res.status(200).json({
                success: true,
                synced: 0,
                message: 'Nenhum template encontrado na Twilio para sincronizar.'
            });
        }

        const { error } = await supabase
            .from('templates')
            .upsert(rows, { onConflict: 'company_id,content_sid' });

        if (error) throw error;

        return res.status(200).json({
            success: true,
            synced: rows.length,
            message: 'Templates sincronizados com sucesso.'
        });
    } catch (error) {
        console.error('Erro ao sincronizar templates da Twilio:', error);
        return res.status(500).json({ success: false, error: error.message || 'Falha ao sincronizar templates.' });
    }
};
