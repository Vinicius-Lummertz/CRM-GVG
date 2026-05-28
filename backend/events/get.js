const { createClient } = require('@supabase/supabase-js');
const {
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

module.exports = async (req, res) => {
    const companyId = parseOptionalString(req.query.company_id);
    const leadId = parseOptionalString(req.query.lead_id);

    if (!companyId || !isValidUuid(companyId)) {
        return res.status(400).json({ success: false, error: "Parametro 'company_id' e obrigatorio e deve ser um UUID valido." });
    }

    if (leadId && !isValidUuid(leadId)) {
        return res.status(400).json({ success: false, error: "Parametro 'lead_id' deve ser um UUID valido." });
    }

    const from = parseDateFilter(req.query.from, 'from');
    if (from.error) return res.status(400).json({ success: false, error: from.error });

    const to = parseDateFilter(req.query.to, 'to');
    if (to.error) return res.status(400).json({ success: false, error: to.error });

    if (from.value && to.value && new Date(to.value) <= new Date(from.value)) {
        return res.status(400).json({ success: false, error: "Parametro 'to' deve ser maior que 'from'." });
    }

    try {
        console.log(`[CRM] Buscando eventos | company_id=${companyId} | lead_id=${leadId || '[todos]'}`);

        let query = supabase
            .from('events')
            .select('*')
            .eq('company_id', companyId)
            .order('start_time', { ascending: true });

        if (leadId) query = query.eq('lead_id', leadId);
        if (from.value) query = query.gte('end_time', from.value);
        if (to.value) query = query.lte('start_time', to.value);

        const { data: events, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        const responseEvents = events || [];

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
