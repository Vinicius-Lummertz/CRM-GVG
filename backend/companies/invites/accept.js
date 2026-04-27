const { createClient } = require('@supabase/supabase-js');
const { isValidUuid } = require('../utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

module.exports = async (req, res) => {
    const { inviteId } = req.params;
    const { user_id } = req.body;

    if (!isValidUuid(inviteId)) {
        return res.status(400).json({ success: false, error: "Parametro 'inviteId' deve ser um UUID valido." });
    }

    if (!user_id || !isValidUuid(user_id)) {
        return res.status(400).json({ success: false, error: "O campo 'user_id' deve ser um UUID valido." });
    }

    try {
        console.log(`[CRM] Aceitando convite ${inviteId}`);

        const { data: invite, error: inviteError } = await supabase
            .from('company_member_invites')
            .select('*')
            .eq('id', inviteId)
            .eq('status', 'pending')
            .single();

        if (inviteError) {
            if (inviteError.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: "Convite pendente nao encontrado." });
            }
            throw inviteError;
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, login_phone')
            .eq('id', user_id)
            .single();

        if (profileError) throw profileError;

        if (profile.login_phone !== invite.invited_phone) {
            return res.status(403).json({ success: false, error: "Este convite pertence a outro numero de acesso." });
        }

        const { data: member, error: memberError } = await supabase
            .from('company_members')
            .upsert([{
                company_id: invite.company_id,
                user_id,
                role: invite.role || 'agent',
                status: 'active'
            }], { onConflict: 'company_id,user_id' })
            .select('*')
            .single();

        if (memberError) throw memberError;

        const { error: updateInviteError } = await supabase
            .from('company_member_invites')
            .update({ status: 'accepted' })
            .eq('id', inviteId);

        if (updateInviteError) throw updateInviteError;

        return res.status(200).json({
            success: true,
            member,
            message: "Convite aceito com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao aceitar convite:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
