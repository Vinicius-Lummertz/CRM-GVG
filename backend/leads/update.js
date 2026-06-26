const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

// Campos que o usuario pode editar pelo painel de detalhes do lead.
// status tem rota propria (updateStatus) e phone/company_id/created_at nao sao editaveis aqui.
const TEXT_FIELDS = [
    'name',
    'email',
    'document',
    'zip_code',
    'street',
    'address_number',
    'complement',
    'neighborhood',
    'city',
    'state'
];

const VALID_DOCUMENT_TYPES = ['cpf', 'cnpj'];

function normalizeText(value) {
    if (value === null || value === undefined) return null;
    const trimmed = value.toString().trim();
    return trimmed === '' ? null : trimmed;
}

function buildUpdatePayload(body) {
    const payload = {};

    TEXT_FIELDS.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            payload[field] = normalizeText(body[field]);
        }
    });

    if (Object.prototype.hasOwnProperty.call(body, 'document_type')) {
        const raw = normalizeText(body.document_type);
        if (raw === null) {
            payload.document_type = null;
        } else {
            const normalized = raw.toLowerCase();
            if (!VALID_DOCUMENT_TYPES.includes(normalized)) {
                return { error: `document_type invalido. Use: ${VALID_DOCUMENT_TYPES.join(', ')}.` };
            }
            payload.document_type = normalized;
        }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'birthday')) {
        const raw = normalizeText(body.birthday);
        if (raw === null) {
            payload.birthday = null;
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return { error: "birthday invalido. Use o formato AAAA-MM-DD." };
        } else {
            payload.birthday = raw;
        }
    }

    return { payload };
}

module.exports = async (req, res) => {
    const { leadId } = req.params;
    const body = req.body || {};
    const companyId = body.company_id;

    if (!leadId || !isValidUuid(leadId)) {
        return res.status(400).json({ success: false, error: "Parametro 'leadId' invalido." });
    }

    if (!companyId || !isValidUuid(companyId)) {
        return res.status(400).json({ success: false, error: "O campo 'company_id' deve ser um UUID valido." });
    }

    const { payload, error: validationError } = buildUpdatePayload(body);
    if (validationError) {
        return res.status(400).json({ success: false, error: validationError });
    }

    if (Object.keys(payload).length === 0) {
        return res.status(400).json({ success: false, error: "Nenhum campo valido para atualizar." });
    }

    payload.updated_at = new Date().toISOString();

    try {
        const { data, error } = await supabase
            .from('leads')
            .update(payload)
            .eq('id', leadId)
            .eq('company_id', companyId)
            .select('*')
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ success: false, error: 'Lead nao encontrado.' });
        }

        return res.status(200).json({ success: true, lead: data });
    } catch (error) {
        console.error('Erro ao atualizar lead:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
