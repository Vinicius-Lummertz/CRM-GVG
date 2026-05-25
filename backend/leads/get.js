const { createClient } = require('@supabase/supabase-js');
const { withLegacyStatus } = require('./statusMap');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const VALID_SEARCH_MODES = ['auto', 'name', 'number'];

function normalizeDigits(value) {
    return value ? value.replace(/\D/g, '') : '';
}

function addNumberVariant(candidates, digits) {
    if (!digits) return;

    candidates.add(digits);

    if (digits.startsWith('55') && digits.length >= 5) {
        if (digits[4] === '9') {
            candidates.add(`${digits.slice(0, 4)}${digits.slice(5)}`);
        } else {
            candidates.add(`${digits.slice(0, 4)}9${digits.slice(4)}`);
        }
    }
}

function buildNumberSearchCandidates(rawSearch) {
    const digits = normalizeDigits(rawSearch);
    if (!digits) return [];

    const candidates = new Set();
    addNumberVariant(candidates, digits);

    if (!digits.startsWith('55')) {
        addNumberVariant(candidates, `55${digits}`);
    }

    return Array.from(candidates).filter((value) => value.length >= 4);
}

function mapLeadForResponse(lead) {
    const lastMessagePreview = lead.last_conversation_summary || '';

    return withLegacyStatus({
        ...lead,
        last_message_preview: lastMessagePreview,
        last_message: lastMessagePreview,
        last_message_at: lead.updated_at || lead.created_at || null
    });
}

async function fetchLeadsByName(companyId, searchTerm) {
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', companyId)
        .ilike('name', `%${searchTerm}%`)
        .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

async function fetchLeadsByNumber(companyId, searchCandidates) {
    if (!searchCandidates || searchCandidates.length === 0) {
        return [];
    }

    const filters = [];
    searchCandidates.forEach((digits) => {
        filters.push(`phone.ilike.%${digits}%`);
    });

    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', companyId)
        .or(filters.join(','))
        .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

module.exports = async (req, res) => {
    const rawSearch = req.query.search;
    const by = (req.query.by || 'auto').toString().trim().toLowerCase();

    if (!VALID_SEARCH_MODES.includes(by)) {
        return res.status(400).json({
            success: false,
            error: "Parametro 'by' invalido. Use: auto, name ou number."
        });
    }

    try {
        const companyId = req.auth.companyId;
        const search = typeof rawSearch === 'string' ? rawSearch.trim() : '';

        console.log(`[CRM] Buscando leads da empresa ${companyId} | by=${by} | search=${search || '[sem filtro]'}`);

        if (!search) {
            const { data: leads, error: fetchError } = await supabase
                .from('leads')
                .select('*')
                .eq('company_id', companyId)
                .order('updated_at', { ascending: false });

            if (fetchError) throw fetchError;

            const mapped = (leads || []).map(mapLeadForResponse);
            return res.status(200).json({
                success: true,
                count: mapped.length,
                leads: mapped
            });
        }

        if (by === 'name') {
            const leads = await fetchLeadsByName(companyId, search);
            const mapped = leads.map(mapLeadForResponse);
            return res.status(200).json({
                success: true,
                count: mapped.length,
                leads: mapped
            });
        }

        const searchCandidates = buildNumberSearchCandidates(search);

        if (by === 'number') {
            if (searchCandidates.length === 0) {
                return res.status(200).json({ success: true, count: 0, leads: [] });
            }

            const leads = await fetchLeadsByNumber(companyId, searchCandidates);
            const mapped = leads.map(mapLeadForResponse);
            return res.status(200).json({
                success: true,
                count: mapped.length,
                leads: mapped
            });
        }

        const [nameLeads, numberLeads] = await Promise.all([
            fetchLeadsByName(companyId, search),
            searchCandidates.length > 0 ? fetchLeadsByNumber(companyId, searchCandidates) : Promise.resolve([])
        ]);

        const uniqueLeadsById = new Map();
        [...nameLeads, ...numberLeads].forEach((lead) => {
            uniqueLeadsById.set(lead.id, lead);
        });

        const leads = Array.from(uniqueLeadsById.values()).sort((a, b) => {
            const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return dateB - dateA;
        });

        const mapped = leads.map(mapLeadForResponse);
        return res.status(200).json({
            success: true,
            count: mapped.length,
            leads: mapped
        });
    } catch (error) {
        console.error('Erro ao buscar leads:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
