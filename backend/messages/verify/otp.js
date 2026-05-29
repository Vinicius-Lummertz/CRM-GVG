const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function hashOTP(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
}

function normalizePhone(value) {
    const digits = (value || '').toString().replace(/^whatsapp:/i, '').replace(/\D/g, '');
    return digits ? `+${digits}` : null;
}

module.exports = async (req, res) => {
    const phone = normalizePhone(req.body.phone);
    const { code } = req.body;

    if (!phone || !code) {
        return res.status(400).json({ success: false, error: "Os campos 'phone' e 'code' sao obrigatorios." });
    }

    const { data: challenge, error } = await supabase
        .from('otp_challenges')
        .select('*')
        .eq('phone', phone)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) return res.status(500).json({ success: false, error: error.message });
    if (!challenge) return res.status(404).json({ success: false, error: "Nenhum desafio pendente encontrado." });

    if (new Date() > new Date(challenge.expires_at)) {
        await supabase.from('otp_challenges').update({ status: 'expired' }).eq('id', challenge.id);
        return res.status(400).json({ success: false, error: "Codigo expirado." });
    }

    if (challenge.attempts >= challenge.max_attempts) {
        await supabase.from('otp_challenges').update({ status: 'failed' }).eq('id', challenge.id);
        return res.status(400).json({ success: false, error: "Numero maximo de tentativas excedido." });
    }

    if (hashOTP(String(code)) !== challenge.code_hash) {
        const attempts = challenge.attempts + 1;
        await supabase
            .from('otp_challenges')
            .update({ attempts, status: attempts >= challenge.max_attempts ? 'failed' : 'pending' })
            .eq('id', challenge.id);

        return res.status(400).json({ success: false, error: "Codigo incorreto.", attempts_left: challenge.max_attempts - attempts });
    }

    await supabase.from('otp_challenges').update({ status: 'verified' }).eq('id', challenge.id);

    let profile = null;

    const { data: existingProfile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

    if (profileFetchError) {
        return res.status(500).json({ success: false, error: profileFetchError.message });
    }

    if (existingProfile) {
        profile = existingProfile;
    } else {
        const { data: createdProfile, error: profileCreateError } = await supabase
            .from('profiles')
            .insert([{
                id: crypto.randomUUID(),
                phone
            }])
            .select('*')
            .single();

        if (profileCreateError) {
            return res.status(500).json({ success: false, error: profileCreateError.message });
        }

        profile = createdProfile;
    }

    const { data: memberships, error: membershipsError } = await supabase
        .from('company_members')
        .select('id, role, joined_at, company:companies(*)')
        .eq('profile_id', profile.id)
        .order('joined_at', { ascending: true });

    if (membershipsError) {
        return res.status(500).json({ success: false, error: membershipsError.message });
    }

    const companies = (memberships || []).map((item) => ({
        ...(item.company || {}),
        membership_id: item.id,
        role: item.role,
        joined_at: item.joined_at
    }));

    return res.status(200).json({
        success: true,
        message: "Numero verificado com sucesso!",
        profile,
        companies
    });
};
