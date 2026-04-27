const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('../utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { companyId, numberId } = req.params;

    if (!isValidUuid(companyId) || !isValidUuid(numberId)) {
        return res.status(400).json({ success: false, error: "Parametros 'companyId' e 'numberId' devem ser UUIDs validos." });
    }

    try {
        console.log(`[CRM] Removendo numero comercial ${numberId}`);

        const { data: number, error: findError } = await supabase
            .from('company_whatsapp_numbers')
            .select('id')
            .eq('id', numberId)
            .eq('company_id', companyId)
            .maybeSingle();

        if (findError) throw findError;

        if (!number) {
            return res.status(404).json({ success: false, error: "Numero comercial nao encontrado." });
        }

        const { error: deleteError } = await supabase
            .from('company_whatsapp_numbers')
            .delete()
            .eq('id', numberId)
            .eq('company_id', companyId);

        if (deleteError) throw deleteError;

        return res.status(200).json({
            success: true,
            numberId,
            message: "Numero comercial removido com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao remover numero comercial:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
