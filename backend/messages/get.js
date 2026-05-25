const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function normalizePhone(rawPhone) {
    if (typeof rawPhone !== 'string') return null;
    const digits = rawPhone.trim().replace(/^whatsapp:/i, '').replace(/\D/g, '');
    if (!digits || digits.length < 10 || digits.length > 15) return null;
    return `+${digits}`;
}

function buildCompanyPhoneCandidates(rawPhone) {
    const normalized = normalizePhone(rawPhone);
    if (!normalized) return [];

    const digits = normalized.replace('+', '');
    const candidates = new Set([normalized, digits, `whatsapp:${normalized}`]);
    return Array.from(candidates);
}

module.exports = async (req, res) => {
    const { From, To, Body, ProfileName } = req.body || {};
    const normalizedFrom = normalizePhone(From);
    const companyPhoneCandidates = buildCompanyPhoneCandidates(To);
    const now = new Date().toISOString();

    try {
        if (!normalizedFrom) {
            throw new Error('Telefone de origem invalido no webhook.');
        }

        if (companyPhoneCandidates.length === 0) {
            throw new Error('Telefone comercial de destino invalido no webhook.');
        }

        const { data: companies, error: companyError } = await supabase
            .from('companies')
            .select('id, commercial_phone')
            .in('commercial_phone', companyPhoneCandidates)
            .limit(1);

        if (companyError) throw companyError;
        if (!companies || companies.length === 0) {
            throw new Error('Nenhuma empresa encontrada para o numero comercial recebido.');
        }

        const companyId = companies[0].id;

        const { data: existingLeads, error: findError } = await supabase
            .from('leads')
            .select('*')
            .eq('company_id', companyId)
            .eq('phone', normalizedFrom)
            .limit(1);

        if (findError) throw findError;

        let lead = null;
        if (existingLeads && existingLeads.length > 0) {
            lead = existingLeads[0];
            const { error: updateError } = await supabase
                .from('leads')
                .update({
                    name: ProfileName && lead.name === 'Sem nome' ? ProfileName : lead.name,
                    last_conversation_summary: Body || '',
                    updated_at: now
                })
                .eq('id', lead.id);

            if (updateError) throw updateError;
        } else {
            const leadPayload = {
                id: crypto.randomUUID(),
                company_id: companyId,
                phone: normalizedFrom,
                name: ProfileName || 'Sem nome',
                status: 'possivel_cliente',
                last_conversation_summary: Body || '',
                created_at: now,
                updated_at: now
            };

            const { data: insertedLead, error: insertLeadError } = await supabase
                .from('leads')
                .insert([leadPayload])
                .select('*')
                .limit(1);

            if (insertLeadError) throw insertLeadError;
            lead = insertedLead[0];
        }

        const { error: messageError } = await supabase
            .from('messages')
            .insert([{
                id: crypto.randomUUID(),
                lead_id: lead.id,
                direction: 'inbound',
                content: Body || '',
                has_media: false,
                media_url: null,
                sender_id: null,
                created_at: now
            }]);

        if (messageError) throw messageError;
    } catch (error) {
        console.error('Erro ao processar webhook inbound:', error);
    }

    const twiml = new twilio.twiml.MessagingResponse();
    return res.status(200).type('text/xml').send(twiml.toString());
};
