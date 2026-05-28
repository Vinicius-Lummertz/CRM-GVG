const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { isValidUuid } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { company_id, title, due_date, lead_id, assigned_to } = req.body || {};

    if (!company_id || !isValidUuid(company_id)) {
        return res.status(400).json({ success: false, error: "O campo 'company_id' deve ser um UUID valido." });
    }

    const normalizedTitle = (title || '').toString().trim();
    if (!normalizedTitle) {
        return res.status(400).json({ success: false, error: "O campo 'title' e obrigatorio." });
    }

    if (lead_id && !isValidUuid(lead_id)) {
        return res.status(400).json({ success: false, error: "O campo 'lead_id' deve ser um UUID valido." });
    }

    if (assigned_to && !isValidUuid(assigned_to)) {
        return res.status(400).json({ success: false, error: "O campo 'assigned_to' deve ser um UUID valido." });
    }

    let dueDateIso = null;
    if (due_date) {
        const parsedDate = new Date(due_date);
        if (Number.isNaN(parsedDate.getTime())) {
            return res.status(400).json({ success: false, error: "O campo 'due_date' deve ser uma data valida." });
        }
        dueDateIso = parsedDate.toISOString();
    }

    try {
        const { data, error } = await supabase
            .from('tasks')
            .insert([{
                id: crypto.randomUUID(),
                company_id,
                lead_id: lead_id || null,
                title: normalizedTitle,
                subtasks: [],
                due_date: dueDateIso,
                assigned_to: assigned_to || null,
                is_completed: false
            }])
            .select('*')
            .single();

        if (error) throw error;

        return res.status(201).json({
            success: true,
            task: data,
            message: 'Task criada com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao criar task:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
