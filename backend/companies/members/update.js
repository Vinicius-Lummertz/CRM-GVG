const { createClient } = require('@supabase/supabase-js');
const {
    VALID_MEMBER_ROLES,
    VALID_MEMBER_STATUSES,
    isValidUuid,
    parseOptionalString
} = require('../utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { companyId, memberId } = req.params;
    const payload = {};

    if (!isValidUuid(companyId) || !isValidUuid(memberId)) {
        return res.status(400).json({ success: false, error: "Parametros 'companyId' e 'memberId' devem ser UUIDs validos." });
    }

    if (req.body.role !== undefined) {
        const role = parseOptionalString(req.body.role);
        if (!VALID_MEMBER_ROLES.includes(role)) {
            return res.status(400).json({ success: false, error: `Role invalida. Use: ${VALID_MEMBER_ROLES.join(', ')}.` });
        }
        payload.role = role;
    }

    if (req.body.status !== undefined) {
        const status = parseOptionalString(req.body.status);
        if (!VALID_MEMBER_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, error: `Status invalido. Use: ${VALID_MEMBER_STATUSES.join(', ')}.` });
        }
        payload.status = status;
    }

    if (Object.keys(payload).length === 0) {
        return res.status(400).json({ success: false, error: "Informe ao menos um campo para atualizar." });
    }

    try {
        console.log(`[CRM] Atualizando membro ${memberId} da empresa ${companyId}`);

        const { data: member, error } = await supabase
            .from('company_members')
            .update(payload)
            .eq('id', memberId)
            .eq('company_id', companyId)
            .select('*, profile:profiles(id, full_name, login_phone, avatar_url)')
            .maybeSingle();

        if (error) throw error;

        if (!member) {
            return res.status(404).json({ success: false, error: "Membro nao encontrado." });
        }

        return res.status(200).json({
            success: true,
            member,
            message: "Membro atualizado com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao atualizar membro:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
