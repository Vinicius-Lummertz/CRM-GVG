const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function hashOTP(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
}

function normalizeLoginPhone(rawPhone) {
    const digits = rawPhone.toString().replace(/^whatsapp:/i, '').replace(/\D/g, '');
    return digits ? `+${digits}` : '';
}

async function findAuthUserByPhone(phone) {
    let page = 1;
    const perPage = 1000;

    while (page <= 10) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) throw error;

        const user = (data.users || []).find((item) => item.phone === phone);
        if (user) return user;

        if (!data.users || data.users.length < perPage) return null;
        page += 1;
    }

    return null;
}

async function ensureAuthUser(phone) {
    const existingUser = await findAuthUserByPhone(phone);
    if (existingUser) return existingUser;

    const { data, error } = await supabase.auth.admin.createUser({
        phone,
        phone_confirm: true,
        user_metadata: {
            login_phone: phone
        }
    });

    if (error && error.status === 422) {
        const user = await findAuthUserByPhone(phone);
        if (user) return user;
    }

    if (error) throw error;
    return data.user;
}

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

async function ensureProfile(phone) {
    const authUser = await ensureAuthUser(phone);

    const { data: profile, error } = await supabase
        .from('profiles')
        .upsert([{
            id: authUser.id,
            login_phone: phone,
            full_name: authUser.user_metadata && authUser.user_metadata.full_name ? authUser.user_metadata.full_name : null,
            avatar_url: authUser.user_metadata && authUser.user_metadata.avatar_url ? authUser.user_metadata.avatar_url : null
        }], { onConflict: 'id' })
        .select('*')
        .single();

    if (error) throw error;

    await acceptPendingInvites(profile);
    return profile;
}

async function fetchCompanies(profileId) {
    const { data: memberships, error } = await supabase
        .from('company_members')
        .select('id, role, status, joined_at, company:companies(*)')
        .eq('user_id', profileId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true });

    if (error) throw error;

    return (memberships || []).map((item) => ({
        ...item.company,
        membership_id: item.id,
        role: item.role,
        member_status: item.status,
        joined_at: item.joined_at
    }));
}

module.exports = async (req, res) => {
    const { phone, code } = req.body;

    if (!phone || !code) {
        return res.status(400).json({ success: false, error: "Os campos telefone/numero e codigo sao obrigatorios." });
    }

    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('whatsapp:')) {
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }
        formattedPhone = 'whatsapp:' + formattedPhone;
    }

    const { data: challenges, error: fetchError } = await supabase
        .from('otp_challenges')
        .select('*')
        .eq('phone', formattedPhone)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

    if (fetchError || !challenges || challenges.length === 0) {
        return res.status(404).json({ success: false, error: "Nao foi encontrado nenhum codigo para o numero inserido." });
    }

    const challenge = challenges[0];
    const now = new Date();
    const expiresAt = new Date(challenge.expires_at);

    if (now > expiresAt) {
        await supabase.from('otp_challenges').update({ status: 'expired', updated_at: now.toISOString() }).eq('id', challenge.id);
        return res.status(400).json({ success: false, error: "O codigo expirou. Solicite um novo." });
    }

    if (challenge.attempts >= challenge.max_attempts) {
        await supabase.from('otp_challenges').update({ status: 'failed', last_error: 'Max attempts reached', updated_at: now.toISOString() }).eq('id', challenge.id);
        return res.status(400).json({ success: false, error: "Numero maximo de tentativas excedido." });
    }

    const hashedPayloadCode = hashOTP(code.toString());
    const isMatch = (hashedPayloadCode === challenge.code_hash);

    if (!isMatch) {
        const newAttempts = challenge.attempts + 1;
        const updates = { attempts: newAttempts, updated_at: now.toISOString() };

        if (newAttempts >= challenge.max_attempts) {
            updates.status = 'failed';
            updates.last_error = 'Max attempts reached';
        }

        await supabase.from('otp_challenges').update(updates).eq('id', challenge.id);

        return res.status(400).json({
            success: false,
            error: "Codigo incorreto.",
            attempts_left: challenge.max_attempts - newAttempts
        });
    }

    await supabase.from('otp_challenges').update({
        status: 'verified',
        updated_at: now.toISOString()
    }).eq('id', challenge.id);

    try {
        const loginPhone = normalizeLoginPhone(phone);
        const profile = await ensureProfile(loginPhone);
        const companies = await fetchCompanies(profile.id);

        return res.status(200).json({
            success: true,
            message: "Numero verificado com sucesso!",
            profile,
            companies
        });
    } catch (error) {
        console.error("Erro ao preparar perfil apos OTP:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
