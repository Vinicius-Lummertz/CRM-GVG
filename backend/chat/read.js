const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { leadId } = req.params;
    const companyId = (req.body && req.body.company_id) || req.query.company_id;

    if (!leadId) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'leadId' obrigatorio."
        });
    }

    if (!companyId || !isValidUuid(companyId)) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'company_id' e obrigatorio e deve ser um UUID valido."
        });
    }

    try {
        console.log(`[CRM] Marcando conversa como lida: ${leadId} | company_id=${companyId}`);

        const { data, error } = await supabase
            .from('leads')
            .update({
                unread_count: 0,
                messages_after_last_resume: 0,
                updated_at: new Date().toISOString()
            })
            .eq('id', leadId)
            .eq('company_id', companyId)
            .select('id')
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ success: false, error: "Lead nao encontrado nesta empresa." });
        }

        return res.status(200).json({
            success: true,
            message: "Conversa marcada como lida."
        });
    } catch (error) {
        console.error("Erro ao marcar conversa como lida:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
