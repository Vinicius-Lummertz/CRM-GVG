const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Inicializa a conexão com DB
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function hashOTP(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
}

module.exports = async (req, res) => {
    const { phone, code } = req.body;

    if (!phone || !code) {
        return res.status(400).json({ success: false, error: "Os campos telefone/numero e código são obrigatórios." });
    }

    // Formata o número recebido 
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('whatsapp:')) {
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }
        formattedPhone = 'whatsapp:' + formattedPhone;
    }

    // 1. Buscar desafio pendente mais recente
    const { data: challenges, error: fetchError } = await supabase
        .from('otp_challenges')
        .select('*')
        .eq('phone', formattedPhone)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

    if (fetchError || !challenges || challenges.length === 0) {
        return res.status(404).json({ success: false, error: "Não foi encontrado nenhum código para o número inserido." });
    }

    const challenge = challenges[0];
    const now = new Date();
    const expiresAt = new Date(challenge.expires_at);

    // 2. Verificar expiração (15 mins)
    if (now > expiresAt) {
        await supabase.from('otp_challenges').update({ status: 'expired', updated_at: now.toISOString() }).eq('id', challenge.id);
        return res.status(400).json({ success: false, error: "O código expirou. Solicite um novo." });
    }

    // 3. Verificar limite de tentativas
    if (challenge.attempts >= challenge.max_attempts) {
        await supabase.from('otp_challenges').update({ status: 'failed', last_error: 'Max attempts reached', updated_at: now.toISOString() }).eq('id', challenge.id);
        return res.status(400).json({ success: false, error: "Número máximo de tentativas excedido." });
    }

    // 4. Checagem do Hash do código
    const hashedPayloadCode = hashOTP(code.toString());
    const isMatch = (hashedPayloadCode === challenge.code_hash);

    if (!isMatch) {
        // Falhou. Incrementa a tentativa
        const newAttempts = challenge.attempts + 1;
        const updates = { attempts: newAttempts, updated_at: now.toISOString() };

        if (newAttempts >= challenge.max_attempts) {
            updates.status = 'failed';
            updates.last_error = 'Max attempts reached';
        }

        await supabase.from('otp_challenges').update(updates).eq('id', challenge.id);

        return res.status(400).json({
            success: false,
            error: "Código incorreto.",
            attempts_left: challenge.max_attempts - newAttempts
        });
    }

    // 5. Sucesso! Código bateu.
    await supabase.from('otp_challenges').update({
        status: 'verified',
        updated_at: now.toISOString()
    }).eq('id', challenge.id);

    return res.status(200).json({ success: true, message: "Número verificado com sucesso!" });
};
