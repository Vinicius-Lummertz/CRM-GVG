const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_ACCOUNT_AUTH_TOKEN);

module.exports = async (req, res) => {
    // 1. Recebe os dados do Front-end (CRM)
    const { phone, text, lead_id } = req.body;

    if (!phone || !text || !lead_id) {
        return res.status(400).json({
            success: false,
            error: "Os campos 'phone', 'text' e 'lead_id' são obrigatórios."
        });
    }

    // 2. Padroniza o número para o envio no Twilio
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('whatsapp:')) {
        if (!formattedPhone.startsWith('+')) formattedPhone = '+' + formattedPhone;
        formattedPhone = 'whatsapp:' + formattedPhone;
    }

    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
        console.log(`[CRM] Enviando mensagem de texto livre para ${formattedPhone}...`);

        // 3. Envia o texto via Twilio (Usando body, pois é sessão de 24h)
        const message = await client.messages.create({
            body: text,
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: formattedPhone
        });

        // 4. Salva o registro na tabela de 'messages' do CRM
        const { error: dbError } = await supabase
            .from('messages')
            .insert([{
                id: messageId,
                lead_id: lead_id,
                message_sid: message.sid,
                provider_message_id: message.sid,
                direction: 'outbound',
                body: text,
                preview: text.substring(0, 50),
                message_type: 'text',
                sent_by_customer: 0, // 0 pois foi enviado por um atendente/CRM
                delivery_status: 'sent',
                created_at: now
            }]);

        if (dbError) {
            console.error("Erro ao salvar mensagem no DB interno:", dbError);
            // Aviso: foi enviado no whatsapp mas falhou no CRM
            return res.status(500).json({
                success: false,
                error: "Mensagem enviada no WhatsApp, mas falhou ao gravar no banco do CRM.",
                details: dbError
            });
        }

        console.log(`Mensagem de chat salva e enviada! Local ID: ${messageId} | Twilio SID: ${message.sid}`);
        return res.status(200).json({
            success: true,
            chatMessageId: messageId,
            message: "Mensagem enviada com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao enviar mensagem livre via Twilio:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
