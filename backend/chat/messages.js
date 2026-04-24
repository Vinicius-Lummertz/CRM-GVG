const { createClient } = require('@supabase/supabase-js');
const { parsePositiveLimit } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { leadId } = req.params;
    const limit = parsePositiveLimit(req.query.limit);
    const before = req.query.before ? new Date(req.query.before) : null;

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
        console.log(`[CRM] Buscando mensagens do lead ${leadId} | limit=${limit}`);

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
        const messages = rows.slice(0, limit).reverse();
        const oldestMessage = messages[0] || null;

        return res.status(200).json({
            success: true,
            count: messages.length,
            hasMore,
            nextBefore: hasMore && oldestMessage ? oldestMessage.created_at : null,
            messages
        });
    } catch (error) {
        console.error("Erro ao buscar mensagens do chat:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
