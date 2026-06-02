const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { isValidUuid, validateNotePayload } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { company_id, notebook_id, created_by } = req.body || {};

    if (!company_id || !isValidUuid(company_id)) {
        return res.status(400).json({ success: false, error: "O campo 'company_id' deve ser um UUID valido." });
    }

    if (!notebook_id || !isValidUuid(notebook_id)) {
        return res.status(400).json({ success: false, error: "O campo 'notebook_id' deve ser um UUID valido." });
    }

    if (created_by && !isValidUuid(created_by)) {
        return res.status(400).json({ success: false, error: "O campo 'created_by' deve ser um UUID valido." });
    }

    const validation = validateNotePayload(req.body || {});
    if (validation.error) {
        return res.status(400).json({ success: false, error: validation.error });
    }

    try {
        const { data, error } = await supabase
            .from('notes')
            .insert([{
                id: crypto.randomUUID(),
                company_id,
                notebook_id,
                ...validation.payload,
                created_by: created_by || null,
                updated_by: created_by || null
            }])
            .select('*, notebook:note_notebooks(id, title, color, icon)')
            .single();

        if (error) throw error;

        return res.status(201).json({
            success: true,
            note: data,
            message: 'Nota criada com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao criar nota:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
