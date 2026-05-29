const { createClient } = require('@supabase/supabase-js');
const {
    VALID_MEMBER_ROLES,
    isValidUuid,
    parseOptionalString
} = require('../utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { companyId, memberId } = req.params;
    const actorUserId = parseOptionalString(req.body.user_id || req.query.user_id);
    const payload = {};

    if (!isValidUuid(companyId) || !isValidUuid(memberId)) {
        return res.status(400).json({ success: false, error: "Parametros 'companyId' e 'memberId' devem ser UUIDs validos." });
    }

    if (!actorUserId || !isValidUuid(actorUserId)) {
        return res.status(400).json({ success: false, error: "Informe 'user_id' valido para atualizar membros." });
    }

    if (req.body.role !== undefined) {
        const role = parseOptionalString(req.body.role);
        if (!VALID_MEMBER_ROLES.includes(role)) {
            return res.status(400).json({ success: false, error: `Role invalida. Use: ${VALID_MEMBER_ROLES.join(', ')}.` });
        }
        payload.role = role;
    }

    if (Object.keys(payload).length === 0) {
        return res.status(400).json({ success: false, error: "Informe ao menos um campo para atualizar." });
    }

    try {
        console.log(`[CRM] Atualizando membro ${memberId} da empresa ${companyId}`);

        const { data: actorMembership, error: actorMembershipError } = await supabase
            .from('company_members')
            .select('id, role')
            .eq('company_id', companyId)
            .eq('profile_id', actorUserId)
            .maybeSingle();

        if (actorMembershipError) throw actorMembershipError;
        if (!actorMembership) {
            return res.status(403).json({ success: false, error: "Usuario sem acesso a esta empresa." });
        }
        if (!['owner', 'admin'].includes(actorMembership.role)) {
            return res.status(403).json({ success: false, error: "Apenas owner/admin podem editar membros." });
        }

        const { data: member, error } = await supabase
            .from('company_members')
            .update(payload)
            .eq('id', memberId)
            .eq('company_id', companyId)
            .select('*, profile:profiles(id, full_name, phone, avatar_url)')
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
