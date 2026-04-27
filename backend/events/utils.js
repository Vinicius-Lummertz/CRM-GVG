const VALID_STATUSES = ['Pendente', 'Confirmada', 'Cancelada', 'Finalizada'];
const VALID_RELATED_TYPES = ['Contrato', 'Fechamento', 'Alinhamento'];

function isValidUuid(value) {
    return typeof value === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseOptionalString(value) {
    if (value === undefined || value === null) return null;

    const text = value.toString().trim();
    return text || null;
}

function parseRequiredString(value, fieldName) {
    const text = parseOptionalString(value);

    if (!text) {
        return { error: `O campo '${fieldName}' e obrigatorio.` };
    }

    return { value: text };
}

function parseDate(value, fieldName) {
    if (!value) {
        return { error: `O campo '${fieldName}' e obrigatorio.` };
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return { error: `O campo '${fieldName}' deve ser uma data valida.` };
    }

    return { value: date.toISOString() };
}

function validateAttendees(attendees) {
    if (attendees === undefined) return { value: undefined };

    if (!Array.isArray(attendees)) {
        return { error: "O campo 'attendees' deve ser uma lista." };
    }

    const normalized = [];
    const seenEmails = new Set();

    for (const attendee of attendees) {
        if (!attendee || typeof attendee !== 'object') {
            return { error: "Cada participante deve ser um objeto valido." };
        }

        const email = parseOptionalString(attendee.email);
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return { error: "Cada participante deve ter um 'email' valido." };
        }

        const normalizedEmail = email.toLowerCase();
        if (seenEmails.has(normalizedEmail)) {
            return { error: `Participante duplicado: ${normalizedEmail}.` };
        }
        seenEmails.add(normalizedEmail);

        const leadId = parseOptionalString(attendee.lead_id);
        normalized.push({
            lead_id: leadId,
            email: normalizedEmail,
            full_name: parseOptionalString(attendee.full_name),
            is_internal: Boolean(attendee.is_internal)
        });
    }

    return { value: normalized };
}

function validateEventPayload(body, options = {}) {
    const partial = Boolean(options.partial);
    const payload = {};

    if (!partial || body.user_id !== undefined) {
        const userId = parseRequiredString(body.user_id, 'user_id');
        if (userId.error) return { error: userId.error };
        if (!isValidUuid(userId.value)) return { error: "O campo 'user_id' deve ser um UUID valido." };
        payload.user_id = userId.value;
    }

    if (!partial || body.title !== undefined) {
        const title = parseRequiredString(body.title, 'title');
        if (title.error) return { error: title.error };
        payload.title = title.value;
    }

    if (body.description !== undefined) payload.description = parseOptionalString(body.description);
    if (body.location !== undefined) payload.location = parseOptionalString(body.location);

    if (!partial || body.start_time !== undefined) {
        const startTime = parseDate(body.start_time, 'start_time');
        if (startTime.error) return { error: startTime.error };
        payload.start_time = startTime.value;
    }

    if (!partial || body.end_time !== undefined) {
        const endTime = parseDate(body.end_time, 'end_time');
        if (endTime.error) return { error: endTime.error };
        payload.end_time = endTime.value;
    }

    if (payload.start_time && payload.end_time && new Date(payload.end_time) <= new Date(payload.start_time)) {
        return { error: "O campo 'end_time' deve ser maior que 'start_time'." };
    }

    if (!partial || body.is_online !== undefined) {
        if (typeof body.is_online !== 'boolean') {
            return { error: "O campo 'is_online' deve ser booleano." };
        }
        payload.is_online = body.is_online;
    }

    if (body.status !== undefined) {
        const status = parseOptionalString(body.status) || 'Pendente';
        if (!VALID_STATUSES.includes(status)) {
            return { error: `Status invalido. Use: ${VALID_STATUSES.join(', ')}.` };
        }
        payload.status = status;
    } else if (!partial) {
        payload.status = 'Pendente';
    }

    if (body.related_type !== undefined) {
        const relatedType = parseOptionalString(body.related_type);
        if (relatedType && !VALID_RELATED_TYPES.includes(relatedType)) {
            return { error: `Tipo relacionado invalido. Use: ${VALID_RELATED_TYPES.join(', ')}.` };
        }
        payload.related_type = relatedType;
    }

    if (body.related_id !== undefined) {
        const relatedId = parseOptionalString(body.related_id);
        if (relatedId && !isValidUuid(relatedId)) {
            return { error: "O campo 'related_id' deve ser um UUID valido." };
        }
        payload.related_id = relatedId;
    }

    if (body.external_id !== undefined) payload.external_id = parseOptionalString(body.external_id);

    if (body.sync_metadata !== undefined) {
        if (body.sync_metadata === null || Array.isArray(body.sync_metadata) || typeof body.sync_metadata !== 'object') {
            return { error: "O campo 'sync_metadata' deve ser um objeto JSON." };
        }
        payload.sync_metadata = body.sync_metadata;
    } else if (!partial) {
        payload.sync_metadata = {};
    }

    const attendees = validateAttendees(body.attendees);
    if (attendees.error) return { error: attendees.error };

    return { payload, attendees: attendees.value };
}

module.exports = {
    VALID_STATUSES,
    VALID_RELATED_TYPES,
    isValidUuid,
    parseOptionalString,
    validateEventPayload
};
