const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { leadId } = req.params;
    const companyId = req.auth.companyId;

    if (!leadId) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'leadId' obrigatorio."
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

        return res.status(200).json({
            success: true,
            message: 'Conversa marcada como lida.'
        });
    } catch (error) {
        console.error('Erro ao marcar conversa como lida:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
