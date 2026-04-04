const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_ACCOUNT_AUTH_TOKEN);

function hashOTP(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
}

module.exports = async (req, res) => {
    // 1. Recebe os dados do Front-end
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ success: false, error: "O campo 'phone' é obrigatório." });
    }

    // 2. Padroniza o número para o formato do Twilio (whatsapp:+55...)
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('whatsapp:')) {
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }
        formattedPhone = 'whatsapp:' + formattedPhone;
    }

    // 3. Verifica se já existe um código ativo/recém-enviado para evitar spam
    const now = new Date();
    const { data: existingChallenges } = await supabase
        .from('otp_challenges')
        .select('*')
        .eq('phone', formattedPhone)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

    if (existingChallenges && existingChallenges.length > 0) {
        const lastChallenge = existingChallenges[0];
        const lastExpiresAt = new Date(lastChallenge.expires_at);

        if (lastExpiresAt > now) {
            // Ainda tem um código válido rodando
            return res.status(429).json({
                success: false,
                error: "Já existe um código ativo para este número. Por favor, aguarde alguns minutos antes de solicitar um novo."
            });
        } else {
            // Expirou mas ainda tava como 'pending', vamos limpar
            await supabase.from('otp_challenges').update({ status: 'expired', updated_at: now.toISOString() }).eq('id', lastChallenge.id);
        }
    }

    // 4. Gera código e Hasheia
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = hashOTP(codigo);

    // Usa a variável 'now' já declarada no passo 3
    const expiresAt = new Date(now.getTime() + 15 * 60000); // +15 mins
    const challengeId = crypto.randomUUID();

    // 4. Salva no Supabase (status: pending)
    const { error: dbError } = await supabase
        .from('otp_challenges')
        .insert([{
            id: challengeId,
            phone: formattedPhone,
            channel: 'whatsapp',
            code_hash: hashedCode,
            status: 'pending',
            attempts: 0,
            max_attempts: 5,
            expires_at: expiresAt.toISOString(),
            created_at: now.toISOString(),
            updated_at: now.toISOString()
        }]);

    if (dbError) {
        console.error("Erro ao salvar no banco:", dbError);
        return res.status(500).json({ success: false, error: "Erro interno no banco de dados." });
    }

    // 5. Dispara mensagem via SDK Twilio
    try {
        console.log(`Enviando OTP via Twilio para ${formattedPhone}...`);

        const message = await client.messages.create({
            contentSid: process.env.TWILIO_CONTENT_SID,
            contentVariables: JSON.stringify({ "1": codigo }),
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: formattedPhone
        });

        // 6. Atualiza o banco com o message_id de rastreio
        await supabase
            .from('otp_challenges')
            .update({ provider_message_id: message.sid, updated_at: new Date().toISOString() })
            .eq('id', challengeId);

        console.log(`Mensagem enviada! SID: ${message.sid}`);
        return res.status(200).json({
            success: true,
            challengeId: challengeId,
            message: "Código enviado e registrado no banco de dados!"
        });
    } catch (error) {
        console.error("Erro no Twilio:", error);

        // Em caso de falha no envio, invalidar o desafío
        await supabase
            .from('otp_challenges')
            .update({ status: 'failed', last_error: error.message, updated_at: new Date().toISOString() })
            .eq('id', challengeId);

        return res.status(500).json({ success: false, error: "Falha ao enviar mensagem OTP." });
    }
};
