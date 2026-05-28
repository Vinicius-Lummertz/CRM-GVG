const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { taskId } = req.params;
    const { company_id, title, due_date, is_completed } = req.body || {};

    if (!taskId || !isValidUuid(taskId)) {
        return res.status(400).json({ success: false, error: "Parametro 'taskId' invalido." });
    }

    if (!company_id || !isValidUuid(company_id)) {
        return res.status(400).json({ success: false, error: "O campo 'company_id' deve ser um UUID valido." });
    }

    const payload = {};
    if (title !== undefined) {
        const normalizedTitle = title.toString().trim();
        if (!normalizedTitle) {
            return res.status(400).json({ success: false, error: "O campo 'title' nao pode ser vazio." });
        }
        payload.title = normalizedTitle;
    }

    if (due_date !== undefined) {
        if (!due_date) {
            payload.due_date = null;
        } else {
            const parsedDate = new Date(due_date);
            if (Number.isNaN(parsedDate.getTime())) {
                return res.status(400).json({ success: false, error: "O campo 'due_date' deve ser uma data valida." });
            }
            payload.due_date = parsedDate.toISOString();
        }
    }

    if (is_completed !== undefined) {
        if (typeof is_completed !== 'boolean') {
            return res.status(400).json({ success: false, error: "O campo 'is_completed' deve ser booleano." });
        }
        payload.is_completed = is_completed;
    }

    if (Object.keys(payload).length === 0) {
        return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar.' });
    }

    try {
        const { data, error } = await supabase
            .from('tasks')
            .update(payload)
            .eq('id', taskId)
            .eq('company_id', company_id)
            .select('*')
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, error: 'Task nao encontrada.' });

        return res.status(200).json({ success: true, task: data });
    } catch (error) {
        console.error('Erro ao atualizar task:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
