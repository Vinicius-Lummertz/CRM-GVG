const { createClient } = require('@supabase/supabase-js');
const { toDbLeadStatus, withLegacyStatus } = require('./statusMap');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { leadId } = req.params;
    const rawStatus = req.body && req.body.status;
    const companyId = req.auth.companyId;

    if (!leadId) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'leadId' obrigatorio."
        });
    }

    const dbStatus = toDbLeadStatus(rawStatus);
    if (!dbStatus) {
        return res.status(400).json({
            success: false,
            error: "Status invalido. Use: lead, contacted, negotiating, proposal_sent, converted, not_converted ou os valores novos do banco."
        });
    }

    try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('leads')
            .update({ status: dbStatus, updated_at: now })
            .eq('id', leadId)
            .eq('company_id', companyId)
            .select('*')
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Lead nao encontrado.'
            });
        }

        return res.status(200).json({
            success: true,
            lead: withLegacyStatus(data[0]),
            message: 'Status atualizado com sucesso.'
        });
    } catch (error) {
        console.error('Erro ao atualizar status do lead:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
