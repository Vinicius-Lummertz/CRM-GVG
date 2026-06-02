const { createClient } = require('@supabase/supabase-js');
const { isValidUuid, validateNotebookPayload } = require('../utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { notebookId } = req.params;
    const { company_id, is_archived } = req.body || {};

    if (!notebookId || !isValidUuid(notebookId)) {
        return res.status(400).json({ success: false, error: "Parametro 'notebookId' invalido." });
    }

    if (!company_id || !isValidUuid(company_id)) {
        return res.status(400).json({ success: false, error: "O campo 'company_id' deve ser um UUID valido." });
    }

    const validation = validateNotebookPayload(req.body || {}, { isUpdate: true });
    if (validation.error) {
        return res.status(400).json({ success: false, error: validation.error });
    }

    const payload = { ...validation.payload };
    if (is_archived !== undefined) {
        if (typeof is_archived !== 'boolean') {
            return res.status(400).json({ success: false, error: "O campo 'is_archived' deve ser booleano." });
        }
        payload.archived_at = is_archived ? new Date().toISOString() : null;
    }

    if (Object.keys(payload).length === 0) {
        return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar.' });
    }

    try {
        const { data, error } = await supabase
            .from('note_notebooks')
            .update(payload)
            .eq('id', notebookId)
            .eq('company_id', company_id)
            .select('*')
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, error: 'Caderno nao encontrado.' });

        return res.status(200).json({ success: true, notebook: data });
    } catch (error) {
        console.error('Erro ao atualizar caderno:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
