const { createClient } = require('@supabase/supabase-js');
const { buildConversationWindow } = require('../chat/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const VALID_SEARCH_MODES = ['auto', 'name', 'number'];

function normalizeDigits(value) {
    return value ? value.replace(/\D/g, '') : '';
}

function addNumberVariant(candidates, digits) {
    if (!digits) return;

    candidates.add(digits);

    // Compatibilidade entre formatos com e sem o '9' apos o DDD brasileiro.
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

    // Ajuda quem busca sem o codigo 55; a base e tratada como Brasil.
    if (!digits.startsWith('55')) {
        addNumberVariant(candidates, `55${digits}`);
    }

    return Array.from(candidates).filter((value) => value.length >= 4);
}

function withConversationWindow(leads) {
    const now = new Date();
    return (leads || []).map((lead) => ({
        ...lead,
        conversation_window: buildConversationWindow(lead, now)
    }));
}

async function fetchLeadsByName(searchTerm) {
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

async function fetchLeadsByNumber(searchCandidates) {
    if (!searchCandidates || searchCandidates.length === 0) {
        return [];
    }

    const filters = [];
    searchCandidates.forEach((digits) => {
        filters.push(`phone.ilike.%${digits}%`);
        filters.push(`external_key.ilike.%${digits}%`);
        filters.push(`wa_id.ilike.%${digits}%`);
    });

    const { data, error } = await supabase
        .from('leads')
        .select('*')
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
        console.log(`[CRM] Buscando leads | by=${by} | search=${rawSearch || '[sem filtro]'}`);

        const search = typeof rawSearch === 'string' ? rawSearch.trim() : '';

        if (!search) {
            const { data: leads, error: fetchError } = await supabase
                .from('leads')
                .select('*')
                .order('updated_at', { ascending: false });

            if (fetchError) throw fetchError;

            return res.status(200).json({
                success: true,
                count: leads ? leads.length : 0,
                leads: withConversationWindow(leads)
            });
        }

        if (by === 'name') {
            const leads = await fetchLeadsByName(search);

            return res.status(200).json({
                success: true,
                count: leads.length,
                leads: withConversationWindow(leads)
            });
        }

        const searchCandidates = buildNumberSearchCandidates(search);

        if (by === 'number') {
            if (searchCandidates.length === 0) {
                return res.status(200).json({ success: true, count: 0, leads: [] });
            }

            const leads = await fetchLeadsByNumber(searchCandidates);

            return res.status(200).json({
                success: true,
                count: leads.length,
                leads: withConversationWindow(leads)
            });
        }

        // by = auto
        const [nameLeads, numberLeads] = await Promise.all([
            fetchLeadsByName(search),
            searchCandidates.length > 0 ? fetchLeadsByNumber(searchCandidates) : Promise.resolve([])
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

        return res.status(200).json({
            success: true,
            count: leads.length,
            leads: withConversationWindow(leads)
        });
    } catch (error) {
        console.error("Erro ao buscar leads:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
