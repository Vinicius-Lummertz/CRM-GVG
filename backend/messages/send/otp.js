const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { normalizePhone } = require('../../auth/session');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_ACCOUNT_AUTH_TOKEN);

function hashOTP(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
}

module.exports = async (req, res) => {
    const { phone } = req.body || {};
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
        return res.status(400).json({
            success: false,
            error: "O campo 'phone' esta invalido. Informe no padrao internacional, por exemplo +5511999999999."
        });
    }

    const twilioPhone = `whatsapp:${normalizedPhone}`;
    const now = new Date();

    try {
        const { data: existingChallenges, error: existingError } = await supabase
            .from('otp_challenges')
            .select('id, expires_at')
            .eq('phone', normalizedPhone)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);

        if (existingError) throw existingError;

        if (existingChallenges && existingChallenges.length > 0) {
            const activeChallenge = existingChallenges[0];
            const expiresAt = new Date(activeChallenge.expires_at);

            if (!Number.isNaN(expiresAt.getTime()) && expiresAt > now) {
                return res.status(429).json({
                    success: false,
                    error: 'Ja existe um codigo ativo para este numero. Aguarde expirar para solicitar outro.'
                });
            }

            await supabase
                .from('otp_challenges')
                .update({ status: 'expired' })
                .eq('id', activeChallenge.id);
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = hashOTP(otpCode);
        const challengeId = crypto.randomUUID();
        const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

        const { error: insertError } = await supabase
            .from('otp_challenges')
            .insert([{
                id: challengeId,
                phone: normalizedPhone,
                code_hash: codeHash,
                status: 'pending',
                attempts: 0,
                max_attempts: 5,
                expires_at: expiresAt.toISOString(),
                created_at: now.toISOString()
            }]);

        if (insertError) throw insertError;

        await client.messages.create({
            contentSid: process.env.TWILIO_CONTENT_SID,
            contentVariables: JSON.stringify({ 1: otpCode }),
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: twilioPhone
        });

        return res.status(200).json({
            success: true,
            challengeId,
            message: 'Codigo enviado com sucesso.'
        });
    } catch (error) {
        console.error('Erro ao enviar OTP:', error);
        return res.status(500).json({
            success: false,
            error: 'Nao foi possivel enviar o codigo de verificacao.'
        });
    }
};
