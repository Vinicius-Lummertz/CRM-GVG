const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { eventId } = req.params;

    if (!isValidUuid(eventId)) {
        return res.status(400).json({ success: false, error: "Parametro 'eventId' deve ser um UUID valido." });
    }

    try {
        console.log(`[CRM] Removendo evento: ${eventId}`);

        const { data: event, error: findError } = await supabase
            .from('events')
            .select('id')
            .eq('id', eventId)
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
            .eq('id', event.id);

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
