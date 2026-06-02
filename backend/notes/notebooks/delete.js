const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('../utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { notebookId } = req.params;
    const companyId = (req.query.company_id || '').toString().trim();

    if (!notebookId || !isValidUuid(notebookId)) {
        return res.status(400).json({ success: false, error: "Parametro 'notebookId' invalido." });
    }

    if (!companyId || !isValidUuid(companyId)) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'company_id' e obrigatorio e deve ser um UUID valido."
        });
    }

    try {
        const { data, error } = await supabase
            .from('note_notebooks')
            .delete()
            .eq('id', notebookId)
            .eq('company_id', companyId)
            .select('id')
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, error: 'Caderno nao encontrado.' });

        return res.status(200).json({ success: true, message: 'Caderno removido com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover caderno:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
