const { createClient } = require('@supabase/supabase-js');
const { isValidUuid, normalizePhone, parseOptionalString } = require('../companies/utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function acceptPendingInvites(profile) {
    const { data: invites, error: invitesError } = await supabase
        .from('company_member_invites')
        .select('*')
        .eq('invited_phone', profile.login_phone)
        .eq('status', 'pending');

    if (invitesError) throw invitesError;

    for (const invite of invites || []) {
        const { error: memberError } = await supabase
            .from('company_members')
            .upsert([{
                company_id: invite.company_id,
                user_id: profile.id,
                role: invite.role || 'agent',
                status: 'active'
            }], { onConflict: 'company_id,user_id' });

        if (memberError) throw memberError;

        const { error: inviteUpdateError } = await supabase
            .from('company_member_invites')
            .update({ status: 'accepted' })
            .eq('id', invite.id);

        if (inviteUpdateError) throw inviteUpdateError;
    }
}

module.exports = async (req, res) => {
    const { id, full_name, avatar_url } = req.body;
    const loginPhone = normalizePhone(req.body.login_phone, 'login_phone');

    if (!id || !isValidUuid(id)) {
        return res.status(400).json({ success: false, error: "O campo 'id' deve ser um UUID valido." });
    }

    if (loginPhone.error) {
        return res.status(400).json({ success: false, error: loginPhone.error });
    }

    try {
        console.log(`[CRM] Salvando perfil: ${loginPhone.value}`);

        const { data: profile, error } = await supabase
            .from('profiles')
            .upsert([{
                id,
                full_name: parseOptionalString(full_name),
                login_phone: loginPhone.value,
                avatar_url: parseOptionalString(avatar_url)
            }], { onConflict: 'id' })
            .select('*')
            .single();

        if (error) throw error;

        await acceptPendingInvites(profile);

        return res.status(200).json({
            success: true,
            profile,
            message: "Perfil salvo com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao salvar perfil:", error);

        if (error.code === '23505') {
            return res.status(409).json({ success: false, error: "Este numero de acesso ja esta vinculado a outro perfil." });
        }

        return res.status(500).json({ success: false, error: error.message });
    }
};
