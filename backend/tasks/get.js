const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const companyId = (req.query.company_id || '').toString().trim();

    if (!companyId || !isValidUuid(companyId)) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'company_id' e obrigatorio e deve ser um UUID valido."
        });
    }

    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('company_id', companyId)
            .order('is_completed', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;

        return res.status(200).json({
            success: true,
            count: (data || []).length,
            tasks: data || []
        });
    } catch (error) {
        console.error('Erro ao buscar tasks:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
