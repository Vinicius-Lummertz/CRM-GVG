const { createClient } = require('@supabase/supabase-js');
const { parsePositiveLimit } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function mapMessageForResponse(message) {
    return {
        ...message,
        body: message.content || '',
        preview: (message.content || '').substring(0, 50),
        sent_by_customer: message.direction === 'inbound' ? 1 : 0
    };
}

module.exports = async (req, res) => {
    const { leadId } = req.params;
    const limit = parsePositiveLimit(req.query.limit);
    const before = req.query.before ? new Date(req.query.before) : null;
    const companyId = req.auth.companyId;

    if (!leadId) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'leadId' obrigatorio."
        });
    }

    if (before && Number.isNaN(before.getTime())) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'before' invalido. Use uma data ISO."
        });
    }

    try {
        const { data: leadRows, error: leadError } = await supabase
            .from('leads')
            .select('id')
            .eq('id', leadId)
            .eq('company_id', companyId)
            .limit(1);

        if (leadError) throw leadError;
        if (!leadRows || leadRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lead nao encontrado.' });
        }

        let query = supabase
            .from('messages')
            .select('*')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false })
            .limit(limit + 1);

        if (before) {
            query = query.lt('created_at', before.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;

        const rows = data || [];
        const hasMore = rows.length > limit;
        const messages = rows.slice(0, limit).reverse().map(mapMessageForResponse);
        const oldestMessage = messages[0] || null;

        return res.status(200).json({
            success: true,
            count: messages.length,
            hasMore,
            nextBefore: hasMore && oldestMessage ? oldestMessage.created_at : null,
            messages
        });
    } catch (error) {
        console.error('Erro ao buscar mensagens do chat:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
