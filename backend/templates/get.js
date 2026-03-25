const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    try {
        console.log(`[CRM] Buscando lista de templates ativos do banco de dados...`);
        
        // 1. Puxa os templates ativos ordenados pelos mais recentes
        const { data: templates, error: fetchError } = await supabase
            .from('templates')
            .select('*')
            .eq('is_active', 1)
            .order('created_at', { ascending: false });

        if (fetchError) {
            throw fetchError;
        }

        return res.status(200).json({
            success: true,
            count: templates ? templates.length : 0,
            templates
        });

    } catch (error) {
        console.error("Erro ao buscar templates:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
