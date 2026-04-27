const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { eventId } = req.params;
    const companyId = (req.body && req.body.company_id) || req.query.company_id;

    if (!isValidUuid(eventId)) {
        return res.status(400).json({ success: false, error: "Parametro 'eventId' deve ser um UUID valido." });
    }

    if (!companyId || !isValidUuid(companyId)) {
        return res.status(400).json({ success: false, error: "Parametro 'company_id' e obrigatorio e deve ser um UUID valido." });
    }

    try {
        console.log(`[CRM] Removendo evento: ${eventId} | company_id=${companyId}`);

        const { data: event, error: findError } = await supabase
            .from('events')
            .select('id')
            .eq('id', eventId)
            .eq('company_id', companyId)
            .single();

        if (findError) {
            if (findError.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: "Evento nao encontrado." });
            }
            throw findError;
        }

        const { error: deleteError } = await supabase
            .from('events')
            .delete()
            .eq('id', event.id)
            .eq('company_id', companyId);

        if (deleteError) throw deleteError;

        return res.status(200).json({
            success: true,
            eventId,
            message: "Evento removido com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao remover evento:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
