const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { noteId } = req.params;
    const companyId = (req.query.company_id || '').toString().trim();
    const permanent = req.query.permanent === 'true' || req.query.permanent === '1';

    if (!noteId || !isValidUuid(noteId)) {
        return res.status(400).json({ success: false, error: "Parametro 'noteId' invalido." });
    }

    if (!companyId || !isValidUuid(companyId)) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'company_id' e obrigatorio e deve ser um UUID valido."
        });
    }

    try {
        const query = permanent
            ? supabase.from('notes').delete()
            : supabase.from('notes').update({ deleted_at: new Date().toISOString() });

        const { data, error } = await query
            .eq('id', noteId)
            .eq('company_id', companyId)
            .select('id')
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, error: 'Nota nao encontrada.' });

        return res.status(200).json({ success: true, message: 'Nota removida com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover nota:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
