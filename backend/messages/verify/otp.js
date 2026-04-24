const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function hashValue(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeWhatsAppPhone(rawPhone) {
    if (typeof rawPhone !== 'string') return null;

    const cleaned = rawPhone.trim().replace(/^whatsapp:/i, '');
    const digits = cleaned.replace(/\D/g, '');
    if (!digits) return null;

    return `whatsapp:+${digits}`;
}

async function findOrCreateOperator(phone, now) {
    const { data: existingOperators, error: fetchError } = await supabase
        .from('operators')
        .select('*')
        .eq('phone', phone)
        .limit(1);

    if (fetchError) throw fetchError;
    if (existingOperators && existingOperators.length > 0) return existingOperators[0];

    const operator = {
        id: crypto.randomUUID(),
        phone,
        name: null,
        role: 'operator',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
    };

    const { error: insertError } = await supabase
        .from('operators')
        .insert([operator]);

    if (insertError) throw insertError;
    return operator;
}

async function createSession(operatorId, now) {
    const accessToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const accessExpiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { error } = await supabase
        .from('auth_sessions')
        .insert([{
            id: crypto.randomUUID(),
            operator_id: operatorId,
            access_token_hash: hashValue(accessToken),
            refresh_token_hash: hashValue(refreshToken),
            access_expires_at: accessExpiresAt.toISOString(),
            refresh_expires_at: refreshExpiresAt.toISOString(),
            created_at: now.toISOString(),
            updated_at: now.toISOString()
        }]);

    if (error) throw error;

    return {
        accessToken,
        refreshToken,
        accessExpiresAt: accessExpiresAt.toISOString(),
        refreshExpiresAt: refreshExpiresAt.toISOString()
    };
}

module.exports = async (req, res) => {
    const { phone, code } = req.body || {};

    if (!phone || !code) {
        return res.status(400).json({
            success: false,
            error: "Os campos 'phone' e 'code' sao obrigatorios."
        });
    }

    const formattedPhone = normalizeWhatsAppPhone(phone);
    const cleanCode = code.toString().trim();

    if (!formattedPhone) {
        return res.status(400).json({
            success: false,
            error: "Telefone invalido. Informe um numero com DDD."
        });
    }

    if (!/^\d{6}$/.test(cleanCode)) {
        return res.status(400).json({
            success: false,
            error: "Codigo invalido. Informe os 6 digitos recebidos."
        });
    }

    const { data: challenges, error: fetchError } = await supabase
        .from('otp_challenges')
        .select('*')
        .eq('phone', formattedPhone)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

    if (fetchError) {
        console.error("Erro ao buscar desafio OTP:", fetchError);
        return res.status(500).json({ success: false, error: "Erro interno ao validar codigo." });
    }

    if (!challenges || challenges.length === 0) {
        return res.status(404).json({
            success: false,
            error: "Nao foi encontrado nenhum codigo pendente para este numero."
        });
    }

    const challenge = challenges[0];
    const now = new Date();
    const expiresAt = new Date(challenge.expires_at);

    if (now > expiresAt) {
        await supabase
            .from('otp_challenges')
            .update({ status: 'expired', updated_at: now.toISOString() })
            .eq('id', challenge.id);

        return res.status(400).json({
            success: false,
            error: "O codigo expirou. Solicite um novo."
        });
    }

    if (challenge.attempts >= challenge.max_attempts) {
        await supabase
            .from('otp_challenges')
            .update({ status: 'failed', last_error: 'Max attempts reached', updated_at: now.toISOString() })
            .eq('id', challenge.id);

        return res.status(400).json({
            success: false,
            error: "Numero maximo de tentativas excedido."
        });
    }

    if (hashValue(cleanCode) !== challenge.code_hash) {
        const newAttempts = Number(challenge.attempts || 0) + 1;
        const updates = { attempts: newAttempts, updated_at: now.toISOString() };

        if (newAttempts >= challenge.max_attempts) {
            updates.status = 'failed';
            updates.last_error = 'Max attempts reached';
        }

        await supabase
            .from('otp_challenges')
            .update(updates)
            .eq('id', challenge.id);

        return res.status(400).json({
            success: false,
            error: "Codigo incorreto.",
            attempts_left: Math.max(0, Number(challenge.max_attempts || 0) - newAttempts)
        });
    }

    try {
        const operator = await findOrCreateOperator(formattedPhone, now);
        const session = await createSession(operator.id, now);

        await supabase
            .from('otp_challenges')
            .update({ status: 'verified', updated_at: now.toISOString() })
            .eq('id', challenge.id);

        return res.status(200).json({
            success: true,
            token: session.accessToken,
            refreshToken: session.refreshToken,
            expiresAt: session.accessExpiresAt,
            operator: {
                id: operator.id,
                phone: operator.phone,
                name: operator.name,
                role: operator.role
            },
            message: "Numero verificado com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao criar sessao apos OTP:", error);
        return res.status(500).json({
            success: false,
            error: "Codigo validado, mas nao foi possivel criar a sessao. Tente novamente."
        });
    }
};
