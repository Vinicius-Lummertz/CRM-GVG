const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('../utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { companyId } = req.params;

    if (!isValidUuid(companyId)) {
        return res.status(400).json({ success: false, error: "Parametro 'companyId' deve ser um UUID valido." });
    }

    try {
        console.log(`[CRM] Listando numeros comerciais da empresa ${companyId}`);

        const { data: numbers, error } = await supabase
            .from('company_whatsapp_numbers')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return res.status(200).json({
            success: true,
            count: numbers ? numbers.length : 0,
            whatsappNumbers: numbers || []
        });
    } catch (error) {
        console.error("Erro ao listar numeros comerciais:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
