const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { toLegacyLeadStatus } = require('./statusMap');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function normalizeLeadPhone(rawPhone) {
    if (typeof rawPhone !== 'string') {
        return { error: "O campo 'phone' deve ser uma string valida." };
    }

    const digits = rawPhone.trim().replace(/^whatsapp:/i, '').replace(/\D/g, '');

    if (!digits) {
        return { error: "O campo 'phone' esta invalido." };
    }

    if (digits.length < 10 || digits.length > 15) {
        return { error: 'Telefone invalido. Use o padrao internacional E.164.' };
    }

    return { phone: `+${digits}` };
}

module.exports = async (req, res) => {
    const { name, phone } = req.body || {};
    const companyId = req.auth.companyId;

    if (!name || !phone) {
        return res.status(400).json({
            success: false,
            error: "Os campos 'name' e 'phone' sao obrigatorios."
        });
    }

    const trimmedName = name.toString().trim();
    const normalizedPhone = normalizeLeadPhone(phone);

    if (!trimmedName) {
        return res.status(400).json({
            success: false,
            error: "O campo 'name' nao pode ser vazio."
        });
    }

    if (normalizedPhone.error) {
        return res.status(400).json({
            success: false,
            error: normalizedPhone.error
        });
    }

    const leadId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
        const { data: existing, error: existingError } = await supabase
            .from('leads')
            .select('id')
            .eq('company_id', companyId)
            .eq('phone', normalizedPhone.phone)
            .limit(1);

        if (existingError) throw existingError;

        if (existing && existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Ja existe um lead com este telefone nesta empresa.'
            });
        }

        const payload = {
            id: leadId,
            company_id: companyId,
            phone: normalizedPhone.phone,
            name: trimmedName,
            status: 'possivel_cliente',
            last_conversation_summary: '',
            created_at: now,
            updated_at: now
        };

        const { data: inserted, error: insertError } = await supabase
            .from('leads')
            .insert([payload])
            .select('*')
            .limit(1);

        if (insertError) throw insertError;

        const lead = inserted[0];
        return res.status(201).json({
            success: true,
            leadId,
            lead: {
                ...lead,
                status: toLegacyLeadStatus(lead.status),
                last_message_preview: lead.last_conversation_summary || '',
                last_message_at: lead.updated_at || lead.created_at || null
            },
            message: 'Lead criado com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao criar lead:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
