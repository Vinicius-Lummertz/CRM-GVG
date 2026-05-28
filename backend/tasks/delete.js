const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { taskId } = req.params;
    const companyId = (req.query.company_id || '').toString().trim();

    if (!taskId || !isValidUuid(taskId)) {
        return res.status(400).json({ success: false, error: "Parametro 'taskId' invalido." });
    }

    if (!companyId || !isValidUuid(companyId)) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'company_id' e obrigatorio e deve ser um UUID valido."
        });
    }

    try {
        const { data, error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId)
            .eq('company_id', companyId)
            .select('id')
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, error: 'Task nao encontrada.' });

        return res.status(200).json({ success: true, message: 'Task removida com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover task:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
