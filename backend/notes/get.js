const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const companyId = (req.query.company_id || '').toString().trim();
    const notebookId = (req.query.notebook_id || '').toString().trim();
    const search = (req.query.search || '').toString().trim().replace(/[,%()]/g, ' ');
    const includeDeleted = req.query.include_deleted === 'true' || req.query.include_deleted === '1';

    if (!companyId || !isValidUuid(companyId)) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'company_id' e obrigatorio e deve ser um UUID valido."
        });
    }

    if (notebookId && !isValidUuid(notebookId)) {
        return res.status(400).json({ success: false, error: "Parametro 'notebook_id' deve ser um UUID valido." });
    }

    try {
        let query = supabase
            .from('notes')
            .select('*, notebook:note_notebooks(id, title, color, icon)')
            .eq('company_id', companyId)
            .order('is_pinned', { ascending: false })
            .order('sort_order', { ascending: true })
            .order('updated_at', { ascending: false });

        if (notebookId) {
            query = query.eq('notebook_id', notebookId);
        }

        if (!includeDeleted) {
            query = query.is('deleted_at', null);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,content_text.ilike.%${search}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        return res.status(200).json({
            success: true,
            count: (data || []).length,
            notes: data || []
        });
    } catch (error) {
        console.error('Erro ao buscar notas:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
