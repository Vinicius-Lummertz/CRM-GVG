const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const VALID_STATUSES = new Set([
    'lead',
    'contacted',
    'negotiating',
    'proposal_sent',
    'converted',
    'not_converted'
]);

module.exports = async (req, res) => {
    const { leadId } = req.params;
    const rawStatus = req.body && req.body.status;
    const status = typeof rawStatus === 'string' ? rawStatus.trim() : '';

    if (!leadId) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'leadId' obrigatorio."
        });
    }

    if (!VALID_STATUSES.has(status)) {
        return res.status(400).json({
            success: false,
            error: "Status invalido. Use: lead, contacted, negotiating, proposal_sent, converted ou not_converted."
        });
    }

    try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('leads')
            .update({ status, updated_at: now })
            .eq('id', leadId)
            .select('*')
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Lead nao encontrado."
            });
        }

        return res.status(200).json({
            success: true,
            lead: data[0],
            message: "Status atualizado com sucesso."
        });
    } catch (error) {
        console.error("Erro ao atualizar status do lead:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
