const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function toIso(date) {
    return date.toISOString();
}

function safeNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function percentageChange(current, previous) {
    const c = safeNumber(current);
    const p = safeNumber(previous);
    if (p === 0 && c === 0) return 0;
    if (p === 0) return 100;
    return ((c - p) / p) * 100;
}

module.exports = async (req, res) => {
    const companyId = (req.query.company_id || '').toString().trim();
    const days = Math.max(1, Math.min(365, Number.parseInt(req.query.days, 10) || 30));

    if (!companyId || !isValidUuid(companyId)) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'company_id' e obrigatorio e deve ser um UUID valido."
        });
    }

    const now = new Date();
    const currentFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousFrom = new Date(currentFrom.getTime() - days * 24 * 60 * 60 * 1000);

    try {
        const { data: leads, error: leadsError } = await supabase
            .from('leads')
            .select('id, status, final_budget, created_at, updated_at')
            .eq('company_id', companyId);

        if (leadsError) throw leadsError;

        const leadRows = leads || [];
        const leadIds = leadRows.map((item) => item.id);

        let messageRows = [];
        if (leadIds.length > 0) {
            const { data: messages, error: messagesError } = await supabase
                .from('messages')
                .select('id, direction, created_at')
                .in('lead_id', leadIds);

            if (messagesError) throw messagesError;
            messageRows = messages || [];
        }

        const { data: eventsToday, error: eventsError } = await supabase
            .from('events')
            .select('id, title, start_time')
            .eq('company_id', companyId)
            .gte('start_time', toIso(new Date(now.getFullYear(), now.getMonth(), now.getDate())))
            .lt('start_time', toIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)))
            .order('start_time', { ascending: true })
            .limit(5);

        if (eventsError) throw eventsError;

        const metrics = {
            leads_active: 0,
            leads_active_previous: 0,
            messages_sent: 0,
            messages_sent_previous: 0,
            proposals_accepted: 0,
            proposals_accepted_previous: 0,
            revenue: 0,
            revenue_previous: 0
        };

        leadRows.forEach((lead) => {
            const createdAt = lead.created_at ? new Date(lead.created_at) : null;
            const updatedAt = lead.updated_at ? new Date(lead.updated_at) : null;
            const accepted = lead.status === 'proposta_aceita';

            if (createdAt && createdAt >= currentFrom && createdAt <= now) {
                metrics.leads_active += 1;
            } else if (createdAt && createdAt >= previousFrom && createdAt < currentFrom) {
                metrics.leads_active_previous += 1;
            }

            if (accepted && updatedAt && updatedAt >= currentFrom && updatedAt <= now) {
                metrics.proposals_accepted += 1;
                metrics.revenue += safeNumber(lead.final_budget);
            } else if (accepted && updatedAt && updatedAt >= previousFrom && updatedAt < currentFrom) {
                metrics.proposals_accepted_previous += 1;
                metrics.revenue_previous += safeNumber(lead.final_budget);
            }
        });

        messageRows.forEach((message) => {
            if (message.direction !== 'outbound') return;
            const createdAt = message.created_at ? new Date(message.created_at) : null;
            if (!createdAt) return;

            if (createdAt >= currentFrom && createdAt <= now) {
                metrics.messages_sent += 1;
            } else if (createdAt >= previousFrom && createdAt < currentFrom) {
                metrics.messages_sent_previous += 1;
            }
        });

        const pipeline = {
            possivel_cliente: 0,
            analisando_proposta: 0,
            proposta_aceita: 0
        };

        leadRows.forEach((lead) => {
            if (pipeline[lead.status] !== undefined) {
                pipeline[lead.status] += 1;
            }
        });

        return res.status(200).json({
            success: true,
            period_days: days,
            company_id: companyId,
            cards: {
                leads_active: {
                    value: metrics.leads_active,
                    trend_pct: percentageChange(metrics.leads_active, metrics.leads_active_previous)
                },
                messages_sent: {
                    value: metrics.messages_sent,
                    trend_pct: percentageChange(metrics.messages_sent, metrics.messages_sent_previous)
                },
                proposals_accepted: {
                    value: metrics.proposals_accepted,
                    trend_pct: percentageChange(metrics.proposals_accepted, metrics.proposals_accepted_previous)
                },
                revenue: {
                    value: metrics.revenue,
                    trend_pct: percentageChange(metrics.revenue, metrics.revenue_previous)
                }
            },
            pipeline,
            today_events: eventsToday || []
        });
    } catch (error) {
        console.error('Erro ao montar dashboard:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
