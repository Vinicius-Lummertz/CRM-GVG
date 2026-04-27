const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { eventId } = req.params;

    if (!isValidUuid(eventId)) {
        return res.status(400).json({ success: false, error: "Parametro 'eventId' deve ser um UUID valido." });
    }

    try {
        console.log(`[CRM] Buscando evento: ${eventId}`);

        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (eventError) {
            if (eventError.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: "Evento nao encontrado." });
            }
            throw eventError;
        }

        const { data: attendees, error: attendeesError } = await supabase
            .from('event_attendees')
            .select('*')
            .eq('event_id', eventId)
            .order('full_name', { ascending: true });

        if (attendeesError) throw attendeesError;

        return res.status(200).json({
            success: true,
            event: {
                ...event,
                attendees: attendees || []
            }
        });
    } catch (error) {
        console.error("Erro ao buscar evento:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
