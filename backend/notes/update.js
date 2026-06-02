const { createClient } = require('@supabase/supabase-js');
const { isValidUuid, validateNotePayload } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { noteId } = req.params;
    const { company_id, is_deleted } = req.body || {};

    if (!noteId || !isValidUuid(noteId)) {
        return res.status(400).json({ success: false, error: "Parametro 'noteId' invalido." });
    }

    if (!company_id || !isValidUuid(company_id)) {
        return res.status(400).json({ success: false, error: "O campo 'company_id' deve ser um UUID valido." });
    }

    const validation = validateNotePayload(req.body || {}, { isUpdate: true });
    if (validation.error) {
        return res.status(400).json({ success: false, error: validation.error });
    }

    const payload = { ...validation.payload };
    if (is_deleted !== undefined) {
        if (typeof is_deleted !== 'boolean') {
            return res.status(400).json({ success: false, error: "O campo 'is_deleted' deve ser booleano." });
        }
        payload.deleted_at = is_deleted ? new Date().toISOString() : null;
    }

    if (Object.keys(payload).length === 0) {
        return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar.' });
    }

    try {
        const { data, error } = await supabase
            .from('notes')
            .update(payload)
            .eq('id', noteId)
            .eq('company_id', company_id)
            .select('*, notebook:note_notebooks(id, title, color, icon)')
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, error: 'Nota nao encontrada.' });

        return res.status(200).json({ success: true, note: data });
    } catch (error) {
        console.error('Erro ao atualizar nota:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
