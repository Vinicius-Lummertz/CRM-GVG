const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function digitsOnly(value) {
    return (value || '').toString().replace(/\D/g, '');
}

async function resolveLeadId(leadId, phone) {
    if (leadId) return leadId;
    const digits = digitsOnly(phone);
    if (!digits) return null;

    const externalKey = `whatsapp:+${digits}`;
    const { data, error } = await supabase
        .from('leads')
        .select('id')
        .or(`phone.eq.+${digits},phone.eq.${digits},wa_id.eq.${digits},external_key.eq.${externalKey}`)
        .order('updated_at', { ascending: false })
        .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data[0].id;
}

module.exports = async (req, res) => {
    const leadIdInput = (req.query.lead_id || req.query.leadId || '').toString().trim();
    const phone = (req.query.phone || '').toString().trim();

    if (!leadIdInput && !phone) {
        return res.status(400).json({
            success: false,
            error: "Informe 'lead_id' (ou 'leadId') ou 'phone'."
        });
    }

    try {
        const leadId = await resolveLeadId(leadIdInput, phone);

        if (!leadId) {
            return res.status(404).json({
                success: false,
                error: 'Lead nao encontrado para buscar mensagens.'
            });
        }

        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return res.status(200).json({
            success: true,
            lead_id: leadId,
            count: messages ? messages.length : 0,
            messages: messages || []
        });
    } catch (error) {
        console.error('Erro ao listar mensagens:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
