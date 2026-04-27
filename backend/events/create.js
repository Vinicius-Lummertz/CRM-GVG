const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { validateEventPayload } = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const validation = validateEventPayload(req.body);

    if (validation.error) {
        return res.status(400).json({ success: false, error: validation.error });
    }

    const eventId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
        console.log(`[CRM] Criando evento: ${validation.payload.title}`);

        const { data: event, error: insertError } = await supabase
            .from('events')
            .insert([{
                id: eventId,
                ...validation.payload,
                created_at: now,
                updated_at: now
            }])
            .select('*')
            .single();

        if (insertError) throw insertError;

        const attendees = validation.attendees || [];
        if (attendees.length > 0) {
            const { error: attendeesError } = await supabase
                .from('event_attendees')
                .insert(attendees.map((attendee) => ({
                    id: crypto.randomUUID(),
                    event_id: eventId,
                    ...attendee
                })));

            if (attendeesError) throw attendeesError;
        }

        const { data: savedAttendees, error: fetchAttendeesError } = await supabase
            .from('event_attendees')
            .select('*')
            .eq('event_id', eventId)
            .order('full_name', { ascending: true });

        if (fetchAttendeesError) throw fetchAttendeesError;

        console.log(`[CRM] Evento criado com sucesso! ID: ${eventId}`);
        return res.status(201).json({
            success: true,
            eventId,
            event: {
                ...event,
                attendees: savedAttendees || []
            },
            message: "Evento criado com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao criar evento:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
