const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_ACCOUNT_AUTH_TOKEN);

function hashOTP(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
}

function normalizePhone(value) {
    const digits = (value || '').toString().replace(/^whatsapp:/i, '').replace(/\D/g, '');
    return digits ? `+${digits}` : null;
}

module.exports = async (req, res) => {
    const phone = normalizePhone(req.body.phone);
    if (!phone) return res.status(400).json({ success: false, error: "O campo 'phone' e obrigatorio." });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60000);
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const { error: dbError } = await supabase.from('otp_challenges').insert([{
        id: crypto.randomUUID(),
        phone,
        code_hash: hashOTP(code),
        status: 'pending',
        attempts: 0,
        max_attempts: 5,
        expires_at: expiresAt.toISOString(),
        created_at: now.toISOString()
    }]);

    if (dbError) return res.status(500).json({ success: false, error: "Erro interno no banco de dados." });

    try {
        await client.messages.create({
            contentSid: process.env.TWILIO_CONTENT_SID,
            contentVariables: JSON.stringify({ "1": code }),
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: `whatsapp:${phone}`
        });

        return res.status(200).json({ success: true, message: "Codigo enviado com sucesso!" });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Falha ao enviar mensagem OTP." });
    }
};
