const { isValidUuid, parseOptionalString, parseRequiredString } = require('../companies/utils');

function parseDate(value, fieldName) {
    if (!value) return { error: `O campo '${fieldName}' e obrigatorio.` };
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { error: `O campo '${fieldName}' deve ser uma data valida.` };
    return { value: date.toISOString() };
}

function validateEventPayload(body, options = {}) {
    const partial = Boolean(options.partial);
    const payload = {};

    if (!partial || body.company_id !== undefined) {
        const companyId = parseRequiredString(body.company_id, 'company_id');
        if (companyId.error || !isValidUuid(companyId.value)) return { error: "O campo 'company_id' deve ser um UUID valido." };
        payload.company_id = companyId.value;
    }

    if (!partial || body.title !== undefined) {
        const title = parseRequiredString(body.title, 'title');
        if (title.error) return { error: title.error };
        payload.title = title.value;
    }

    if (body.description !== undefined) payload.description = parseOptionalString(body.description);

    if (!partial || body.start_time !== undefined) {
        const start = parseDate(body.start_time, 'start_time');
        if (start.error) return { error: start.error };
        payload.start_time = start.value;
    }

    if (!partial || body.end_time !== undefined) {
        const end = parseDate(body.end_time, 'end_time');
        if (end.error) return { error: end.error };
        payload.end_time = end.value;
    }

    if (payload.start_time && payload.end_time && new Date(payload.end_time) <= new Date(payload.start_time)) {
        return { error: "O campo 'end_time' deve ser maior que 'start_time'." };
    }

    if (body.lead_id !== undefined) {
        const leadId = parseOptionalString(body.lead_id);
        if (leadId && !isValidUuid(leadId)) return { error: "O campo 'lead_id' deve ser um UUID valido." };
        payload.lead_id = leadId;
    }

    if (body.google_event_id !== undefined) payload.google_event_id = parseOptionalString(body.google_event_id);

    return { payload };
}

module.exports = { isValidUuid, parseOptionalString, validateEventPayload };
