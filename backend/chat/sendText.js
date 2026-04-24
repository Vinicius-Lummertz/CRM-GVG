const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const {
    buildConversationWindow,
    getPreview,
    mapTwilioChatError,
    normalizeText,
    resolveLeadPhone
} = require('./utils');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_ACCOUNT_AUTH_TOKEN);

module.exports = async (req, res) => {
    const { phone, text, lead_id } = req.body || {};

    if (!lead_id || !text) {
        return res.status(400).json({
            success: false,
            error: "Os campos 'lead_id' e 'text' sao obrigatorios."
        });
    }

    const normalizedText = normalizeText(text);
    if (!normalizedText.valid) {
        return res.status(400).json({ success: false, error: normalizedText.error });
    }

    try {
        const { data: leads, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', lead_id)
            .limit(1);

        if (leadError) throw leadError;
        if (!leads || leads.length === 0) {
            return res.status(404).json({ success: false, error: "Lead nao encontrado." });
        }

        const lead = leads[0];
        const windowInfo = buildConversationWindow(lead);
        if (!windowInfo.is_open) {
            return res.status(400).json({
                success: false,
                error: "WINDOW_CLOSED",
                message: "Janela de 24h fechada. Use um template aprovado para iniciar ou retomar a conversa.",
                conversation_window: windowInfo,
                fallbackEndpoint: "/api/v2/chat/send-template",
                templatesEndpoint: "/api/v2/templates"
            });
        }

        const normalizedPhone = resolveLeadPhone(lead, phone);
        if (!normalizedPhone.valid) {
            return res.status(400).json({ success: false, error: normalizedPhone.error });
        }

        const messageId = crypto.randomUUID();
        const now = new Date().toISOString();

        console.log(`[CRM] Enviando mensagem livre para lead ${lead_id} (${normalizedPhone.whatsapp})`);

        const twilioPayload = {
            body: normalizedText.text,
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: normalizedPhone.whatsapp
        };

        if (process.env.TWILIO_STATUS_CALLBACK_URL) {
            twilioPayload.statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL;
        }

        const message = await client.messages.create(twilioPayload);

        const { error: insertError } = await supabase
            .from('messages')
            .insert([{
                id: messageId,
                lead_id,
                message_sid: message.sid,
                provider_message_id: message.sid,
                direction: 'outbound',
                body: normalizedText.text,
                preview: getPreview(normalizedText.text),
                message_type: 'text',
                sent_by_customer: 0,
                delivery_status: 'sent',
                created_at: now
            }]);

        if (insertError) {
            console.error("Erro ao salvar mensagem livre no banco:", insertError);
            return res.status(500).json({
                success: false,
                error: "Mensagem enviada no WhatsApp, mas falhou ao gravar no banco do CRM.",
                details: insertError
            });
        }

        const { error: updateError } = await supabase
            .from('leads')
            .update({
                last_message: normalizedText.text,
                last_message_preview: getPreview(normalizedText.text),
                last_message_at: now,
                updated_at: now,
                message_count_total: Number(lead.message_count_total || 0) + 1
            })
            .eq('id', lead_id);

        if (updateError) {
            console.error("Erro ao atualizar lead apos envio livre:", updateError);
        }

        return res.status(200).json({
            success: true,
            chatMessageId: messageId,
            providerMessageId: message.sid,
            conversation_window: windowInfo,
            message: "Mensagem enviada com sucesso!"
        });
    } catch (error) {
        console.error("Erro ao enviar mensagem livre via Twilio:", error);
        const mappedError = mapTwilioChatError(error);
        return res.status(mappedError.status).json(mappedError.body);
    }
};
