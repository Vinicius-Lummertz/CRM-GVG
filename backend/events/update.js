const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { isValidUuid, validateEventPayload } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function fetchEvent(eventId) {
    const { data, error } = await supabase
        .from('events')
        .select('id, start_time, end_time')
        .eq('id', eventId)
        .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;

    return data;
}

module.exports = async (req, res) => {
    const { eventId } = req.params;

    if (!isValidUuid(eventId)) {
        return res.status(400).json({ success: false, error: "Parametro 'eventId' deve ser um UUID valido." });
    }

    const validation = validateEventPayload(req.body, { partial: true });
    if (validation.error) {
        return res.status(400).json({ success: false, error: validation.error });
    }

    try {
        console.log(`[CRM] Atualizando evento: ${eventId}`);

        const existingEvent = await fetchEvent(eventId);
        if (!existingEvent) {
            return res.status(404).json({ success: false, error: "Evento nao encontrado." });
        }

        const startTime = validation.payload.start_time || existingEvent.start_time;
        const endTime = validation.payload.end_time || existingEvent.end_time;

        if (new Date(endTime) <= new Date(startTime)) {
            return res.status(400).json({ success: false, error: "O campo 'end_time' deve ser maior que 'start_time'." });
        }

        const updatePayload = {
            ...validation.payload,
            updated_at: new Date().toISOString()
        };

        const { data: event, error: updateError } = await supabase
            .from('events')
            .update(updatePayload)
            .eq('id', eventId)
            .select('*')
            .single();

        if (updateError) throw updateError;

        if (validation.attendees !== undefined) {
            const { error: deleteAttendeesError } = await supabase
                .from('event_attendees')
                .delete()
                .eq('event_id', eventId);

            if (deleteAttendeesError) throw deleteAttendeesError;

            if (validation.attendees.length > 0) {
                const { error: insertAttendeesError } = await supabase
                    .from('event_attendees')
                    .insert(validation.attendees.map((attendee) => ({
                        id: crypto.randomUUID(),
                        event_id: eventId,
                        ...attendee
                    })));

                if (insertAttendeesError) throw insertAttendeesError;
            }
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
            },
            message: "Evento atualizado com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao atualizar evento:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
