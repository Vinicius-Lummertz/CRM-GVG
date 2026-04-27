const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const {
    VALID_MEMBER_ROLES,
    isValidUuid,
    normalizePhone,
    parseOptionalString
} = require('../utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { companyId } = req.params;
    const invitedPhone = normalizePhone(req.body.invited_phone, 'invited_phone');
    const role = parseOptionalString(req.body.role) || 'agent';
    const invitedBy = parseOptionalString(req.body.invited_by);

    if (!isValidUuid(companyId)) {
        return res.status(400).json({ success: false, error: "Parametro 'companyId' deve ser um UUID valido." });
    }

    if (invitedPhone.error) return res.status(400).json({ success: false, error: invitedPhone.error });

    if (!VALID_MEMBER_ROLES.includes(role)) {
        return res.status(400).json({ success: false, error: `Role invalida. Use: ${VALID_MEMBER_ROLES.join(', ')}.` });
    }

    if (invitedBy && !isValidUuid(invitedBy)) {
        return res.status(400).json({ success: false, error: "O campo 'invited_by' deve ser um UUID valido." });
    }

    try {
        console.log(`[CRM] Criando convite para ${invitedPhone.value} na empresa ${companyId}`);

        const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('login_phone', invitedPhone.value)
            .maybeSingle();

        if (profileError) throw profileError;

        if (existingProfile) {
            const { data: member, error: memberError } = await supabase
                .from('company_members')
                .upsert([{
                    company_id: companyId,
                    user_id: existingProfile.id,
                    role,
                    status: 'active'
                }], { onConflict: 'company_id,user_id' })
                .select('*')
                .single();

            if (memberError) throw memberError;

            return res.status(201).json({
                success: true,
                acceptedImmediately: true,
                member,
                message: "Membro adicionado com sucesso!"
            });
        }

        const { data: invite, error: inviteError } = await supabase
            .from('company_member_invites')
            .insert([{
                id: crypto.randomUUID(),
                company_id: companyId,
                invited_phone: invitedPhone.value,
                role,
                invited_by: invitedBy,
                status: 'pending'
            }])
            .select('*')
            .single();

        if (inviteError) throw inviteError;

        return res.status(201).json({
            success: true,
            acceptedImmediately: false,
            invite,
            message: "Convite criado com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao criar convite:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
