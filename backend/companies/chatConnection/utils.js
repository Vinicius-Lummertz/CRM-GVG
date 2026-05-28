const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('../utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const VALID_CONNECTION_STATUSES = ['nao_configurado', 'pendente_meta', 'conectado', 'erro'];

function normalizeE164Phone(rawValue, fieldName = 'phone_number') {
    if (typeof rawValue !== 'string') {
        return { error: `O campo '${fieldName}' deve ser uma string valida.` };
    }

    const digits = rawValue.trim().replace(/^whatsapp:/i, '').replace(/\D/g, '');
    if (!digits || digits.length < 8 || digits.length > 15) {
        return { error: `O campo '${fieldName}' deve estar em formato internacional valido (E.164).` };
    }

    return { value: `+${digits}` };
}

async function fetchCompany(companyId) {
    if (!companyId || !isValidUuid(companyId)) {
        return { error: "Parametro 'companyId' deve ser um UUID valido." };
    }

    const { data, error } = await supabase
        .from('companies')
        .select('id, company_settings, commercial_phone')
        .eq('id', companyId)
        .maybeSingle();

    if (error) return { error: error.message };
    if (!data) return { error: 'Empresa nao encontrada.', status: 404 };

    return { company: data };
}

function extractConnection(company) {
    const settings = company.company_settings && typeof company.company_settings === 'object'
        ? company.company_settings
        : {};

    const connection = settings.chat_connection && typeof settings.chat_connection === 'object'
        ? settings.chat_connection
        : {
            status: 'nao_configurado',
            phone_number: company.commercial_phone || null
        };

    if (!VALID_CONNECTION_STATUSES.includes(connection.status)) {
        connection.status = 'nao_configurado';
    }

    return connection;
}

module.exports = {
    extractConnection,
    fetchCompany,
    isValidUuid,
    normalizeE164Phone,
    supabase,
    VALID_CONNECTION_STATUSES
};
