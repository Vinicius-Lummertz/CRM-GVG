const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { leadId } = req.params;

    if (!leadId) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'leadId' obrigatorio."
        });
    }

    try {
        console.log(`[CRM] Marcando conversa como lida: ${leadId}`);

        const { error } = await supabase
            .from('leads')
            .update({
                unread_count: 0,
                messages_after_last_resume: 0,
                updated_at: new Date().toISOString()
            })
            .eq('id', leadId);

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: "Conversa marcada como lida."
        });
    } catch (error) {
        console.error("Erro ao marcar conversa como lida:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
