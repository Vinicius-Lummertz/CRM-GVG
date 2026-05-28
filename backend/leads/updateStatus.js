const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const VALID_LEAD_STATUSES = ['contato_iniciado', 'em_negociacao', 'proposta_enviada', 'orcamento_fechado'];

module.exports = async (req, res) => {
    const { leadId } = req.params;
    const { company_id, status } = req.body || {};

    if (!leadId || !isValidUuid(leadId)) {
        return res.status(400).json({ success: false, error: "Parametro 'leadId' invalido." });
    }

    if (!company_id || !isValidUuid(company_id)) {
        return res.status(400).json({ success: false, error: "O campo 'company_id' deve ser um UUID valido." });
    }

    if (!status || typeof status !== 'string') {
        return res.status(400).json({ success: false, error: "O campo 'status' e obrigatorio." });
    }

    const normalizedStatus = status.trim();
    if (!VALID_LEAD_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
            success: false,
            error: `Status invalido. Use: ${VALID_LEAD_STATUSES.join(', ')}.`
        });
    }

    try {
        const { data, error } = await supabase
            .from('leads')
            .update({
                status: normalizedStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', leadId)
            .eq('company_id', company_id)
            .select('id, company_id, status, updated_at')
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ success: false, error: 'Lead nao encontrado.' });
        }

        return res.status(200).json({ success: true, lead: data });
    } catch (error) {
        console.error('Erro ao atualizar status do lead:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
