const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { isValidUuid, validateNotebookPayload } = require('../utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { company_id, created_by } = req.body || {};

    if (!company_id || !isValidUuid(company_id)) {
        return res.status(400).json({ success: false, error: "O campo 'company_id' deve ser um UUID valido." });
    }

    if (created_by && !isValidUuid(created_by)) {
        return res.status(400).json({ success: false, error: "O campo 'created_by' deve ser um UUID valido." });
    }

    const validation = validateNotebookPayload(req.body || {});
    if (validation.error) {
        return res.status(400).json({ success: false, error: validation.error });
    }

    try {
        const { data, error } = await supabase
            .from('note_notebooks')
            .insert([{
                id: crypto.randomUUID(),
                company_id,
                ...validation.payload,
                created_by: created_by || null,
                updated_by: created_by || null
            }])
            .select('*')
            .single();

        if (error) throw error;

        return res.status(201).json({
            success: true,
            notebook: data,
            message: 'Caderno criado com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao criar caderno:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
