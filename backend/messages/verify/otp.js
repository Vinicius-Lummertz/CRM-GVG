const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const {
    createSession,
    ensureDefaultCompanyForProfile,
    findOrCreateProfileByPhone,
    listCompaniesForProfile,
    normalizePhone
} = require('../../auth/session');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function hashValue(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

module.exports = async (req, res) => {
    const { phone, code } = req.body || {};

    if (!phone || !code) {
        return res.status(400).json({
            success: false,
            error: "Os campos 'phone' e 'code' sao obrigatorios."
        });
    }

    const normalizedPhone = normalizePhone(phone);
    const cleanCode = code.toString().trim();

    if (!normalizedPhone) {
        return res.status(400).json({
            success: false,
            error: 'Telefone invalido. Informe um numero com DDD e codigo do pais.'
        });
    }

    if (!/^\d{6}$/.test(cleanCode)) {
        return res.status(400).json({
            success: false,
            error: 'Codigo invalido. Informe os 6 digitos recebidos.'
        });
    }

    try {
        const { data: challenges, error: fetchError } = await supabase
            .from('otp_challenges')
            .select('*')
            .eq('phone', normalizedPhone)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);

        if (fetchError) throw fetchError;

        if (!challenges || challenges.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Nao foi encontrado nenhum codigo pendente para este numero.'
            });
        }

        const challenge = challenges[0];
        const now = new Date();
        const expiresAt = new Date(challenge.expires_at);

        if (Number.isNaN(expiresAt.getTime()) || now > expiresAt) {
            await supabase
                .from('otp_challenges')
                .update({ status: 'expired' })
                .eq('id', challenge.id);

            return res.status(400).json({
                success: false,
                error: 'O codigo expirou. Solicite um novo.'
            });
        }

        if (Number(challenge.attempts || 0) >= Number(challenge.max_attempts || 0)) {
            await supabase
                .from('otp_challenges')
                .update({ status: 'expired' })
                .eq('id', challenge.id);

            return res.status(400).json({
                success: false,
                error: 'Numero maximo de tentativas excedido.'
            });
        }

        if (hashValue(cleanCode) !== challenge.code_hash) {
            const attempts = Number(challenge.attempts || 0) + 1;
            const shouldExpire = attempts >= Number(challenge.max_attempts || 0);

            await supabase
                .from('otp_challenges')
                .update({
                    attempts,
                    status: shouldExpire ? 'expired' : 'pending'
                })
                .eq('id', challenge.id);

            return res.status(400).json({
                success: false,
                error: 'Codigo incorreto.',
                attempts_left: Math.max(0, Number(challenge.max_attempts || 0) - attempts)
            });
        }

        const profile = await findOrCreateProfileByPhone(normalizedPhone, now);
        const membership = await ensureDefaultCompanyForProfile(profile, now);
        const session = await createSession(profile.id, now);

        await supabase
            .from('otp_challenges')
            .update({ status: 'verified' })
            .eq('id', challenge.id);

        const companies = await listCompaniesForProfile(profile.id);

        return res.status(200).json({
            success: true,
            token: session.accessToken,
            refreshToken: session.refreshToken,
            expiresAt: session.expiresAt,
            operator: {
                id: profile.id,
                phone: profile.phone,
                name: profile.full_name || null,
                role: membership.role
            },
            profile: {
                id: profile.id,
                phone: profile.phone,
                full_name: profile.full_name || null
            },
            selectedCompanyId: membership.company_id,
            companies,
            message: 'Numero verificado com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao verificar OTP:', error);
        return res.status(500).json({
            success: false,
            error: 'Nao foi possivel validar o codigo agora. Tente novamente.'
        });
    }
};
