const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const companyId = req.query.company_id ? req.query.company_id.toString().trim() : '';

    if (!companyId || !isValidUuid(companyId)) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'company_id' e obrigatorio e deve ser um UUID valido."
        });
    }

    try {
        console.log(`[CRM] Buscando lista de templates ativos | company_id=${companyId}`);
        
        // 1. Puxa os templates ativos ordenados pelos mais recentes
        const { data: templates, error: fetchError } = await supabase
            .from('templates')
            .select('*')
            .eq('company_id', companyId)
            .eq('is_active', 1)
            .order('created_at', { ascending: false });

        if (fetchError) {
            throw fetchError;
        }

        return res.status(200).json({
            success: true,
            count: templates ? templates.length : 0,
            templates
        });

    } catch (error) {
        console.error("Erro ao buscar templates:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
