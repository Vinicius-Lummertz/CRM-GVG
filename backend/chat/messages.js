const { createClient } = require('@supabase/supabase-js');
const { parsePositiveLimit } = require('./utils');
const { isValidUuid } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { leadId } = req.params;
    const limit = parsePositiveLimit(req.query.limit);
    const before = req.query.before ? new Date(req.query.before) : null;
    const companyId = req.query.company_id ? req.query.company_id.toString().trim() : '';

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

    if (!companyId || !isValidUuid(companyId)) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'company_id' e obrigatorio e deve ser um UUID valido."
        });
    }

    try {
        console.log(`[CRM] Buscando mensagens do lead ${leadId} | company_id=${companyId} | limit=${limit}`);

        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('id')
            .eq('id', leadId)
            .eq('company_id', companyId)
            .maybeSingle();

        if (leadError) throw leadError;
        if (!lead) {
            return res.status(404).json({ success: false, error: "Lead nao encontrado nesta empresa." });
        }

        let query = supabase
            .from('messages')
            .select('*')
            .eq('company_id', companyId)
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
