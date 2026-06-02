const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('../utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const companyId = (req.query.company_id || '').toString().trim();
    const includeArchived = req.query.include_archived === 'true' || req.query.include_archived === '1';

    if (!companyId || !isValidUuid(companyId)) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'company_id' e obrigatorio e deve ser um UUID valido."
        });
    }

    try {
        let query = supabase
            .from('note_notebooks')
            .select('*')
            .eq('company_id', companyId)
            .order('sort_order', { ascending: true })
            .order('updated_at', { ascending: false });

        if (!includeArchived) {
            query = query.is('archived_at', null);
        }

        const { data, error } = await query;

        if (error) throw error;

        return res.status(200).json({
            success: true,
            count: (data || []).length,
            notebooks: data || []
        });
    } catch (error) {
        console.error('Erro ao buscar cadernos:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
