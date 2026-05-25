const LEGACY_TO_DB_STATUS = {
    lead: 'possivel_cliente',
    contacted: 'contato_iniciado',
    negotiating: 'em_negociacao',
    proposal_sent: 'proposta_enviada',
    converted: 'orcamento_fechado',
    not_converted: 'contato_iniciado'
};

const DB_TO_LEGACY_STATUS = {
    possivel_cliente: 'lead',
    contato_iniciado: 'contacted',
    em_negociacao: 'negotiating',
    proposta_enviada: 'proposal_sent',
    orcamento_fechado: 'converted'
};

const DB_STATUS_VALUES = new Set(Object.keys(DB_TO_LEGACY_STATUS));
const LEGACY_STATUS_VALUES = new Set(Object.keys(LEGACY_TO_DB_STATUS));

function toDbLeadStatus(value) {
    if (!value || typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (DB_STATUS_VALUES.has(normalized)) return normalized;
    return LEGACY_TO_DB_STATUS[normalized] || null;
}

function toLegacyLeadStatus(value) {
    if (!value || typeof value !== 'string') return 'lead';
    return DB_TO_LEGACY_STATUS[value] || value;
}

function withLegacyStatus(lead) {
    if (!lead) return lead;
    return {
        ...lead,
        status: toLegacyLeadStatus(lead.status)
    };
}

module.exports = {
    LEGACY_STATUS_VALUES,
    toDbLeadStatus,
    toLegacyLeadStatus,
    withLegacyStatus
};
