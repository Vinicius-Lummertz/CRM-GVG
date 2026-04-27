const { createClient } = require('@supabase/supabase-js');
const {
    VALID_RELATED_TYPES,
    VALID_STATUSES,
    isValidUuid,
    parseOptionalString
} = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function parseDateFilter(value, fieldName) {
    if (!value) return { value: null };

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return { error: `O parametro '${fieldName}' deve ser uma data valida.` };
    }

    return { value: date.toISOString() };
}

async function attachAttendees(events) {
    if (!events || events.length === 0) return [];

    const eventIds = events.map((event) => event.id);
    const { data: attendees, error } = await supabase
        .from('event_attendees')
        .select('*')
        .in('event_id', eventIds)
        .order('full_name', { ascending: true });

    if (error) throw error;

    const attendeesByEvent = new Map();
    (attendees || []).forEach((attendee) => {
        if (!attendeesByEvent.has(attendee.event_id)) {
            attendeesByEvent.set(attendee.event_id, []);
        }
        attendeesByEvent.get(attendee.event_id).push(attendee);
    });

    return events.map((event) => ({
        ...event,
        attendees: attendeesByEvent.get(event.id) || []
    }));
}

module.exports = async (req, res) => {
    const userId = parseOptionalString(req.query.user_id);
    const status = parseOptionalString(req.query.status);
    const relatedType = parseOptionalString(req.query.related_type);
    const relatedId = parseOptionalString(req.query.related_id);
    const includeAttendees = req.query.include_attendees !== 'false';

    if (!userId || !isValidUuid(userId)) {
        return res.status(400).json({ success: false, error: "Parametro 'user_id' e obrigatorio e deve ser um UUID valido." });
    }

    if (status && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, error: `Status invalido. Use: ${VALID_STATUSES.join(', ')}.` });
    }

    if (relatedType && !VALID_RELATED_TYPES.includes(relatedType)) {
        return res.status(400).json({ success: false, error: `Tipo relacionado invalido. Use: ${VALID_RELATED_TYPES.join(', ')}.` });
    }

    if (relatedId && !isValidUuid(relatedId)) {
        return res.status(400).json({ success: false, error: "Parametro 'related_id' deve ser um UUID valido." });
    }

    const from = parseDateFilter(req.query.from, 'from');
    if (from.error) return res.status(400).json({ success: false, error: from.error });

    const to = parseDateFilter(req.query.to, 'to');
    if (to.error) return res.status(400).json({ success: false, error: to.error });

    if (from.value && to.value && new Date(to.value) <= new Date(from.value)) {
        return res.status(400).json({ success: false, error: "Parametro 'to' deve ser maior que 'from'." });
    }

    try {
        console.log(`[CRM] Buscando eventos | user_id=${userId}`);

        let query = supabase
            .from('events')
            .select('*')
            .eq('user_id', userId)
            .order('start_time', { ascending: true });

        if (status) query = query.eq('status', status);
        if (relatedType) query = query.eq('related_type', relatedType);
        if (relatedId) query = query.eq('related_id', relatedId);
        if (from.value) query = query.gte('end_time', from.value);
        if (to.value) query = query.lte('start_time', to.value);

        const { data: events, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        const responseEvents = includeAttendees ? await attachAttendees(events || []) : (events || []);

        return res.status(200).json({
            success: true,
            count: responseEvents.length,
            events: responseEvents
        });
    } catch (error) {
        console.error("Erro ao buscar eventos:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
